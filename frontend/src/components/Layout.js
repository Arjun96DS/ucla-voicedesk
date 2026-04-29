import React, { useState, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useWakeWord } from '../hooks/useWakeWord';
import {
  Mic, LayoutDashboard, Calendar, Ticket, DoorOpen,
  HelpCircle, LogOut, DollarSign, Radio
} from 'lucide-react';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/voice', icon: Mic, label: 'Voice Assistant', gold: true },
  { to: '/leave', icon: Calendar, label: 'Leave Requests' },
  { to: '/tickets', icon: Ticket, label: 'IT Help Desk' },
  { to: '/rooms', icon: DoorOpen, label: 'Room Booking' },
  { to: '/payroll', icon: DollarSign, label: 'Payroll & Benefits' },
  { to: '/faq', icon: HelpCircle, label: 'Campus FAQ' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [wakeDetectedLocal, setWakeDetectedLocal] = useState(false);

  const handleWake = useCallback(() => {
    setWakeDetectedLocal(true);
    setTimeout(() => setWakeDetectedLocal(false), 3000);
    navigate('/voice');
  }, [navigate]);

  const { isPassiveListening, wakeDetected } = useWakeWord({
    onWake: handleWake,
    enabled: false,
  });

  const active = wakeDetected || wakeDetectedLocal;

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="brand">
            <div className="brand-icon" style={active ? { background: 'var(--danger)' } : {}}>
              🎙️
            </div>
            <div>
              <div className="brand-text">VoiceDesk</div>
              <div className="brand-sub">UCLA Campus Assistant</div>
            </div>
          </div>
          <div style={{
            marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, padding: '4px 10px', borderRadius: 20, width: 'fit-content',
            background: 'var(--bg-primary)',
            color: active ? 'var(--danger)' : isPassiveListening ? 'var(--success)' : 'var(--text-muted)',
          }}>
            <Radio size={10} />
            {active ? '🎙️ Wake word detected!' : isPassiveListening ? 'Say "Hey VoiceDesk"' : 'Wake word off'}
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {NAV.map(({ to, icon: Icon, label, gold }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              style={({ isActive }) => gold && isActive ? { color: 'var(--ucla-gold)' } : {}}
            >
              <Icon className="nav-icon" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-pill" style={{ marginBottom: 8 }}>
            <div className="user-avatar">{initials}</div>
            <div>
              <div className="user-name">{user?.name || 'User'}</div>
              <div className="user-dept">{user?.department || 'UCLA'}</div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: '100%' }}
            onClick={() => { logout(); navigate('/login'); }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {active && (
          <div style={{
            position: 'fixed', top: 20, right: 20, zIndex: 9999,
            background: 'var(--danger)', color: 'white',
            padding: '12px 20px', borderRadius: 12,
            fontWeight: 700, fontSize: 14,
            boxShadow: '0 4px 24px rgba(248,81,73,0.5)',
          }}>
            🎙️ Hey VoiceDesk — I'm listening!
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
