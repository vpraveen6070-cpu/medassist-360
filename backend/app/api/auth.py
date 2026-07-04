"""
app/api/auth.py
────────────────
Authentication router — all /auth/* endpoints.

Endpoints
---------
POST /auth/register  — create a new local user
POST /auth/login     — email + password → JWT
POST /auth/google    — Google ID token → upsert user → JWT
POST /auth/logout    — stateless logout hint (client clears token)
GET  /auth/me        — return the currently authenticated user
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.security import (
    create_access_token,
    hash_password,
    verify_google_token,
    verify_password,
)
from app.db.models import User
from app.schemas.auth import (
    GoogleAuthRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─────────────────────────────────────────────────────────────────────────────
# POST /auth/register
# ─────────────────────────────────────────────────────────────────────────────
@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user with email & password",
)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """
    Create a new user account.

    - Rejects duplicate emails with a clear 409 error.
    - Stores the password as a bcrypt hash — plaintext is never persisted.
    - Returns a JWT immediately so the client is logged in right after signup.
    """
    # Check for existing email
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        auth_provider="local",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /auth/login
# ─────────────────────────────────────────────────────────────────────────────
@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login with email & password",
)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """
    Authenticate with email and password.

    Returns clear, distinct errors for:
    - Email not registered
    - Incorrect password
    - Account created via Google (no local password)
    """
    user = db.query(User).filter(User.email == payload.email).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address.",
        )

    if user.password_hash is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account was created with Google. Please use 'Continue with Google'.",
        )

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again.",
        )

    token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /auth/google
# ─────────────────────────────────────────────────────────────────────────────
@router.post(
    "/google",
    response_model=TokenResponse,
    summary="Login or register via Google OAuth 2.0",
)
def google_auth(
    payload: GoogleAuthRequest, db: Session = Depends(get_db)
) -> TokenResponse:
    """
    Exchange a Google ID token for an application JWT.

    Flow:
    1. Verify the ID token against Google's public keys.
    2. Extract: google_id, email, name, picture.
    3. If the user exists (by google_id or email) → log them in.
    4. If new → auto-create the account.
    5. Return our own JWT.
    """
    claims = verify_google_token(payload.id_token)
    if claims is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google token.",
        )

    google_id: str = claims["sub"]
    email: str = claims.get("email", "")
    name: str = claims.get("name", email.split("@")[0])
    picture: str | None = claims.get("picture")

    # Try to find existing user by Google ID first, then by email
    user = (
        db.query(User).filter(User.google_id == google_id).first()
        or db.query(User).filter(User.email == email).first()
    )

    if user is None:
        # Auto-register new Google user
        user = User(
            full_name=name,
            email=email,
            google_id=google_id,
            profile_picture=picture,
            auth_provider="google",
            password_hash=None,
        )
        db.add(user)
    else:
        # Update profile fields that may have changed
        user.google_id = google_id
        user.profile_picture = picture or user.profile_picture
        user.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /auth/logout
# ─────────────────────────────────────────────────────────────────────────────
@router.post(
    "/logout",
    summary="Logout (client should discard the JWT)",
)
def logout() -> dict:
    """
    Stateless logout hint.
    JWTs are self-contained so there is no server-side session to invalidate.
    The client must delete its stored token after calling this endpoint.
    """
    return {"message": "Logged out successfully. Please clear your local token."}


# ─────────────────────────────────────────────────────────────────────────────
# GET /auth/me
# ─────────────────────────────────────────────────────────────────────────────
@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the currently authenticated user",
)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """
    Protected endpoint — requires a valid Bearer JWT.
    Returns the full profile of the authenticated user.
    """
    return UserResponse.model_validate(current_user)
