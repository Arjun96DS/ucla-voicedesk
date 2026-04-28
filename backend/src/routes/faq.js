const express = require('express');
const { body, validationResult } = require('express-validator');
const OpenAI = require('openai');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const UCLA_CONTEXT = `You are VoiceDesk, the official campus assistant for the University of California, Los Angeles (UCLA). 
You answer questions about UCLA campus operations, HR policies, IT services, benefits, and workplace procedures.

Known UCLA facts and policies:
- UCLA IT Support: (310) 267-HELP or help@it.ucla.edu | Hours: Mon–Fri 8am–6pm PT
- Workday is UCLA's HR system for leave, payroll, and benefits management
- ServiceNow is the IT ticketing system (accessed via it.ucla.edu)
- 25Live is the room/resource reservation system
- Benefits enrollment window: typically October 1–31 for the following year
- Employee parking permits: managed through UCLA Transportation at transportation.ucla.edu  
- Library hours: Powell Library open Mon–Thu 8am–midnight, Fri 8am–6pm, Sat–Sun 10am–midnight
- Campus dining operates in Bruin Plate, Epicuria, Feast, De Neve, and other locations
- VPN required for accessing certain campus resources remotely; GlobalProtect is the standard client
- New employee onboarding handled through the Bruin OnLine (BOL) portal
- Direct Deposit and payroll changes made in Bruin OnLine or Workday
- ADA accommodations: contact the ADA/504 Compliance Office
- Emergency line: (310) 825-1491 | Campus police: (310) 825-1491

Answer the question concisely in 2-4 sentences. If you don't know the specific answer, direct the user to the appropriate UCLA resource. Stay on-topic for UCLA campus operations. Do not make up specific phone numbers or URLs beyond those provided.`;

// POST /api/faq/ask
router.post('/ask', [
  body('question').trim().isLength({ min: 3, max: 500 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { question } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: UCLA_CONTEXT },
        { role: 'user', content: question },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const answer = completion.choices[0].message.content;
    res.json({ question, answer, source: 'UCLA VoiceDesk AI' });
  } catch {
    res.status(500).json({ error: 'FAQ service unavailable' });
  }
});

// GET /api/faq/common — pre-cached common questions
router.get('/common', (req, res) => {
  res.json([
    { q: 'How do I submit a leave request?', a: 'Say "Submit a leave request" followed by the dates and type (vacation, sick, personal). VoiceDesk will file it directly into Workday.' },
    { q: 'How do I reset my UCLA password?', a: 'Visit sso.ucla.edu or call IT Support at (310) 267-HELP. You can also submit a voice ticket saying "I need to reset my password."' },
    { q: 'When is benefits enrollment?', a: 'Open enrollment is typically October 1–31 for the following calendar year. Watch for email notifications from UCLA Benefits.' },
    { q: 'How do I book a conference room?', a: 'Say "Book a conference room for [date] at [time]" and VoiceDesk will check availability and confirm via 25Live.' },
    { q: 'How do I connect to VPN from home?', a: 'Download GlobalProtect from vpn.ucla.edu and connect using your UCLA login credentials. If you have issues, submit a voice IT ticket.' },
    { q: 'What is my parking permit number?', a: 'Parking is managed at transportation.ucla.edu. You can also call (310) 825-9797 for assistance.' },
  ]);
});

module.exports = router;
