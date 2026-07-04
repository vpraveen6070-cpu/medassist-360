/**
 * src/components/LoadingOverlay.jsx
 * ----------------------------------
 * Full-screen capsule loader matching the existing MedAssist 360 style.
 */
export default function LoadingOverlay({ visible, message = 'AUTHENTICATING...' }) {
  return (
    <div className={`loading-overlay${visible ? ' loading-overlay--visible' : ''}`} aria-hidden={!visible}>
      <div className="capsule-loader">
        <div className="capsule-half white-half">
          {[0.1, 0.3, 0.5, 0.2, 0.4].map((d, i) => (
            <div key={i} className="ball white-ball" style={{ animationDelay: `${d}s` }} />
          ))}
        </div>
        <div className="capsule-half red-half">
          {[0.2, 0.4, 0.1, 0.5, 0.7].map((d, i) => (
            <div key={i} className="ball red-ball" style={{ animationDelay: `${d}s` }} />
          ))}
        </div>
      </div>
      <p className="loading-text">{message}</p>
    </div>
  );
}
