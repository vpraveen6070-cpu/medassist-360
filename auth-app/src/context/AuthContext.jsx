/**
 * src/context/AuthContext.jsx
 * ----------------------------
 * Global authentication state:
 * - Reads an existing token from localStorage on mount
 * - Exposes login(), logout(), and isAuthenticated helpers
 * - Provides the current user object to the entire tree
 */
import { createContext, useCallback, useEffect, useState } from 'react';
import { logoutUser } from '../api/auth';

export const AuthContext = createContext(null);

const TOKEN_KEY = 'medassist_token';
const USER_KEY  = 'medassist_user';

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? null);
  const [loading, setLoading] = useState(false);

  const isAuthenticated = Boolean(token && user);

  /** Persist token + user after a successful login / register / google auth */
  const login = useCallback((tokenResponse) => {
    const { access_token, user: userData } = tokenResponse;
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
  }, []);

  /** Clear state and notify the backend */
  const logout = useCallback(async () => {
    setLoading(true);
    await logoutUser();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  // Keep state in sync if another tab logs out
  useEffect(() => {
    function handleStorage(e) {
      if (e.key === TOKEN_KEY && !e.newValue) {
        setToken(null);
        setUser(null);
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
