const express = require('express');
const { body, validationResult } = require('express-validator');
const OpenAI = require('openai');
const { pool } = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Intent definitions ────────────────────────────────────────────────────────
const INTENTS = {
  SUBMIT_LEAVE: 'submit_leave',
  CHECK_LEAVE_STATUS: 'check_leave_status',
  CHECK_LEAVE_BALANCE: 'check_leave_balance',
  CREATE_IT_TICKET: 'create_it_ticket',
  CHECK_TICKET_STATUS: 'check_ticket_status',
  BOOK_ROOM: 'book_room',
  CHECK_ROOM_AVAILABILITY: 'check_room_availability',
  CHECK_PAYROLL: 'check_payroll',
  SUBMIT_TIMESHEET: 'submit_timesheet',
  CHECK_BENEFITS: 'check_benefits',
  CAMPUS_FAQ: 'campus_faq',
  UNKNOWN: 'unknown',
};

const SYSTEM_PROMPT = `You are VoiceDesk, an intelligent campus assistant for UCLA. Your job is to parse voice commands from UCLA staff and faculty into structured actions.

Parse the user's command and return ONLY valid JSON in this exact format:
{
  "intent": "<one of: submit_leave, check_leave_status, check_leave_balance, create_it_ticket, check_ticket_status, book_room, check_room_availability, check_payroll, submit_timesheet, check_benefits, campus_faq, unknown>",
  "confidence": <0.0 to 1.0>,
  "entities": {
    // For submit_leave:
    "leaveType": "<vacation|sick|personal|bereavement|other>",
    "startDate": "<YYYY-MM-DD>",
    "endDate": "<YYYY-MM-DD>",
    "reason": "<string or null>",
    
    // For create_it_ticket:
    "title": "<short title>",
    "description": "<full description>",
    "priority": "<low|medium|high|critical or null>",
    "category": "<hardware|software|network|access|email|printing|other or null>",
    
    // For book_room:
    "date": "<YYYY-MM-DD>",
    "startTime": "<HH:MM in 24h>",
    "endTime": "<HH:MM in 24h>",
    "duration": "<minutes as integer>",
    "title": "<meeting title>",
    "capacity": "<integer or null>",
    
    // For campus_faq:
    "question": "<the question>",
    
    // For check_ticket_status or check_leave_status:
    "referenceNumber": "<ticket/request number or null>"
  },
  "clarificationNeeded": "<null or string describing what info is missing>",
  "humanReadable": "<brief confirmation of what you understood>"
}

Today's date is ${new Date().toISOString().split('T')[0]}.
When a user says "next Monday", "this Friday", "tomorrow" etc., resolve to absolute YYYY-MM-DD dates.
If only one day is mentioned for leave, set endDate = startDate.
For room bookings, if only duration is given (e.g., "1 hour"), calculate endTime from startTime.
Be liberal in interpreting intent — users speak casually.`;

