import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { leaveAPI, ticketAPI, roomAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Mic, Calendar, Ticket, DoorOpen, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status.replace('_', ' ')}</span>;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: leaveRequests } = useQuery({
    queryKey: ['leave'],
    queryFn: () => leaveAPI.list().then(r => r.data),
  });

  const { data: tickets } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => ticketAPI.list().then(r => r.data),
  });

  const { data: bookings } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => roomAPI.myBookings().then(r => r.data),
  });

  const { data: balance } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: () => leaveAPI.balance().then(r => r.data),
  });

  const pendingLeave = leaveRequests?.filter(l => l.status === 'pending').length || 0;
  const openTickets = tickets?.filter(t => ['open', 'in_progress'].includes(t.status)).length || 0;
  const upcomingBookings = bookings?.filter(b => new Date(b.start_time) > new Date()).length || 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{greeting}, {firstName} 👋</h1>
        <p className="page-sub">Here's what's happening at UCLA today · {format(new Date(), 'EEEE, MMMM d')}</p>
      </div>

      {/* Voice CTA */}
      <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, var(--ucla-blue) 0%, var(--ucla-blue-dark) 100%)', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 6 }}>
              🎙️ Try Voice Commands
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, maxWidth: 480 }}>
              "Submit a leave request for next Friday" · "Create an IT ticket — WiFi is down" · "Book a conference room for Thursday at 2pm"
            </p>
          </div>
          <Link to="/voice" className="btn btn-gold btn-lg" style={{ flexShrink: 0 }}>
            <Mic size={18} /> Open Voice
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Leave Balance</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{balance?.vacation?.remaining ?? '—'}</div>
          <div className="stat-sub">vacation days remaining</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Leave</div>
          <div className="stat-value" style={{ color: pendingLeave > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>{pendingLeave}</div>
          <div className="stat-sub">awaiting approval</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Open Tickets</div>
          <div className="stat-value" style={{ color: openTickets > 0 ? 'var(--danger)' : 'var(--success)' }}>{openTickets}</div>
          <div className="stat-sub">IT issues</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Upcoming Rooms</div>
          <div className="stat-value" style={{ color: 'var(--ucla-blue-light)' }}>{upcomingBookings}</div>
          <div className="stat-sub">bookings scheduled</div>
        </div>
      </div>

      {/* Recent activity grid */}
      <div className="grid-2" style={{ gap: 20 }}>
        {/* Recent leave */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} style={{ color: 'var(--ucla-blue-light)' }} /> Recent Leave
            </span>
            <Link to="/leave" className="btn btn-ghost btn-sm">View all <ArrowRight size={12} /></Link>
          </div>
          {leaveRequests?.slice(0, 4).length ? (
            <table className="table">
              <tbody>
                {leaveRequests.slice(0, 4).map(l => (
                  <tr key={l.id}>
                    <td style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>{l.leave_type}</td>
                    <td>{format(new Date(l.start_date), 'MMM d')}</td>
                    <td><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state" style={{ padding: 24 }}>
              <Calendar size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
              <p>No leave requests yet</p>
            </div>
          )}
        </div>

        {/* Recent tickets */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ticket size={16} style={{ color: 'var(--ucla-blue-light)' }} /> Recent Tickets
            </span>
            <Link to="/tickets" className="btn btn-ghost btn-sm">View all <ArrowRight size={12} /></Link>
          </div>
          {tickets?.slice(0, 4).length ? (
            <table className="table">
              <tbody>
                {tickets.slice(0, 4).map(t => (
                  <tr key={t.id}>
                    <td style={{ color: 'var(--text-primary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.title}
                    </td>
                    <td><StatusBadge status={t.priority} /></td>
                    <td><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state" style={{ padding: 24 }}>
              <Ticket size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
              <p>No tickets yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><span className="card-title">Quick Actions</span></div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/voice" className="btn btn-primary"><Mic size={14} /> Voice Command</Link>
          <Link to="/leave" className="btn btn-ghost"><Calendar size={14} /> Request Leave</Link>
          <Link to="/tickets" className="btn btn-ghost"><Ticket size={14} /> Create IT Ticket</Link>
          <Link to="/rooms" className="btn btn-ghost"><DoorOpen size={14} /> Book a Room</Link>
        </div>
      </div>
    </div>
  );
}
