import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveAPI } from '../services/api';
import { Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function NewLeaveModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ leaveType: 'vacation', startDate: '', endDate: '', reason: '' });

  const { mutate, isPending } = useMutation({
    mutationFn: () => leaveAPI.submit({ ...form }),
    onSuccess: (r) => {
      toast.success(`Leave submitted! Ref: ${r.data.workday_reference}`);
      qc.invalidateQueries(['leave']);
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">New Leave Request</span>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-group">
          <label className="label">Leave Type</label>
          <select className="select" value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))}>
            {['vacation', 'sick', 'personal', 'bereavement', 'other'].map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="label">Start Date</label>
            <input className="input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">End Date</label>
            <input className="input" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label className="label">Reason (optional)</label>
          <textarea className="textarea" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Brief description..." />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => mutate()} disabled={isPending || !form.startDate || !form.endDate}>
            {isPending ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeavePageList() {
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['leave'],
    queryFn: () => leaveAPI.list().then(r => r.data),
  });

  const { data: balance } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: () => leaveAPI.balance().then(r => r.data),
  });

  const { mutate: cancel } = useMutation({
    mutationFn: (id) => leaveAPI.cancel(id),
    onSuccess: () => { toast.success('Request cancelled'); qc.invalidateQueries(['leave']); },
    onError: () => toast.error('Cannot cancel this request'),
  });

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Leave Requests</h1>
          <p className="page-sub">Manage vacation, sick, and personal time · Synced with Workday</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Request
        </button>
      </div>

      {/* Balance cards */}
      {balance && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {Object.entries(balance).filter(([k]) => k !== 'asOf').map(([type, val]) => (
            <div className="stat-card" key={type}>
              <div className="stat-label" style={{ textTransform: 'capitalize' }}>{type} days</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>{val.remaining}</div>
              <div className="stat-sub">{val.used} used of {val.total}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header"><span className="card-title">All Requests</span></div>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : requests?.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Type</th><th>Start</th><th>End</th><th>Reason</th><th>Status</th><th>Ref</th><th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>{r.leave_type}</td>
                  <td>{format(new Date(r.start_date), 'MMM d, yyyy')}</td>
                  <td>{format(new Date(r.end_date), 'MMM d, yyyy')}</td>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason || '—'}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.workday_reference}</td>
                  <td>
                    {r.status === 'pending' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => cancel(r.id)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3>No leave requests</h3>
            <p>Submit your first request above or use the Voice Assistant</p>
          </div>
        )}
      </div>

      {showModal && <NewLeaveModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
