import axios from 'axios';
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
export const api = axios.create({ baseURL, withCredentials: true, timeout: 15000, headers: { 'Content-Type': 'application/json' } });
let csrfTokenMemory = '';
export function setCsrfToken(value) { csrfTokenMemory = typeof value === 'string' ? value : ''; }
function getCookie(name) {
  if (typeof document === 'undefined') return '';
  const entry = document.cookie.split('; ').find((value) => value.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : '';
}
api.interceptors.request.use((config) => {
  if (!['get', 'head', 'options'].includes(String(config.method || 'get').toLowerCase())) {
    const csrf = csrfTokenMemory || getCookie('staffsync_csrf');
    if (csrf) config.headers['X-CSRF-Token'] = csrf;
  }
  return config;
});
export const payload = (response) => response.data?.data ?? {};
export function readableError(error) {
  return error?.response?.data?.message || (error?.code === 'ECONNABORTED' ? 'The request timed out. Try again.' : 'Could not reach the StaffSync API. Check that the backend is running.');
}
