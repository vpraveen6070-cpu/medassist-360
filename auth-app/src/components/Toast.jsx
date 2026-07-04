/**
 * src/components/Toast.jsx
 * -------------------------
 * Animated success / error notification that auto-dismisses.
 */
import { useEffect } from 'react';

/**
 * @param {{ message: string, type: 'success'|'error', onClose: () => void }} props
 */
export default function Toast({ message, type = 'error', onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  const icon = type === 'success' ? '✓' : '⚠';
  return (
    <div className={`toast toast--${type}`} role="alert" aria-live="polite">
      <span className="toast-icon">{icon}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Dismiss">✕</button>
    </div>
  );
}
