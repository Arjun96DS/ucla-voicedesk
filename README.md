# 🎙️ UCLA VoiceDesk

**An AI-powered campus voice assistant for UCLA staff and faculty.**

VoiceDesk lets UCLA employees speak natural language commands to interact with university workplace systems — submitting leave requests, creating IT tickets, booking conference rooms, checking request status, and getting instant answers to campus questions.

[![Node.js](https://img.shields.io/badge/Node.js-18+-brightgreen)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://postgresql.org)
[![OpenAI](https://img.shields.io/badge/GPT-3.5--turbo-purple)](https://openai.com)

---

## 🎬 Demo

**Live Demo:** [https://voicedesk-frontend.onrender.com](https://voicedesk-frontend.onrender.com)

**Demo credentials:**
- Email: `demo@ucla.edu`
- Password: `VoiceDesk2024!`

**Try these voice commands:**
- *"Submit a sick day for next Monday"*
- *"Create an IT ticket — my laptop won't connect to WiFi"*
- *"Book a conference room for Thursday at 2pm for 1 hour"*
- *"What's the status of my IT tickets?"*
- *"When is benefits enrollment?"*

---

## ✨ Features

### 🎙️ Voice Assistant (with Wake Word)
- Browser-native voice capture via **Web Speech API** (no third-party SDKs)
- Real-time transcription with interim results shown as you speak
- Intent classification using **GPT-3.5-turbo** with structured JSON output
- Automatic entity extraction (dates, times, priority, category) from natural speech
- Falls back gracefully to typed text input
- **"Hey VoiceDesk" wake word** — passive background listening auto-navigates to voice page
- Supports payroll, timesheet, and benefits voice commands

### 📅 Leave Request Management
- Submit vacation, sick, personal, bereavement, and other leave requests
- View leave balance by type (vacation, sick, personal)
- Track request status (pending → approved/denied)
- Cancel pending requests
- **Enterprise integration:** Simulates Workday API with reference number generation

### 🎫 IT Help Desk
- Create support tickets with automatic priority and category detection
- Filter by status (open, in progress, resolved) and priority
- Auto-assigns ServiceNow ticket numbers (INC format)
- Keyword-based smart categorization (network, email, hardware, etc.)
- **Enterprise integration:** Maps to ServiceNow INC numbering format

### 🏢 Room Booking
- Real-time availability search by date, time, and capacity
- View room features (projector, whiteboard, video conferencing, etc.)
- Conflict prevention using PostgreSQL exclusion constraints
- Manage and cancel upcoming bookings
- **Enterprise integration:** Generates 25Live reservation reference numbers

### 💬 Campus FAQ
- GPT-powered answers grounded in UCLA-specific context
- Pre-seeded with common HR, IT, and campus operations questions
- Collapsible accordion for common questions
- Covers: IT support, VPN, benefits, parking, library hours, onboarding

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (React 18)                    │
│  Web Speech API → Voice Capture → UI Components        │
│  React Query → State Management → Axios → REST API     │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / JWT Bearer
┌────────────────────────▼────────────────────────────────┐
│               BACKEND (Node.js + Express)               │
│  Auth Routes (JWT) · Leave · Tickets · Rooms · Voice   │
│  Rate Limiting · Helmet · Input Validation              │
│                         │                               │
│          OpenAI GPT-3.5-turbo (intent parsing)         │
└────────────────────────┬────────────────────────────────┘
                         │ pg pool
┌────────────────────────▼────────────────────────────────┐
│              PostgreSQL 15 (via Render)                 │
│  users · leave_requests · it_tickets                   │
│  rooms · room_bookings · voice_logs                    │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Voice Capture | Browser Web Speech API |
| AI / Intent Parsing | OpenAI GPT-3.5-turbo |
| Frontend | React 18, React Router v6, React Query v5 |
| Styling | Custom CSS with UCLA design system |
| Backend | Node.js 18, Express 4 |
| Database | PostgreSQL 15 |
| Auth | JWT (jsonwebtoken, bcryptjs) |
| Deployment | Render.com (free tier) |
| Validation | express-validator |
| Logging | Winston |

---

## 🔌 Enterprise Integration Points

VoiceDesk is designed to connect with UCLA's actual enterprise systems. The simulation layer can be swapped for real API clients:

### Workday (HR / Leave Management)
```js
// Current: simulated reference numbers
const workdayRef = `WD-${year}-${random}`;

// Production: Workday REST API
const workdayRef = await workdayClient.submitLeaveRequest({
  workerId: user.employeeId,
  leaveType: mapToWorkdayType(leaveType),
  startDate, endDate
});
```

### ServiceNow (IT Ticketing)
```js
// Current: INC + random number
const snNumber = `INC${random}`;

// Production: ServiceNow Table API
const incident = await serviceNowClient.createIncident({
  caller_id: user.email,
  short_description: title,
  description, category, priority
});
```

### 25Live (Room Reservations)
```js
// Current: simulated 25Live references
const ref = `25L-${random}`;

// Production: CollegeNET 25Live REST API
const reservation = await twentyFiveLiveClient.createReservation({
  spaceId: room.twentyfive_live_id,
  startDt, endDt, headCount, eventName
});
```

### UCLA SSO (Future)
The auth system is designed to accept UCLA's Shibboleth/Okta SSO tokens. Swap the local JWT login for Passport.js + `passport-saml`.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ (or a Render PostgreSQL database)
- OpenAI API key

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/ucla-voicedesk.git
cd ucla-voicedesk

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Configure environment

```bash
# backend/.env
cp backend/.env.example backend/.env
# Edit: DATABASE_URL, JWT_SECRET, OPENAI_API_KEY
```

### 3. Set up database

```bash
cd backend
npm run db:migrate   # Creates all tables
npm run db:seed      # Loads demo data and rooms
```

### 4. Start development servers

```bash
# Terminal 1 — Backend
cd backend && npm run dev     # http://localhost:4000

# Terminal 2 — Frontend
cd frontend && npm start      # http://localhost:3000
```

---

## 🌐 Deploy to Render

### Option A: Using render.yaml (recommended)

1. Push code to a GitHub repository
2. Connect the repo at [render.com/new](https://render.com/new)
3. Render auto-detects `render.yaml` and creates all services
4. Set `OPENAI_API_KEY` manually in the API service's environment variables
5. After deployment, run migrations:
   ```bash
   # In Render dashboard → API service → Shell
   npm run db:migrate && npm run db:seed
   ```

### Option B: Manual setup

1. Create a **PostgreSQL** database on Render (free tier)
2. Create a **Web Service** for the backend:
   - Root dir: `backend`
   - Build: `npm install`
   - Start: `npm start`
   - Env vars: `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `NODE_ENV=production`
3. Create a **Static Site** for the frontend:
   - Root dir: `frontend`
   - Build: `npm install && npm run build`
   - Publish: `./build`
   - Add rewrite: `/* → /index.html`
   - Set `REACT_APP_API_URL` to your backend URL

---

## 📁 Project Structure

```
ucla-voicedesk/
├── backend/
│   ├── src/
│   │   ├── index.js          # Express app entry
│   │   ├── db/
│   │   │   ├── pool.js       # PostgreSQL connection
│   │   │   ├── migrate.js    # Schema setup
│   │   │   └── seed.js       # Demo data
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT verification
│   │   ├── routes/
│   │   │   ├── auth.js       # Login/register/me
│   │   │   ├── voice.js      # GPT intent parsing + execution
│   │   │   ├── leave.js      # Leave request CRUD
│   │   │   ├── tickets.js    # IT ticket CRUD
│   │   │   ├── rooms.js      # Room availability + booking
│   │   │   └── faq.js        # GPT-powered FAQ
│   │   └── services/
│   │       └── logger.js     # Winston logging
│   └── package.json
├── frontend/
│   ├── public/index.html
│   └── src/
│       ├── App.js
│       ├── index.css         # UCLA design system
│       ├── hooks/
│       │   ├── useVoice.js   # Web Speech API hook
│       │   └── useAuth.js    # Auth context
│       ├── services/
│       │   └── api.js        # Axios API layer
│       ├── components/
│       │   └── Layout.js     # Sidebar navigation
│       └── pages/
│           ├── LoginPage.js
│           ├── DashboardPage.js
│           ├── VoicePage.js  # Main voice interface
│           ├── LeavePageList.js
│           ├── TicketsPageList.js
│           ├── RoomsPage.js
│           └── FAQPage.js
├── render.yaml               # One-click Render deployment
└── README.md
```

---

## 🔒 Security

- **JWT authentication** with 8-hour expiry
- **bcrypt** password hashing (12 rounds)
- **Helmet.js** security headers
- **Rate limiting** (100 req/15min globally, 20/min on voice endpoint)
- **Input validation** on all API routes via express-validator
- **UCLA email domain enforcement** at registration
- **CORS** restricted to configured frontend URL
- PostgreSQL **exclusion constraints** prevent double-booking

---

## 🎨 Design

UCLA brand colors throughout:
- **UCLA Blue:** `#2774AE`
- **UCLA Gold:** `#FFD100`

Dark theme optimized for extended workplace use, with high-contrast status badges and accessible typography.

---

## 👤 Author

**Arjun Sunke**  
Instructor, Cloud & IT, Central New Mexico Community College  
[LinkedIn](https://linkedin.com/in/YOUR_HANDLE) · [GitHub](https://github.com/YOUR_USERNAME)

---

*Built as a portfolio demonstration for the UCLA Software Developer application.*  
*Deadline: April 30, 2026*
