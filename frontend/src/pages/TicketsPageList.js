import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketAPI } from '../services/api';
import { Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status.replace('_', ' ')}</span>;
}

function NewTicketModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', category: '', priority: '' });

  const { mutate, isPending } = useMutation({
    mutationFn: () => ticketAPI.create(form),
    onSuccess: (r) => {
      toast.success(`Ticket created: ${r.data.servicenow_number}`);
      qc.invalidateQueries(['tickets']);
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">New IT Ticket</span>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-group">
          <label className="label">Title</label>
          <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief summary of the issue" />
        </div>
        <div className="form-group">
          <label className="label">Description</label>
          <textarea className="textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the problem in detail..." style={{ minHeight: 100 }} />
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="label">Category</label>
            <select className="select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">Auto-detect</option>
              {['hardware', 'software', 'network', 'access', 'email', 'printing', 'other'].map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Priority</label>
            <select className="select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="">Auto-detect</option>
              {['low', 'medium', 'high', 'critical'].map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => mutate()} disabled={isPending || !form.title || !form.description}>
            {isPending ? 'Creating...' : 'Create Ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TicketsPageList() {
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const qc = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => ticketAPI.list().then(r => r.data),
  });

  const filtered = tickets?.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'open') return ['open', 'in_progress'].includes(t.status);
    if (filter === 'resolved') return ['resolved', 'closed'].includes(t.status);
    return t.priority === filter;
  });

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">IT Help Desk</h1>
          <p className="page-sub">Submit and track IT support tickets · Integrated with ServiceNow</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'open', 'resolved', 'critical', 'high'].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)}
            style={{ textTransform: 'capitalize' }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : filtered?.length ? (
          <table className="table">
            <thead>
              <tr><th>Ticket</th><th>Category</th><th>Priority</th><th>Status</th><th>ServiceNow #</th><th>Created</th></tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.description}
                    </div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{t.category}</td>
                  <td><StatusBadge status={t.priority} /></td>
                  <td><StatusBadge status={t.status} /></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--ucla-blue-light)' }}>{t.servicenow_number}</td>
                  <td style={{ fontSize: 12 }}>{format(new Date(t.created_at), 'MMM d')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🎫</div>
            <h3>No tickets found</h3>
            <p>Create a ticket or try the Voice Assistant</p>
          </div>
        )}
      </div>

      {showModal && <NewTicketModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
