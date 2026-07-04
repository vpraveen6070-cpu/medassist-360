/**
 * src/api/client.js
 * -----------------
 * Axios instance pre-configured with:
 * - Base URL pointing to the FastAPI backend
 * - Request interceptor that injects the stored JWT as a Bearer token
 * - Response interceptor that clears the token on 401 (session expired)
 */
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000, // 15 s
});

// ── Request interceptor — attach JWT ─────────────────────────────────────────
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('medassist_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — handle expired tokens ─────────────────────────────
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear local storage
      localStorage.removeItem('medassist_token');
      localStorage.removeItem('medassist_user');
    }
    return Promise.reject(error);
  },
);

export default client;
