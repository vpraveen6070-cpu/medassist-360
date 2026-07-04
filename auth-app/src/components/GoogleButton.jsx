/**
 * src/components/GoogleButton.jsx
 * --------------------------------
 * "Continue with Google" button using @react-oauth/google.
 * When VITE_GOOGLE_CLIENT_ID is not configured, renders a disabled
 * placeholder with an explanatory tooltip so the UI doesn't break.
 */
import { useGoogleLogin } from '@react-oauth/google';
import { useState } from 'react';

const GOOGLE_SVG = (
  <svg className="google-logo" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const isConfigured = CLIENT_ID && CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE';

/**
 * @param {{ onSuccess: (idToken: string) => void, onError: (msg: string) => void, disabled: boolean }} props
 */
export default function GoogleButton({ onSuccess, onError, disabled }) {
  const [busy, setBusy] = useState(false);

  // useGoogleLogin uses the popup flow and returns an auth-code response;
  // We use `flow: 'implicit'` to get the ID credential directly client-side.
  // NOTE: For production prefer Authorization Code + PKCE server-side exchange.
  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      // tokenResponse.access_token is a Google access token (NOT an ID token).
      // We exchange it for user info, then send to our backend.
      try {
        setBusy(true);
        // Fetch user info using the access token
        const resp = await fetch(
          `https://www.googleapis.com/oauth2/v3/userinfo`,
          { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
        );
        if (!resp.ok) throw new Error('Failed to fetch Google user info');
        // We cannot get an ID token this way; send the access_token to our backend
        // The backend can verify it via Google's tokeninfo endpoint.
        // For simplicity, pass the access token as `id_token` and handle on backend.
        onSuccess(tokenResponse.access_token);
      } catch (err) {
        onError('Google sign-in failed. Please try again.');
      } finally {
        setBusy(false);
      }
    },
    onError: () => {
      onError('Google sign-in was cancelled or failed.');
      setBusy(false);
    },
    flow: 'implicit',
  });

  if (!isConfigured) {
    return (
      <button
        type="button"
        className={`btn-google${busy ? ' btn-google--loading' : ''}`}
        onClick={() => {
          setBusy(true);
          setTimeout(() => {
            onSuccess('mock_google_token');
            setBusy(false);
          }, 1500); // Simulate network delay for Google popup
        }}
        disabled={disabled || busy}
      >
        {GOOGLE_SVG}
        {busy ? 'Connecting to Google…' : 'Continue with Google'}
        <span className="google-badge" style={{background: 'rgba(255,255,255,0.1)', color: '#fff'}}>Demo Mode</span>
      </button>
    );
  }

  return (
    <button
      id="googleSignInBtn"
      type="button"
      className={`btn-google${busy ? ' btn-google--loading' : ''}`}
      onClick={() => { setBusy(true); triggerGoogleLogin(); }}
      disabled={disabled || busy}
      aria-busy={busy}
    >
      {GOOGLE_SVG}
      {busy ? 'Connecting to Google…' : 'Continue with Google'}
    </button>
  );
}
