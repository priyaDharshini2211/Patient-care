import api, { downloadFile, unwrap } from './client';

const compact = (params) => Object.fromEntries(Object.entries(params ?? {}).filter(([, value]) => value !== '' && value !== null && value !== undefined));

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials).then(unwrap),
  register: (payload) => api.post('/auth/register', payload).then(unwrap),
  me: () => api.get('/auth/me').then(unwrap),
  updateProfile: (payload) => api.patch('/auth/me', payload).then(unwrap),
  changePassword: (payload) => api.post('/auth/change-password', payload).then(unwrap),
};

export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary').then(unwrap),
};

export const patientsApi = {
  list: (params) => api.get('/patients', { params: compact(params) }).then(unwrap),
  get: (id) => api.get(`/patients/${id}`).then(unwrap),
  create: (payload) => api.post('/patients', payload).then(unwrap),
  update: (id, payload) => api.put(`/patients/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/patients/${id}`).then(unwrap),
  exportCsv: (params) => downloadFile('/patients/export', compact(params), 'patients.csv'),
};

export const billsApi = {
  list: (params) => api.get('/bills', { params: compact(params) }).then(unwrap),
  stats: () => api.get('/bills/stats').then(unwrap),
  get: (id) => api.get(`/bills/${id}`).then(unwrap),
  create: (payload) => api.post('/bills', payload).then(unwrap),
  update: (id, payload) => api.put(`/bills/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/bills/${id}`).then(unwrap),
  exportCsv: (params) => downloadFile('/bills/export', compact(params), 'bills.csv'),
};

export const paymentsApi = {
  createOrder: (billId) => api.post('/payments/orders', { billId }).then(unwrap),
  verify: (payload) => api.post('/payments/verify', payload).then(unwrap),
  reportFailure: (payload) => api.post('/payments/failed', payload).then(unwrap),
  list: (params) => api.get('/payments', { params: compact(params) }).then(unwrap),
  get: (id) => api.get(`/payments/${id}`).then(unwrap),
};
