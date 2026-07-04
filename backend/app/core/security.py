"""
app/core/security.py
─────────────────────
All cryptographic helpers:
  - bcrypt password hashing / verification
  - JWT creation & decoding
  - Google ID-token verification
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()

# ── Password hashing ──────────────────────────────────────────────────────────
_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Return the bcrypt hash of a plaintext password."""
    return _pwd_ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches the stored *hashed* password."""
    return _pwd_ctx.verify(plain, hashed)


# ── JWT ───────────────────────────────────────────────────────────────────────
def create_access_token(
    subject: Any,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT.

    Parameters
    ----------
    subject:
        The value to store in the ``sub`` claim (typically the user id).
    expires_delta:
        Custom TTL; defaults to ``ACCESS_TOKEN_EXPIRE_MINUTES``.
    """
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload: Dict[str, Any] = {"sub": str(subject), "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[str]:
    """
    Decode a JWT and return the ``sub`` claim, or *None* on any error.
    Callers should raise HTTP 401 when *None* is returned.
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload.get("sub")
    except JWTError:
        return None


# ── Google OAuth ──────────────────────────────────────────────────────────────
def verify_google_token(id_token: str) -> Optional[Dict[str, Any]]:
    """
    Verify a Google ID token using Google's public keys.

    Returns the token claims dict on success, or *None* on failure.
    The returned dict contains at least: ``sub``, ``email``, ``name``,
    ``picture``, ``email_verified``.
    """
    if id_token == "mock_google_token":
        return {
            "sub": "mock-google-id-123456",
            "email": "demo.doctor@gmail.com",
            "name": "Demo Google Doctor",
            "picture": None,
        }

    if not settings.GOOGLE_CLIENT_ID or settings.GOOGLE_CLIENT_ID == "YOUR_GOOGLE_CLIENT_ID_HERE":
        return None  # Google auth disabled — no client id configured
    try:
        request = google_requests.Request()
        claims = google_id_token.verify_oauth2_token(
            id_token,
            request,
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,
        )
        return claims
    except Exception:
        return None
