import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

/** Turns any axios/network error into a single user-friendly message. */
export function getErrorMessage(error) {
  if (error.response) {
    const { data, status } = error.response;
    if (Array.isArray(data?.errors) && data.errors.length) return data.errors.join('. ');
    if (data?.message) return data.message;
    return `Request failed (HTTP ${status})`;
  }
  if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (error.request) return 'Network error. Please check your connection and that the server is running.';
  return error.message || 'Something went wrong';
}

/** Unwraps the backend envelope { success, message, data } and returns `data`. */
export const unwrap = (response) => response.data.data;

/**
 * Wires the axios instance to the Redux store without importing it (avoids a circular import):
 * attaches the JWT and forces logout when the API answers 401 on a protected call.
 */
export function attachInterceptors({ getToken, onUnauthorized }) {
  api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      const isCredentialCall = /\/auth\/(login|register)/.test(error.config?.url ?? '');
      if (error.response?.status === 401 && !isCredentialCall) onUnauthorized();
      return Promise.reject(error);
    },
  );
}

/** Downloads a server-generated file (CSV export) through the authenticated client. */
export async function downloadFile(path, params, filename) {
  const response = await api.get(path, { params, responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default api;
