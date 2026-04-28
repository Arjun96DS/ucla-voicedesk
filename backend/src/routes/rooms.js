const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/rooms — list all rooms
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM rooms WHERE is_active = true ORDER BY building, name`
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// GET /api/rooms/availability — check availability for a time slot
router.get('/availability', async (req, res) => {
  const { date, startTime, endTime, capacity } = req.query;
  if (!date || !startTime || !endTime) {
    return res.status(400).json({ error: 'date, startTime, and endTime required' });
  }

  const start = new Date(`${date}T${startTime}`);
  const end = new Date(`${date}T${endTime}`);
  if (isNaN(start) || isNaN(end) || start >= end) {
    return res.status(400).json({ error: 'Invalid time range' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT r.* FROM rooms r
       WHERE r.is_active = true
       AND ($1::integer IS NULL OR r.capacity >= $1)
       AND r.id NOT IN (
         SELECT room_id FROM room_bookings
         WHERE status = 'confirmed'
         AND tstzrange(start_time, end_time) && tstzrange($2, $3)
       )
       ORDER BY r.capacity`,
      [capacity || null, start.toISOString(), end.toISOString()]
    );
    res.json({ available: rows, requestedSlot: { start, end } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// GET /api/rooms/my-bookings
router.get('/my-bookings', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT rb.*, r.name as room_name, r.building, r.room_number
       FROM room_bookings rb
       JOIN rooms r ON r.id = rb.room_id
       WHERE rb.user_id = $1
       ORDER BY rb.start_time DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// POST /api/rooms/book
router.post('/book', [
  body('roomId').isUUID(),
  body('title').trim().isLength({ min: 3, max: 255 }),
  body('startTime').isISO8601(),
  body('endTime').isISO8601(),
  body('attendeeCount').optional().isInt({ min: 1, max: 200 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { roomId, title, startTime, endTime, attendeeCount, notes } = req.body;

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (start <= new Date()) return res.status(400).json({ error: 'Booking must be in the future' });
  if (start >= end) return res.status(400).json({ error: 'End time must be after start time' });

  const durationHours = (end - start) / (1000 * 60 * 60);
  if (durationHours > 8) return res.status(400).json({ error: 'Maximum booking duration is 8 hours' });

  try {
    // Check for conflicts
    const conflict = await pool.query(
      `SELECT id FROM room_bookings
       WHERE room_id = $1 AND status = 'confirmed'
       AND tstzrange(start_time, end_time) && tstzrange($2, $3)`,
      [roomId, startTime, endTime]
    );
    if (conflict.rows.length > 0) {
      return res.status(409).json({ error: 'Room is not available for that time slot' });
    }

    const refNum = `25L-${Math.floor(Math.random() * 900000) + 100000}`;

    const { rows } = await pool.query(
      `INSERT INTO room_bookings (room_id, user_id, title, start_time, end_time, attendee_count, notes, twentyfive_live_ref)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [roomId, req.user.id, title, startTime, endTime, attendeeCount || 1, notes || null, refNum]
    );

    const room = await pool.query('SELECT name, building FROM rooms WHERE id = $1', [roomId]);
    res.status(201).json({
      ...rows[0],
      room: room.rows[0],
      message: `Room booked! 25Live reference: ${refNum}`,
    });
  } catch (err) {
    if (err.code === '23P01') {
      return res.status(409).json({ error: 'Room is not available for that time slot' });
    }
    res.status(500).json({ error: 'Failed to book room' });
  }
});

// DELETE /api/rooms/bookings/:id — cancel booking
router.delete('/bookings/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE room_bookings SET status = 'cancelled'
       WHERE id = $1 AND user_id = $2 AND start_time > NOW()
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Booking not found or already started' });
    res.json({ message: 'Booking cancelled', booking: rows[0] });
  } catch {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;
