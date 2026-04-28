import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { faqAPI } from '../services/api';
import { Send, RefreshCw } from 'lucide-react';

function QuestionCard({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'var(--bg-card)', border: 'none', padding: '14px 18px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}
      >
        {q}
        <span style={{ color: 'var(--text-muted)', fontSize: 18, lineHeight: 1 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ padding: '14px 18px', background: 'var(--bg-primary)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, borderTop: '1px solid var(--border)' }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: common } = useQuery({
    queryKey: ['faq-common'],
    queryFn: () => faqAPI.common().then(r => r.data),
  });

  const handleAsk = async () => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setAsked(q);
    setAnswer('');
    setLoading(true);
    setQuestion('');
    try {
      const { data } = await faqAPI.ask(q);
      setAnswer(data.answer);
    } catch {
      setAnswer('Sorry, I could not find an answer. Please contact the relevant UCLA department directly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Campus FAQ</h1>
        <p className="page-sub">Ask anything about UCLA campus operations, HR, IT, and benefits</p>
      </div>

      {/* Ask box */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><span className="card-title">Ask a Question</span></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="input"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk()}
            placeholder='e.g. "When is benefits enrollment?" or "How do I reset my VPN?"'
            disabled={loading}
          />
          <button className="btn btn-primary btn-icon" onClick={handleAsk} disabled={!question.trim() || loading}>
            {loading ? <RefreshCw size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={16} />}
          </button>
        </div>

        {/* Answer */}
        {asked && (
          <div style={{ marginTop: 20, padding: '16px 20px', background: 'var(--bg-primary)', borderRadius: 10, borderLeft: '3px solid var(--ucla-blue)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
              Q: {asked}
            </div>
            {loading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Searching campus knowledge base...</div>
            ) : (
              <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7 }}>{answer}</div>
            )}
          </div>
        )}
      </div>

      {/* Common questions */}
      <div className="card">
        <div className="card-header"><span className="card-title">Common Questions</span></div>
        {common?.map((item, i) => (
          <QuestionCard key={i} q={item.q} a={item.a} />
        ))}
      </div>
    </div>
  );
}
