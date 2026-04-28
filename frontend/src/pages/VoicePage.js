import React, { useState, useCallback } from 'react';
import { Mic, MicOff, Send, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useVoice } from '../hooks/useVoice';
import { voiceAPI, faqAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const EXAMPLES = [
  "Submit a sick day for next Monday",
  "Create an IT ticket — my laptop won't connect to WiFi",
  "Book a conference room for Thursday at 2pm for 1 hour",
  "What's the status of my IT tickets?",
  "What's my net pay this period?",
  "Submit my timesheet for this week",
  "What are my benefits?",
  "How do I reset my UCLA password?",
];

function IntentBadge({ intent }) {
  const labels = {
    submit_leave: { label: '📅 Leave Request', color: 'var(--success)' },
    check_leave_status: { label: '📅 Leave Status', color: 'var(--success)' },
    check_leave_balance: { label: '📅 Leave Balance', color: 'var(--success)' },
    create_it_ticket: { label: '🎫 IT Ticket', color: 'var(--info)' },
    check_ticket_status: { label: '🎫 Ticket Status', color: 'var(--info)' },
    book_room: { label: '🏢 Room Booking', color: 'var(--ucla-gold)' },
    check_room_availability: { label: '🏢 Room Availability', color: 'var(--ucla-gold)' },
    campus_faq: { label: '💬 Campus FAQ', color: 'var(--text-secondary)' },
    check_payroll: { label: '💰 Payroll', color: 'var(--success)' },
    submit_timesheet: { label: '🕐 Timesheet', color: 'var(--success)' },
    check_benefits: { label: '❤️ Benefits', color: '#a855f7' },
    unknown: { label: '❓ Unknown', color: 'var(--danger)' },
  };
  const info = labels[intent] || labels.unknown;
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
      background: `${info.color}20`, color: info.color, border: `1px solid ${info.color}40`
    }}>
      {info.label}
    </span>
  );
}

