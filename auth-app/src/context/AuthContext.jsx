import { createContext, useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const isAuthenticated = Boolean(user);

  /**
   * We no longer need to manually set user data in a login method
   * since Firebase automatically handles the state.
   */
  const login = useCallback(() => {
    // Left empty for compatibility if components still call it directly,
    // though Firebase's signInWith... methods will automatically trigger onAuthStateChanged.
  }, []);

  /** Sign out from Firebase */
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
