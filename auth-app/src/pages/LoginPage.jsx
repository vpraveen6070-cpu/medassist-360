/**
 * src/pages/LoginPage.jsx
 * ------------------------
 * Full login page with:
 * - Email + password form (with field validation)
 * - Show/hide password toggle
 * - "Continue with Google" button
 * - Forgot Password placeholder
 * - Link to Register
 * - Loading overlay on submit
 * - Toast for success/error feedback
 */
import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { googleAuth, loginUser } from '../api/auth';
import GoogleButton from '../components/GoogleButton';
import InputField from '../components/InputField';
import LoadingOverlay from '../components/LoadingOverlay';
import Toast from '../components/Toast';
import { useAuth } from '../hooks/useAuth';
import { useForm } from '../hooks/useForm';

// ── Field validators ──────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validators = {
  email: (v) => {
    if (!v || !v.trim()) return 'Email is required.';
    if (!EMAIL_RE.test(v)) return 'Please enter a valid email address.';
    return null;
  },
  password: (v) => {
    if (!v || !v.trim()) return 'Password is required.';
    return null;
  },
};

export default function LoginPage() {
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadMsg,  setLoadMsg] = useState('AUTHENTICATING...');
  const [toast, setToast]      = useState({ message: '', type: 'error' });

  const { values, errors, handleChange, handleBlur, validate } = useForm(
    { email: '', password: '' },
    validators,
  );

  const showError = (msg) => setToast({ message: msg, type: 'error' });
  const showSuccess = (msg) => setToast({ message: msg, type: 'success' });

  // ── Email / password submit ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoadMsg('AUTHENTICATING...');
      setLoading(true);
      const data = await loginUser({ email: values.email, password: values.password });
      login(data);
      showSuccess('Login successful! Redirecting…');
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirect') || '../index.html';
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 1200);
    } catch (err) {
      setLoading(false);
      const detail = err.response?.data?.detail;
      showError(detail || 'Login failed. Please try again.');
    }
  };

  // ── Google OAuth success ────────────────────────────────────────────────
  const handleGoogleSuccess = useCallback(async (accessToken) => {
    try {
      setLoadMsg('CONNECTING TO GOOGLE...');
      setLoading(true);
      const data = await googleAuth(accessToken);
      login(data);
      showSuccess('Google sign-in successful! Redirecting…');
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirect') || '../index.html';
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 1200);
    } catch (err) {
      setLoading(false);
      const detail = err.response?.data?.detail;
      showError(detail || 'Google sign-in failed. Please try again.');
    }
  }, [login]);

  return (
    <>
      <LoadingOverlay visible={loading} message={loadMsg} />
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'error' })}
      />

      <section className="auth-section">
        <div className="glass-panel auth-card">
          {/* ── Header ── */}
          <div className="auth-header">
            <a href="../index.html" className="brand-link" aria-label="Back to MedAssist 360">
              <span className="brand-icon">✧</span>
            </a>
            <h1 className="auth-title">
              Welcome <span className="text-gradient">Back</span>
            </h1>
            <p className="auth-subtitle">Secure access to your medical intelligence dashboard.</p>
          </div>

          {/* ── Form ── */}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <InputField
              id="login-email"
              name="email"
              label="Work Email"
              type="email"
              placeholder="e.g., doctor@hospital.com"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.email}
              autoComplete="email"
              required
            />
            <InputField
              id="login-password"
              name="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.password}
              autoComplete="current-password"
              required
            />

            {/* Options row */}
            <div className="form-options">
              <label className="checkbox-group">
                <input type="checkbox" defaultChecked />
                <span>Remember me</span>
              </label>
              <a href="#" className="link-muted" onClick={(e) => { e.preventDefault(); showError('Password reset coming soon.'); }}>
                Forgot Password?
              </a>
            </div>

            <button
              id="loginSubmitBtn"
              type="submit"
              className="btn btn-primary btn-glow full-width"
              disabled={loading}
            >
              Enter Dashboard
            </button>
          </form>

          {/* ── Divider ── */}
          <div className="or-divider"><span>or</span></div>

          {/* ── Google ── */}
          <GoogleButton
            onSuccess={handleGoogleSuccess}
            onError={showError}
            disabled={loading}
          />

          {/* ── Footer ── */}
          <div className="auth-footer">
            <span>Want to be a member?</span>
            <Link to="/register" className="auth-footer-link">Create an Account</Link>
          </div>
        </div>
      </section>
    </>
  );
}
