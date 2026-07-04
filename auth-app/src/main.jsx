/**
 * src/main.jsx
 * -------------
 * React application entry-point.
 * Wraps the app in:
 * - GoogleOAuthProvider  (Google Identity Services)
 * - AuthProvider         (JWT + user state)
 * - BrowserRouter        (React Router for /login and /register)
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import './index.css';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Default route — redirect / to /login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
);
