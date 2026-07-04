/**
 * src/api/auth.js
 * ---------------
 * All authentication API calls.
 * Each function returns the response data directly so callers don't
 * have to dig into `response.data`.
 */
import client from './client';

/**
 * Register a new local user.
 * @param {{ full_name: string, email: string, password: string }} data
 * @returns {Promise<{ access_token: string, token_type: string, user: object }>}
 */
export async function registerUser(data) {
  const res = await client.post('/auth/register', data);
  return res.data;
}

/**
 * Log in with email & password.
 * @param {{ email: string, password: string }} data
 * @returns {Promise<{ access_token: string, token_type: string, user: object }>}
 */
export async function loginUser(data) {
  const res = await client.post('/auth/login', data);
  return res.data;
}

/**
 * Authenticate via Google — send the Google ID token to the backend.
 * @param {string} idToken  Google credential string from GIS
 * @returns {Promise<{ access_token: string, token_type: string, user: object }>}
 */
export async function googleAuth(idToken) {
  const res = await client.post('/auth/google', { id_token: idToken });
  return res.data;
}

/**
 * Fetch the currently authenticated user's profile.
 * Requires a valid JWT stored in localStorage.
 * @returns {Promise<object>}
 */
export async function getMe() {
  const res = await client.get('/auth/me');
  return res.data;
}

/**
 * Post a logout signal to the backend (stateless).
 * The caller must also clear localStorage.
 */
export async function logoutUser() {
  await client.post('/auth/logout').catch(() => {}); // ignore errors
}
