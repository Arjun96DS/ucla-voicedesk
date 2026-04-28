const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Auto-detect priority from description keywords
function inferPriority(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  if (/critical|down|outage|emergency|cannot work|nothing works/.test(text)) return 'critical';
  if (/won't start|no access|locked out|urgent|broken|not working|crashed/.test(text)) return 'high';
  if (/slow|issue|problem|error|trouble/.test(text)) return 'medium';
  return 'low';
}

// Auto-categorize ticket
function inferCategory(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  if (/wifi|network|internet|vpn|ethernet|connection/.test(text)) return 'network';
  if (/email|outlook|calendar|teams|zoom/.test(text)) return 'email';
  if (/printer|print|scanner/.test(text)) return 'printing';
  if (/password|access|login|account|permission/.test(text)) return 'access';
  if (/laptop|computer|monitor|keyboard|mouse|hardware/.test(text)) return 'hardware';
  if (/software|install|app|application|update/.test(text)) return 'software';
  return 'other';
}

// GET /api/tickets
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM it_tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// GET /api/tickets/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM it_tickets WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Ticket not found' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// POST /api/tickets
router.post('/', [
  body('title').trim().isLength({ min: 5, max: 255 }),
  body('description').trim().isLength({ min: 10, max: 2000 }),
  body('category').optional().isIn(['hardware', 'software', 'network', 'access', 'email', 'printing', 'other']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description } = req.body;
  const category = req.body.category || inferCategory(title, description);
  const priority = req.body.priority || inferPriority(title, description);

  try {
    const serviceNowNum = `INC${Math.floor(Math.random() * 90000) + 10000}`;

    const { rows } = await pool.query(
      `INSERT INTO it_tickets (user_id, title, description, category, priority, servicenow_number)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, title, description, category, priority, serviceNowNum]
    );

    res.status(201).json({
      ...rows[0],
      message: `IT ticket created. ServiceNow reference: ${serviceNowNum}`,
    });
  } catch {
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// PATCH /api/tickets/:id/status
router.patch('/:id/status', [
  body('status').isIn(['open', 'in_progress', 'waiting', 'resolved', 'closed']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { rows } = await pool.query(
      `UPDATE it_tickets SET status = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [req.body.status, req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Ticket not found' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

module.exports = router;
