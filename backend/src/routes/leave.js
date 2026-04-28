const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/leave — list current user's requests
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM leave_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
});

// GET /api/leave/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM leave_requests WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Leave request not found' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to fetch leave request' });
  }
});

// POST /api/leave
router.post('/', [
  body('leaveType').isIn(['vacation', 'sick', 'personal', 'bereavement', 'other']),
  body('startDate').isDate(),
  body('endDate').isDate(),
  body('reason').optional().trim().isLength({ max: 500 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { leaveType, startDate, endDate, reason } = req.body;

  if (new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({ error: 'Start date must be before end date' });
  }
  if (new Date(startDate) < new Date()) {
    return res.status(400).json({ error: 'Start date must be in the future' });
  }

  try {
    // Simulate Workday integration reference
    const workdayRef = `WD-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;

    const { rows } = await pool.query(
      `INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, reason, workday_reference)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, leaveType, startDate, endDate, reason || null, workdayRef]
    );
    res.status(201).json({
      ...rows[0],
      message: `Leave request submitted. Workday reference: ${workdayRef}`,
    });
  } catch {
    res.status(500).json({ error: 'Failed to submit leave request' });
  }
});

// PATCH /api/leave/:id/cancel
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE leave_requests SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Request not found or cannot be cancelled' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to cancel request' });
  }
});

// GET /api/leave/balance — simulated balance
router.get('/meta/balance', async (req, res) => {
  res.json({
    vacation: { total: 15, used: 5, remaining: 10 },
    sick: { total: 12, used: 2, remaining: 10 },
    personal: { total: 3, used: 1, remaining: 2 },
    asOf: new Date().toISOString(),
  });
});

module.exports = router;