function ResultDisplay({ result, intent }) {
  if (!result) return null;

  if (result.action === 'leave_submitted') {
    const d = result.data;
    return (
      <div>
        <div style={{ color: 'var(--success)', fontWeight: 600, marginBottom: 8 }}>
          ✅ Leave request submitted
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <div><strong>Type:</strong> {d.leave_type}</div>
          <div><strong>Dates:</strong> {format(new Date(d.start_date), 'MMM d')} – {format(new Date(d.end_date), 'MMM d, yyyy')}</div>
          <div><strong>Status:</strong> Pending approval</div>
          <div><strong>Workday Ref:</strong> <code style={{ background: 'var(--bg-primary)', padding: '1px 6px', borderRadius: 4 }}>{d.workday_reference}</code></div>
        </div>
      </div>
    );
  }

  if (result.action === 'ticket_created') {
    const d = result.data;
    return (
      <div>
        <div style={{ color: 'var(--success)', fontWeight: 600, marginBottom: 8 }}>
          ✅ IT ticket created
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <div><strong>Title:</strong> {d.title}</div>
          <div><strong>Priority:</strong> <span className={`badge badge-${d.priority}`}>{d.priority}</span></div>
          <div><strong>Category:</strong> {d.category}</div>
          <div><strong>ServiceNow #:</strong> <code style={{ background: 'var(--bg-primary)', padding: '1px 6px', borderRadius: 4 }}>{d.servicenow_number}</code></div>
        </div>
      </div>
    );
  }

  if (result.action === 'room_booked') {
    const b = result.data;
    return (
      <div>
        <div style={{ color: 'var(--success)', fontWeight: 600, marginBottom: 8 }}>
          ✅ Room booked
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <div><strong>Room:</strong> {result.room?.name} ({result.room?.building})</div>
          <div><strong>Time:</strong> {format(new Date(b.start_time), 'MMM d, h:mm a')} – {format(new Date(b.end_time), 'h:mm a')}</div>
          <div><strong>25Live Ref:</strong> <code style={{ background: 'var(--bg-primary)', padding: '1px 6px', borderRadius: 4 }}>{b.twentyfive_live_ref}</code></div>
        </div>
      </div>
    );
  }

  if (result.action === 'leave_status' || result.action === 'ticket_status') {
    const items = result.data;
    const isLeave = result.action === 'leave_status';
    return (
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          {isLeave ? '📅 Recent Leave Requests' : '🎫 Recent IT Tickets'}
        </div>
        {items.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No {isLeave ? 'leave requests' : 'tickets'} found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.slice(0, 3).map(item => (
              <div key={item.id} style={{
                background: 'var(--bg-primary)', borderRadius: 8, padding: '10px 14px',
                fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ color: 'var(--text-primary)' }}>
                  {isLeave ? `${item.leave_type} · ${format(new Date(item.start_date), 'MMM d')}` : item.title}
                </span>
                <span className={`badge badge-${item.status}`}>{item.status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (result.action === 'rooms_available') {
    return (
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>🏢 Available Rooms</div>
        {result.data.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No rooms available for that time slot.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.data.slice(0, 4).map(r => (
              <div key={r.id} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                <strong>{r.name}</strong> · {r.building} · Capacity: {r.capacity}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (result.action === 'payroll_summary') {
    const { summary, recentStubs } = result.data;
    return (
      <div>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>💰 Payroll Summary</div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          {[['Annual Salary', `$${(summary.annualSalary||75000).toLocaleString()}`, 'var(--success)'],
            ['Next Pay Date', summary.nextPayDate ? format(new Date(summary.nextPayDate), 'MMM d') : 'Apr 30', 'var(--ucla-gold)'],
            ['YTD Net Pay', `$${(summary.ytdNetPay||36500).toLocaleString()}`, 'var(--text-primary)']
          ].map(([label, val, color]) => (
            <div key={label} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '10px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color }}>{val}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>→ Go to Payroll & Benefits for full pay stubs and timesheet</div>
      </div>
    );
  }

  if (result.action === 'timesheet_submitted') {
    return (
      <div>
        <div style={{ color: 'var(--success)', fontWeight: 600, marginBottom: 8 }}>✅ Timesheet submitted</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <div><strong>Reference:</strong> {result.data.reference}</div>
          <div><strong>Workday Ref:</strong> {result.data.workdayRef}</div>
          <div><strong>Status:</strong> Pending manager approval</div>
        </div>
      </div>
    );
  }

  if (result.action === 'benefits_summary') {
    const b = result.data;
    return (
      <div>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>❤️ Benefits Summary</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2 }}>
          <div><strong style={{ color: 'var(--text-primary)' }}>Health:</strong> {b.healthPlan} — ${b.premium}/mo</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Dental:</strong> {b.dental}</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Vision:</strong> {b.vision}</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>403(b) Balance:</strong> ${b.retirement.balance.toLocaleString()} (UCLA matches {b.retirement.universityMatch})</div>
          <div><strong style={{ color: 'var(--ucla-gold)' }}>Next enrollment:</strong> {b.nextEnrollment}</div>
        </div>
      </div>
    );
  }

  if (result.action === 'faq') {
    return (
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>💬 Fetching answer...</div>
        <FAQResult question={result.question} />
      </div>
    );
  }

  if (result.action === 'leave_balance') {
    const b = result.data;
    return (
      <div>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>📅 Leave Balance</div>
        <div style={{ display: 'flex', gap: 12 }}>
          {Object.entries(b).map(([type, val]) => (
            <div key={type} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '10px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>{val.remaining}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{type}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <pre style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'auto' }}>
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}

function FAQResult({ question }) {
  const [answer, setAnswer] = React.useState(null);
  React.useEffect(() => {
    faqAPI.ask(question).then(r => setAnswer(r.data.answer)).catch(() => setAnswer('Unable to fetch answer.'));
  }, [question]);

  if (!answer) return <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Thinking...</div>;
  return <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7 }}>{answer}</p>;
}

export default function VoicePage() {
  const [manualInput, setManualInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState([]);

  const handleTranscript = useCallback(async (text) => {
    if (!text.trim()) return;
    setProcessing(true);
    try {
      const { data } = await voiceAPI.execute(text);
      setHistory(h => [{
        id: Date.now(),
        transcript: text,
        intent: data.intent,
        humanReadable: data.parsed?.humanReadable,
        result: data.result,
        clarification: data.clarificationNeeded,
        timestamp: new Date(),
      }, ...h]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Voice command failed');
    } finally {
      setProcessing(false);
    }
  }, []);

  const { isListening, interimTranscript, transcript, error, isSupported, toggleListening, clearTranscript } = useVoice({
    onTranscript: handleTranscript,
    onError: (msg) => toast.error(msg),
  });

  const handleManualSubmit = async () => {
    if (!manualInput.trim() || processing) return;
    const text = manualInput.trim();
    setManualInput('');
    await handleTranscript(text);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Voice Assistant</h1>
        <p className="page-sub">Speak or type a command · Powered by GPT-3.5 + Web Speech API</p>
      </div>

      {/* Main voice panel */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 24px', gap: 20 }}>
          {/* Voice button */}
          <button
            className={`voice-btn ${isListening ? 'listening' : processing ? 'processing' : ''}`}
            onClick={toggleListening}
            disabled={processing || !isSupported}
            title={isListening ? 'Click to stop' : 'Click to speak'}
          >
            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
          </button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: isListening ? 'var(--danger)' : processing ? 'var(--ucla-gold)' : 'var(--text-secondary)' }}>
              {isListening ? '🔴 Listening...' : processing ? '⚙️ Processing...' : '🎙️ Tap to speak'}
            </div>
            {!isSupported && (
              <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>
                Voice not supported in this browser. Use Chrome or Edge.
              </div>
            )}
          </div>

          {/* Live transcript */}
          {(isListening || interimTranscript || transcript) && (
            <div className="transcript-box" style={{ width: '100%', maxWidth: 600 }}>
              {transcript && <span>{transcript}</span>}
              {interimTranscript && <span className="transcript-interim"> {interimTranscript}</span>}
              {!transcript && !interimTranscript && <span className="transcript-interim">Listening for speech...</span>}
            </div>
          )}
        </div>

        {/* Manual text input */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <label className="label">Or type a command</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="input"
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
              placeholder='e.g. "Book a room for tomorrow at 3pm"'
              disabled={processing}
            />
            <button className="btn btn-primary btn-icon" onClick={handleManualSubmit} disabled={!manualInput.trim() || processing}>
              {processing ? <RefreshCw size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={16} />}
            </button>
          </div>

          {/* Example chips */}
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 12 }}
                onClick={() => handleTranscript(ex)}
                disabled={processing}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Command history */}
      {history.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>
            Command History
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {history.map(h => (
              <div key={h.id} className="intent-result" style={{ borderLeftColor: h.result ? 'var(--success)' : 'var(--warning)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                      "{h.transcript}"
                    </div>
                    {h.humanReadable && (
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>→ {h.humanReadable}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <IntentBadge intent={h.intent} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {format(h.timestamp, 'h:mm a')}
                    </span>
                  </div>
                </div>
                {h.clarification ? (
                  <div style={{ fontSize: 13, color: 'var(--warning)', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <AlertCircle size={14} /> {h.clarification}
                  </div>
                ) : h.result ? (
                  <ResultDisplay result={h.result} intent={h.intent} />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
