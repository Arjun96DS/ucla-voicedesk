const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Simulated payroll data — in production this hits Workday Payroll API
function generatePayStubs(userId) {
  const base = 6250; // monthly gross ~$75k/yr
  const months = ['Apr', 'Mar', 'Feb', 'Jan', 'Dec', 'Nov'];
  const year = [2026, 2026, 2026, 2026, 2025, 2025];
  return months.map((month, i) => ({
    id: `PAY-${year[i]}-${String(i + 1).padStart(3, '0')}`,
    period: `${month} 1–15, ${year[i]}`,
    payDate: new Date(year[i], 11 - i, 15).toISOString(),
    grossPay: base + (Math.random() * 200 - 100),
    federalTax: base * 0.22,
    stateTax: base * 0.093,
    socialSecurity: base * 0.062,
    medicare: base * 0.0145,
    healthInsurance: 180,
    retirement403b: base * 0.05,
    netPay: base - (base * 0.22) - (base * 0.093) - (base * 0.062) - (base * 0.0145) - 180 - (base * 0.05),
    ytdGross: base * (i + 1) * 2,
    status: 'paid',
  }));
}

function generateTimesheet(userId) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  return days.map((day, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const isPast = date <= today;
    return {
      day,
      date: date.toISOString().split('T')[0],
      hoursScheduled: 8,
      hoursWorked: isPast ? (7.5 + Math.random() * 1).toFixed(1) : null,
      submitted: isPast && i < today.getDay() - 1,
    };
  });
}

// GET /api/payroll/stubs — recent pay stubs
router.get('/stubs', (req, res) => {
  const stubs = generatePayStubs(req.user.id);
  res.json(stubs);
});

// GET /api/payroll/stubs/:id — single pay stub detail
router.get('/stubs/:id', (req, res) => {
  const stubs = generatePayStubs(req.user.id);
  const stub = stubs.find(s => s.id === req.params.id);
  if (!stub) return res.status(404).json({ error: 'Pay stub not found' });
  res.json(stub);
});

// GET /api/payroll/summary — YTD summary
router.get('/summary', (req, res) => {
  const gross = 6250 * 8; // 4 months * 2 periods
  res.json({
    ytdGross: gross,
    ytdFederalTax: gross * 0.22,
    ytdStateTax: gross * 0.093,
    ytdSocialSecurity: gross * 0.062,
    ytdMedicare: gross * 0.0145,
    ytdHealthInsurance: 180 * 8,
    ytdRetirement403b: gross * 0.05,
    ytdNetPay: gross * 0.5815 - 180 * 8,
    nextPayDate: new Date(new Date().getFullYear(), new Date().getMonth(), 30).toISOString(),
    payFrequency: 'Semi-monthly',
    annualSalary: 75000,
    department: req.user.department || 'UCLA',
    asOf: new Date().toISOString(),
  });
});

// GET /api/payroll/timesheet — current week timesheet
router.get('/timesheet', (req, res) => {
  const sheet = generateTimesheet(req.user.id);
  const totalHours = sheet.reduce((sum, d) => sum + (parseFloat(d.hoursWorked) || 0), 0);
  res.json({ week: sheet, totalHoursWorked: totalHours.toFixed(1), totalScheduled: 40, status: 'in_progress' });
});

// POST /api/payroll/timesheet/submit — submit current week
router.post('/timesheet/submit', (req, res) => {
  const refNum = `TS-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;
  res.json({
    message: 'Timesheet submitted successfully',
    reference: refNum,
    submittedAt: new Date().toISOString(),
    status: 'pending_approval',
    workdayRef: `WD-TIME-${refNum}`,
  });
});

// GET /api/payroll/benefits — benefits summary
router.get('/benefits', (req, res) => {
  res.json({
    healthPlan: { plan: 'UC Blue & Gold HMO', premium: 180, coverage: 'Employee + Family', network: 'Anthem Blue Cross' },
    dental: { plan: 'Delta Dental PPO', premium: 28, annualMax: 2000 },
    vision: { plan: 'VSP', premium: 8, examCopay: 0, frameAllowance: 150 },
    retirement: {
      plan: '403(b) DC Plan',
      employeeContribution: '5%',
      universityMatch: '5%',
      vestingSchedule: 'Immediate',
      currentBalance: 18420,
    },
    fsa: { medical: { elected: 2400, remaining: 1820 }, dependent: { elected: 0 } },
    enrollmentWindowOpen: false,
    nextEnrollment: 'October 1–31, 2026',
  });
});

module.exports = router;
