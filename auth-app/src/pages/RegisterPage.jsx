/**
 * src/pages/RegisterPage.jsx
 * ---------------------------
 * Registration page with full validation, Google sign-up,
 * and automatic login after successful registration.
 */
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { googleAuth, registerUser } from '../api/auth';
import GoogleButton from '../components/GoogleButton';
import InputField from '../components/InputField';
import LoadingOverlay from '../components/LoadingOverlay';
import Toast from '../components/Toast';
import { useAuth } from '../hooks/useAuth';
import { useForm } from '../hooks/useForm';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const makeValidators = (values) => ({
  full_name: (v) => {
    if (!v || !v.trim()) return 'Full name is required.';
    if (v.trim().length < 2) return 'Name must be at least 2 characters.';
    return null;
  },
  email: (v) => {
    if (!v || !v.trim()) return 'Email is required.';
    if (!EMAIL_RE.test(v)) return 'Please enter a valid email address.';
    return null;
  },
  password: (v) => {
    if (!v) return 'Password is required.';
    if (v.length < 8) return 'Password must be at least 8 characters.';
    return null;
  },
  confirm_password: (v) => {
    if (!v) return 'Please confirm your password.';
    if (v !== values.password) return 'Passwords do not match.';
    return null;
  },
});

export default function RegisterPage() {
  const { login }   = useAuth();
  const [loading, setLoading]   = useState(false);
  const [loadMsg, setLoadMsg]   = useState('CREATING PROFILE...');
  const [toast, setToast]       = useState({ message: '', type: 'error' });

  const { values, errors, handleChange, handleBlur, validate } = useForm(
    { full_name: '', email: '', password: '', confirm_password: '' },
    // validators depend on values (for confirm_password cross-check)
    // so we rebuild them each render — useForm handles this correctly
    makeValidators({ password: '' }),
  );

  const showError   = (msg) => setToast({ message: msg, type: 'error' });
  const showSuccess = (msg) => setToast({ message: msg, type: 'success' });

  // Re-derive validators using current values so confirm_password check is live
  const validators = makeValidators(values);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Run validators inline with latest values
    let valid = true;
    for (const [field, fn] of Object.entries(validators)) {
      if (fn(values[field])) { valid = false; }
    }
    if (!validate()) return; // also sets error state

    try {
      setLoadMsg('CREATING PROFILE...');
      setLoading(true);
      const data = await registerUser({
        full_name: values.full_name.trim(),
        email: values.email,
        password: values.password,
      });
      login(data);
      showSuccess('Account created! Welcome to MedAssist 360.');
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirect') || '../index.html';
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 1200);
    } catch (err) {
      setLoading(false);
      const detail = err.response?.data?.detail;
      showError(detail || 'Registration failed. Please try again.');
    }
  };

  const handleGoogleSuccess = useCallback(async (accessToken) => {
    try {
      setLoadMsg('CONNECTING TO GOOGLE...');
      setLoading(true);
      const data = await googleAuth(accessToken);
      login(data);
      showSuccess('Google sign-up successful! Welcome!');
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
              Create <span className="text-gradient">Account</span>
            </h1>
            <p className="auth-subtitle">Join the medical intelligence network.</p>
          </div>

          {/* ── Form ── */}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <InputField
              id="reg-name"
              name="full_name"
              label="Full Name"
              placeholder="Dr. Jane Doe"
              value={values.full_name}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.full_name}
              autoComplete="name"
              required
            />
            <InputField
              id="reg-email"
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
              id="reg-password"
              name="password"
              label="Password"
              type="password"
              placeholder="Min. 8 characters"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.password}
              autoComplete="new-password"
              required
            />
            <InputField
              id="reg-confirm"
              name="confirm_password"
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              value={values.confirm_password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.confirm_password}
              autoComplete="new-password"
              required
            />

            <button
              id="registerSubmitBtn"
              type="submit"
              className="btn btn-primary btn-glow full-width"
              disabled={loading}
            >
              Create Account
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
            <span>Already a member?</span>
            <Link to="/login" className="auth-footer-link">Sign In securely</Link>
          </div>
        </div>
      </section>
    </>
  );
}
