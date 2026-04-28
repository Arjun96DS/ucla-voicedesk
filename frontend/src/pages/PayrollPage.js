import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { payrollAPI } from '../services/api';
import { DollarSign, Clock, Heart, FileText, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function SummaryBar({ label, value, total, color }) {
  const pct = Math.min((value / total) * 100, 100);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(value)}</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-primary)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

function PayStubModal({ stub, onClose }) {
  if (!stub) return null;
  const deductions = stub.federalTax + stub.stateTax + stub.socialSecurity + stub.medicare + stub.healthInsurance + stub.retirement403b;
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <span className="modal-title">Pay Stub — {stub.period}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Pay Period</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{stub.period}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Pay Date</span>
            <span style={{ fontSize: 13 }}>{format(new Date(stub.payDate), 'MMMM d, yyyy')}</span>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Earnings</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 14 }}>Regular Pay</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--success)' }}>{fmt(stub.grossPay)}</span>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Deductions</div>
          {[
            ['Federal Tax', stub.federalTax],
            ['California State Tax', stub.stateTax],
            ['Social Security', stub.socialSecurity],
            ['Medicare', stub.medicare],
            ['Health Insurance', stub.healthInsurance],
            ['403(b) Retirement', stub.retirement403b],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontSize: 13, color: 'var(--danger)' }}>−{fmt(val)}</span>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(39,116,174,0.1)', border: '1px solid rgba(39,116,174,0.3)', borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Net Pay</span>
          <span style={{ fontWeight: 800, fontSize: 24, color: 'var(--success)' }}>{fmt(stub.netPay)}</span>
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => { toast.success('Pay stub downloaded'); }}>
            <FileText size={14} /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStub, setSelectedStub] = useState(null);
  const [timesheetSubmitted, setTimesheetSubmitted] = useState(false);

  const { data: summary } = useQuery({ queryKey: ['payroll-summary'], queryFn: () => payrollAPI.summary().then(r => r.data) });
  const { data: stubs } = useQuery({ queryKey: ['payroll-stubs'], queryFn: () => payrollAPI.stubs().then(r => r.data) });
  const { data: timesheet } = useQuery({ queryKey: ['timesheet'], queryFn: () => payrollAPI.timesheet().then(r => r.data) });
  const { data: benefits } = useQuery({ queryKey: ['benefits'], queryFn: () => payrollAPI.benefits().then(r => r.data) });

  const { mutate: submitTimesheet, isPending } = useMutation({
    mutationFn: () => payrollAPI.submitTimesheet(),
    onSuccess: (r) => {
      toast.success(`Timesheet submitted! Ref: ${r.data.reference}`);
      setTimesheetSubmitted(true);
    },
    onError: () => toast.error('Submission failed'),
  });

  const TABS = [
    { id: 'overview', label: 'Overview', icon: DollarSign },
    { id: 'paystubs', label: 'Pay Stubs', icon: FileText },
    { id: 'timesheet', label: 'Timesheet', icon: Clock },
    { id: 'benefits', label: 'Benefits', icon: Heart },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payroll & Benefits</h1>
        <p className="page-sub">Pay stubs, timesheets, and benefits · Synced with Workday</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)', padding: 4, borderRadius: 12, width: 'fit-content', border: '1px solid var(--border)' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, border: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
              background: activeTab === id ? 'var(--ucla-blue)' : 'transparent',
              color: activeTab === id ? 'white' : 'var(--text-secondary)',
            }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && summary && (
        <div>
          {/* Key numbers */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-label">Annual Salary</div>
              <div className="stat-value" style={{ fontSize: 22, color: 'var(--success)' }}>{fmt(summary.annualSalary)}</div>
              <div className="stat-sub">Semi-monthly pay</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">YTD Gross</div>
              <div className="stat-value" style={{ fontSize: 22 }}>{fmt(summary.ytdGross)}</div>
              <div className="stat-sub">2026 earnings</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">YTD Net Pay</div>
              <div className="stat-value" style={{ fontSize: 22, color: 'var(--success)' }}>{fmt(summary.ytdNetPay)}</div>
              <div className="stat-sub">after deductions</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Next Pay Date</div>
              <div className="stat-value" style={{ fontSize: 20, color: 'var(--ucla-blue-light)' }}>
                {summary.nextPayDate ? format(new Date(summary.nextPayDate), 'MMM d') : '—'}
              </div>
              <div className="stat-sub">{fmt(summary.ytdGross / 8)} estimated</div>
            </div>
          </div>

          {/* YTD breakdown */}
          <div className="card">
            <div className="card-header"><span className="card-title">Year-to-Date Breakdown</span></div>
            <SummaryBar label="Gross Pay" value={summary.ytdGross} total={summary.ytdGross} color="var(--success)" />
            <SummaryBar label="Federal Tax" value={summary.ytdFederalTax} total={summary.ytdGross} color="var(--danger)" />
            <SummaryBar label="California State Tax" value={summary.ytdStateTax} total={summary.ytdGross} color="#f97316" />
            <SummaryBar label="Social Security" value={summary.ytdSocialSecurity} total={summary.ytdGross} color="var(--warning)" />
            <SummaryBar label="Medicare" value={summary.ytdMedicare} total={summary.ytdGross} color="#a855f7" />
            <SummaryBar label="Health Insurance" value={summary.ytdHealthInsurance} total={summary.ytdGross} color="var(--info)" />
            <SummaryBar label="403(b) Retirement" value={summary.ytdRetirement403b} total={summary.ytdGross} color="var(--ucla-blue-light)" />
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>YTD Net Pay</span>
              <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--success)' }}>{fmt(summary.ytdNetPay)}</span>
            </div>
          </div>
        </div>
      )}

      {/* PAY STUBS */}
      {activeTab === 'paystubs' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Pay Stub History</span></div>
          {stubs?.length ? (
            <table className="table">
              <thead><tr><th>Period</th><th>Pay Date</th><th>Gross Pay</th><th>Net Pay</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {stubs.map(stub => (
                  <tr key={stub.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{stub.period}</td>
                    <td>{format(new Date(stub.payDate), 'MMM d, yyyy')}</td>
                    <td style={{ color: 'var(--text-primary)' }}>{fmt(stub.grossPay)}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(stub.netPay)}</td>
                    <td><span className="badge badge-approved">Paid</span></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelectedStub(stub)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state"><FileText size={32} style={{ opacity: 0.2, marginBottom: 8 }} /><p>No pay stubs found</p></div>
          )}
        </div>
      )}

      {/* TIMESHEET */}
      {activeTab === 'timesheet' && timesheet && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">Current Week Timesheet</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  {timesheet.totalHoursWorked} / {timesheet.totalScheduled} hrs
                </span>
                {!timesheetSubmitted ? (
                  <button className="btn btn-primary btn-sm" onClick={() => submitTimesheet()} disabled={isPending}>
                    {isPending ? 'Submitting...' : 'Submit Week'}
                  </button>
                ) : (
                  <span style={{ color: 'var(--success)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={14} /> Submitted
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {timesheet.week.map((day) => (
                <div key={day.day} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: 8,
                  border: day.hoursWorked ? '1px solid var(--border)' : '1px solid var(--border-subtle)',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{day.day}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{day.date}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: day.hoursWorked ? 'var(--success)' : 'var(--text-muted)' }}>
                        {day.hoursWorked ? `${day.hoursWorked} hrs` : '—'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>of {day.hoursScheduled} scheduled</div>
                    </div>
                    {day.submitted && <span className="badge badge-approved">Done</span>}
                    {day.hoursWorked && !day.submitted && <span className="badge badge-pending">Pending</span>}
                    {!day.hoursWorked && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Upcoming</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BENEFITS */}
      {activeTab === 'benefits' && benefits && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="grid-2">
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, background: 'rgba(39,116,174,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>❤️</div>
                <span style={{ fontWeight: 600 }}>Health Insurance</span>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 2 }}>
                <div><strong style={{ color: 'var(--text-primary)' }}>Plan:</strong> {benefits.healthPlan.plan}</div>
                <div><strong style={{ color: 'var(--text-primary)' }}>Coverage:</strong> {benefits.healthPlan.coverage}</div>
                <div><strong style={{ color: 'var(--text-primary)' }}>Premium:</strong> {fmt(benefits.healthPlan.premium)}/month</div>
                <div><strong style={{ color: 'var(--text-primary)' }}>Network:</strong> {benefits.healthPlan.network}</div>
              </div>
            </div>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, background: 'rgba(63,185,80,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🦷</div>
                <span style={{ fontWeight: 600 }}>Dental & Vision</span>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 2 }}>
                <div><strong style={{ color: 'var(--text-primary)' }}>Dental:</strong> {benefits.dental.plan} — {fmt(benefits.dental.premium)}/mo</div>
                <div><strong style={{ color: 'var(--text-primary)' }}>Annual Max:</strong> {fmt(benefits.dental.annualMax)}</div>
                <div><strong style={{ color: 'var(--text-primary)' }}>Vision:</strong> {benefits.vision.plan} — {fmt(benefits.vision.premium)}/mo</div>
                <div><strong style={{ color: 'var(--text-primary)' }}>Frame Allowance:</strong> {fmt(benefits.vision.frameAllowance)}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, background: 'rgba(255,209,0,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📈</div>
              <span style={{ fontWeight: 600 }}>403(b) Retirement Plan</span>
            </div>
            <div className="grid-2" style={{ gap: 12 }}>
              <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '16px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)' }}>{fmt(benefits.retirement.currentBalance)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Current Balance</div>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div><strong style={{ color: 'var(--text-primary)' }}>Your contribution:</strong> {benefits.retirement.employeeContribution}</div>
                <div><strong style={{ color: 'var(--text-primary)' }}>UCLA match:</strong> {benefits.retirement.universityMatch}</div>
                <div><strong style={{ color: 'var(--text-primary)' }}>Vesting:</strong> {benefits.retirement.vestingSchedule}</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(39,116,174,0.1) 0%, transparent 100%)', border: '1px solid rgba(39,116,174,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Open Enrollment</div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Next window: <strong style={{ color: 'var(--ucla-gold)' }}>{benefits.nextEnrollment}</strong></div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Changes take effect January 1, 2027</div>
              </div>
              <span className="badge badge-pending">Upcoming</span>
            </div>
          </div>
        </div>
      )}

      {selectedStub && <PayStubModal stub={selectedStub} onClose={() => setSelectedStub(null)} />}
    </div>
  );
}