// POST /api/voice/parse — main intent parsing endpoint
router.post('/parse', [
  body('transcript').trim().isLength({ min: 2, max: 1000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { transcript } = req.body;
  const startTime = Date.now();

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: transcript },
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0].message.content;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(422).json({ error: 'Failed to parse AI response', raw });
    }

    const latencyMs = Date.now() - startTime;

    // Log the interaction
    await pool.query(
      `INSERT INTO voice_logs (user_id, transcript, intent, confidence, action_taken, success)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, transcript, parsed.intent, parsed.confidence, null, true]
    ).catch(() => {}); // Non-blocking log

    res.json({
      ...parsed,
      meta: { latencyMs, model: 'gpt-3.5-turbo', transcriptLength: transcript.length },
    });
  } catch (err) {
    if (err.status === 429) {
      return res.status(429).json({ error: 'AI service rate limited. Please try again.' });
    }
    res.status(500).json({ error: 'Voice parsing failed' });
  }
});

// POST /api/voice/execute — parse AND execute in one call
router.post('/execute', [
  body('transcript').trim().isLength({ min: 2, max: 1000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { transcript } = req.body;

  // Step 1: Parse intent
  let parsed;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: transcript },
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });
    parsed = JSON.parse(completion.choices[0].message.content);
  } catch {
    return res.status(500).json({ error: 'Failed to understand command' });
  }

  if (parsed.confidence < 0.5 || parsed.intent === INTENTS.UNKNOWN) {
    return res.json({
      intent: INTENTS.UNKNOWN,
      message: "I didn't quite catch that. Could you rephrase?",
      parsed,
    });
  }

  if (parsed.clarificationNeeded) {
    return res.json({
      intent: parsed.intent,
      clarificationNeeded: parsed.clarificationNeeded,
      parsed,
    });
  }

  // Step 2: Execute intent
  let result;
  const e = parsed.entities;

  try {
    switch (parsed.intent) {
      case INTENTS.SUBMIT_LEAVE: {
        const leaveRef = `WD-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
        const { rows } = await pool.query(
          `INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, reason, workday_reference)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [req.user.id, e.leaveType || 'personal', e.startDate, e.endDate, e.reason, leaveRef]
        );
        result = { action: 'leave_submitted', data: rows[0], reference: leaveRef };
        break;
      }

      case INTENTS.CHECK_LEAVE_STATUS: {
        const { rows } = await pool.query(
          `SELECT * FROM leave_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
          [req.user.id]
        );
        result = { action: 'leave_status', data: rows };
        break;
      }

      case INTENTS.CHECK_LEAVE_BALANCE: {
        result = {
          action: 'leave_balance',
          data: {
            vacation: { total: 15, used: 5, remaining: 10 },
            sick: { total: 12, used: 2, remaining: 10 },
            personal: { total: 3, used: 1, remaining: 2 },
          },
        };
        break;
      }

      case INTENTS.CREATE_IT_TICKET: {
        const priority = e.priority || inferPriority(e.title, e.description);
        const category = e.category || inferCategory(e.title, e.description);
        const snNum = `INC${Math.floor(Math.random() * 90000) + 10000}`;
        const { rows } = await pool.query(
          `INSERT INTO it_tickets (user_id, title, description, category, priority, servicenow_number)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [req.user.id, e.title, e.description, category, priority, snNum]
        );
        result = { action: 'ticket_created', data: rows[0], reference: snNum };
        break;
      }

      case INTENTS.CHECK_TICKET_STATUS: {
        const { rows } = await pool.query(
          `SELECT * FROM it_tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
          [req.user.id]
        );
        result = { action: 'ticket_status', data: rows };
        break;
      }

      case INTENTS.CHECK_ROOM_AVAILABILITY: {
        const start = new Date(`${e.date}T${e.startTime || '09:00'}`);
        const end = new Date(`${e.date}T${e.endTime || '10:00'}`);
        const { rows } = await pool.query(
          `SELECT r.* FROM rooms r
           WHERE r.is_active = true
           AND ($1::integer IS NULL OR r.capacity >= $1)
           AND r.id NOT IN (
             SELECT room_id FROM room_bookings
             WHERE status = 'confirmed'
             AND tstzrange(start_time, end_time) && tstzrange($2, $3)
           ) ORDER BY r.capacity LIMIT 5`,
          [e.capacity || null, start.toISOString(), end.toISOString()]
        );
        result = { action: 'rooms_available', data: rows };
        break;
      }

      case INTENTS.BOOK_ROOM: {
        const availRooms = await pool.query(
          `SELECT r.* FROM rooms r
           WHERE r.is_active = true
           AND ($1::integer IS NULL OR r.capacity >= $1)
           AND r.id NOT IN (
             SELECT room_id FROM room_bookings WHERE status = 'confirmed'
             AND tstzrange(start_time, end_time) && tstzrange($2, $3)
           ) ORDER BY r.capacity LIMIT 1`,
          [e.capacity || null,
           new Date(`${e.date}T${e.startTime}`).toISOString(),
           new Date(`${e.date}T${e.endTime}`).toISOString()]
        );
        if (!availRooms.rows[0]) {
          result = { action: 'no_rooms', message: 'No rooms available for that time slot.' };
          break;
        }
        const room = availRooms.rows[0];
        const refNum = `25L-${Math.floor(Math.random() * 900000) + 100000}`;
        const { rows } = await pool.query(
          `INSERT INTO room_bookings (room_id, user_id, title, start_time, end_time, attendee_count, twentyfive_live_ref)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [room.id, req.user.id, e.title || 'Meeting',
           new Date(`${e.date}T${e.startTime}`).toISOString(),
           new Date(`${e.date}T${e.endTime}`).toISOString(),
           e.capacity || 1, refNum]
        );
        result = { action: 'room_booked', data: rows[0], room, reference: refNum };
        break;
      }

      case INTENTS.CHECK_PAYROLL: {
        const [summary, stubs] = await Promise.all([
          pool.query('SELECT 1').then(() => ({
            ytdGross: 50000, ytdNetPay: 36500, nextPayDate: new Date(new Date().getFullYear(), new Date().getMonth(), 30).toISOString(),
            annualSalary: 75000, payFrequency: 'Semi-monthly',
          })),
          Promise.resolve([
            { id: 'PAY-2026-001', period: 'Apr 1–15, 2026', grossPay: 3125, netPay: 2218, payDate: new Date().toISOString(), status: 'paid' },
            { id: 'PAY-2026-002', period: 'Mar 16–31, 2026', grossPay: 3125, netPay: 2218, status: 'paid' },
          ])
        ]);
        result = { action: 'payroll_summary', data: { summary, recentStubs: stubs } };
        break;
      }

      case INTENTS.SUBMIT_TIMESHEET: {
        const refNum = `TS-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;
        result = { action: 'timesheet_submitted', data: { reference: refNum, status: 'pending_approval', workdayRef: `WD-TIME-${refNum}`, submittedAt: new Date().toISOString() } };
        break;
      }

      case INTENTS.CHECK_BENEFITS: {
        result = {
          action: 'benefits_summary',
          data: {
            healthPlan: 'UC Blue & Gold HMO', premium: 180,
            dental: 'Delta Dental PPO', vision: 'VSP',
            retirement: { plan: '403(b)', balance: 18420, contribution: '5%', universityMatch: '5%' },
            nextEnrollment: 'October 1–31, 2026',
          }
        };
        break;
      }

      case INTENTS.CAMPUS_FAQ: {
        result = { action: 'faq', question: e.question };
        // FAQ answers are handled by the /api/faq route
        break;
      }

      default:
        result = { action: 'unknown' };
    }
  } catch (execErr) {
    return res.status(500).json({ error: 'Action failed', detail: execErr.message });
  }

  // Log success
  await pool.query(
    `INSERT INTO voice_logs (user_id, transcript, intent, confidence, action_taken, success)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [req.user.id, transcript, parsed.intent, parsed.confidence, result.action, true]
  ).catch(() => {});

  res.json({ intent: parsed.intent, parsed, result });
});

// Helper functions (duplicated here for self-contained route)
function inferPriority(title = '', desc = '') {
  const t = `${title} ${desc}`.toLowerCase();
  if (/critical|down|outage|emergency/.test(t)) return 'critical';
  if (/not working|crashed|no access|urgent/.test(t)) return 'high';
  if (/slow|issue|error/.test(t)) return 'medium';
  return 'low';
}
function inferCategory(title = '', desc = '') {
  const t = `${title} ${desc}`.toLowerCase();
  if (/wifi|vpn|network|internet/.test(t)) return 'network';
  if (/email|outlook|teams/.test(t)) return 'email';
  if (/print/.test(t)) return 'printing';
  if (/password|access|login/.test(t)) return 'access';
  if (/laptop|hardware|monitor/.test(t)) return 'hardware';
  if (/software|install|app/.test(t)) return 'software';
  return 'other';
}

module.exports = router;
