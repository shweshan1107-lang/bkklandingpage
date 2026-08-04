const TOKEN_KEY = 'bkk_admin_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    const error = new Error(payload.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

export const api = {
  publicSite: () => request('/api/public/site'),
  login: (credentials) => request('/api/admin/login', { method: 'POST', body: JSON.stringify(credentials) }),
  adminSite: () => request('/api/admin/site'),
  saveSettings: (data) => request('/api/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),
  createPromotion: (data) => request('/api/admin/promotions', { method: 'POST', body: JSON.stringify(data) }),
  updatePromotion: (id, data) => request(`/api/admin/promotions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePromotion: (id) => request(`/api/admin/promotions/${id}`, { method: 'DELETE' }),
  createEvent: (data) => request('/api/admin/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id, data) => request(`/api/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (id) => request(`/api/admin/events/${id}`, { method: 'DELETE' }),
  upload: (file) => {
    const body = new FormData();
    body.append('image', file);
    return request('/api/admin/upload', { method: 'POST', body });
  }
};
