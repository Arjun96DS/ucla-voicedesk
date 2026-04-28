import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomAPI } from '../services/api';
import { Search, DoorOpen } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function FeaturePill({ feature }) {
  const labels = { projector: '📽 Projector', whiteboard: '📝 Whiteboard', video_conferencing: '📹 Video Conf', dual_monitors: '🖥 Dual Monitors', smartboard: '🖊 Smartboard', catering_available: '🍽 Catering', stage: '🎤 Stage', standing_desks: '🧍 Standing Desks', monitor: '🖥 Monitor' };
  return <span style={{ fontSize: 11, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: 12, border: '1px solid var(--border)' }}>{labels[feature] || feature}</span>;
}

export default function RoomsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState({ date: '', startTime: '', endTime: '', capacity: '' });
  const [searched, setSearched] = useState(false);
  const [booking, setBooking] = useState(null);
  const [bookingTitle, setBookingTitle] = useState('');

  const { data: available, isFetching, refetch } = useQuery({
    queryKey: ['room-availability', search],
    queryFn: () => roomAPI.availability(search).then(r => r.data),
    enabled: false,
  });

  const { data: myBookings } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => roomAPI.myBookings().then(r => r.data),
  });

  const { mutate: bookRoom, isPending } = useMutation({
    mutationFn: () => roomAPI.book({
      roomId: booking.id,
      title: bookingTitle || 'Meeting',
      startTime: new Date(`${search.date}T${search.startTime}`).toISOString(),
      endTime: new Date(`${search.date}T${search.endTime}`).toISOString(),
      attendeeCount: parseInt(search.capacity) || 1,
    }),
    onSuccess: (r) => {
      toast.success(`Room booked! Ref: ${r.data.twentyfive_live_ref}`);
      setBooking(null);
      qc.invalidateQueries(['my-bookings']);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Booking failed'),
  });

  const { mutate: cancelBooking } = useMutation({
    mutationFn: (id) => roomAPI.cancelBooking(id),
    onSuccess: () => { toast.success('Booking cancelled'); qc.invalidateQueries(['my-bookings']); },
  });

  const handleSearch = () => {
    if (!search.date || !search.startTime || !search.endTime) {
      toast.error('Please fill in date and times');
      return;
    }
    setSearched(true);
    refetch();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Room Booking</h1>
        <p className="page-sub">Find and reserve conference rooms · Powered by 25Live</p>
      </div>

      {/* Search panel */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><span className="card-title">Find a Room</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label">Date</label>
            <input className="input" type="date" value={search.date} onChange={e => setSearch(s => ({ ...s, date: e.target.value }))} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label">Start Time</label>
            <input className="input" type="time" value={search.startTime} onChange={e => setSearch(s => ({ ...s, startTime: e.target.value }))} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label">End Time</label>
            <input className="input" type="time" value={search.endTime} onChange={e => setSearch(s => ({ ...s, endTime: e.target.value }))} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label">Min Capacity</label>
            <input className="input" type="number" min="1" value={search.capacity} onChange={e => setSearch(s => ({ ...s, capacity: e.target.value }))} placeholder="Any" />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSearch} disabled={isFetching}>
          <Search size={15} /> {isFetching ? 'Searching...' : 'Check Availability'}
        </button>
      </div>

      {/* Available rooms */}
      {searched && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">Available Rooms</span>
            {available?.available?.length > 0 && (
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{available.available.length} found</span>
            )}
          </div>
          {!available || available.available.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <DoorOpen size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
              <h3>No rooms available</h3>
              <p>Try a different time or smaller capacity</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {available.available.map(room => (
                <div key={room.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{room.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      {room.building} {room.room_number && `· Room ${room.room_number}`} · Capacity: {room.capacity}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {room.features?.map(f => <FeaturePill key={f} feature={f} />)}
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={() => setBooking(room)}>
                    Book Room
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirm booking modal */}
      {booking && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Confirm Booking</span>
              <button className="modal-close" onClick={() => setBooking(null)}>×</button>
            </div>
            <div style={{ marginBottom: 16, padding: '14px 16px', background: 'var(--bg-primary)', borderRadius: 8, fontSize: 14 }}>
              <strong>{booking.name}</strong><br />
              <span style={{ color: 'var(--text-secondary)' }}>{booking.building} · {format(new Date(`${search.date}T${search.startTime}`), 'MMM d, h:mm a')} – {format(new Date(`${search.date}T${search.endTime}`), 'h:mm a')}</span>
            </div>
            <div className="form-group">
              <label className="label">Meeting Title</label>
              <input className="input" value={bookingTitle} onChange={e => setBookingTitle(e.target.value)} placeholder="e.g. Team Standup" />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setBooking(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => bookRoom()} disabled={isPending}>
                {isPending ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My bookings */}
      <div className="card">
        <div className="card-header"><span className="card-title">My Bookings</span></div>
        {myBookings?.length ? (
          <table className="table">
            <thead><tr><th>Room</th><th>Meeting</th><th>Date & Time</th><th>Status</th><th>25Live Ref</th><th></th></tr></thead>
            <tbody>
              {myBookings.map(b => (
                <tr key={b.id}>
                  <td><div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{b.room_name}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.building}</div></td>
                  <td>{b.title}</td>
                  <td style={{ fontSize: 12 }}>{format(new Date(b.start_time), 'MMM d, h:mm a')}</td>
                  <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--ucla-blue-light)' }}>{b.twentyfive_live_ref}</td>
                  <td>
                    {b.status === 'confirmed' && new Date(b.start_time) > new Date() && (
                      <button className="btn btn-ghost btn-sm" onClick={() => cancelBooking(b.id)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state" style={{ padding: 32 }}>
            <DoorOpen size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
            <p>No upcoming room bookings</p>
          </div>
        )}
      </div>
    </div>
  );
}
