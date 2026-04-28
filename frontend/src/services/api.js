import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Inject JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vd_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('vd_token');
      localStorage.removeItem('vd_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// ── Voice ─────────────────────────────────────────────────────────────────────
export const voiceAPI = {
  execute: (transcript) => api.post('/voice/execute', { transcript }),
  parse: (transcript) => api.post('/voice/parse', { transcript }),
};

// ── Leave ─────────────────────────────────────────────────────────────────────
export const leaveAPI = {
  list: () => api.get('/leave'),
  get: (id) => api.get(`/leave/${id}`),
  submit: (data) => api.post('/leave', data),
  cancel: (id) => api.patch(`/leave/${id}/cancel`),
  balance: () => api.get('/leave/meta/balance'),
};

// ── Tickets ───────────────────────────────────────────────────────────────────
export const ticketAPI = {
  list: () => api.get('/tickets'),
  get: (id) => api.get(`/tickets/${id}`),
  create: (data) => api.post('/tickets', data),
  updateStatus: (id, status) => api.patch(`/tickets/${id}/status`, { status }),
};

// ── Rooms ─────────────────────────────────────────────────────────────────────
export const roomAPI = {
  list: () => api.get('/rooms'),
  availability: (params) => api.get('/rooms/availability', { params }),
  myBookings: () => api.get('/rooms/my-bookings'),
  book: (data) => api.post('/rooms/book', data),
  cancelBooking: (id) => api.delete(`/rooms/bookings/${id}`),
};

// ── Payroll ───────────────────────────────────────────────────────────────────
export const payrollAPI = {
  stubs: () => api.get('/payroll/stubs'),
  stub: (id) => api.get(`/payroll/stubs/${id}`),
  summary: () => api.get('/payroll/summary'),
  timesheet: () => api.get('/payroll/timesheet'),
  submitTimesheet: () => api.post('/payroll/timesheet/submit'),
  benefits: () => api.get('/payroll/benefits'),
};

// ── FAQ ───────────────────────────────────────────────────────────────────────
export const faqAPI = {
  ask: (question) => api.post('/faq/ask', { question }),
  common: () => api.get('/faq/common'),
};

export default api;
