"""
app/schemas/auth.py
────────────────────
Pydantic v2 request / response schemas for the /auth/* endpoints.
All input schemas validate and sanitize data before it reaches the database.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# ── Requests ─────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    """Payload for POST /auth/register"""

    full_name: str = Field(..., min_length=2, max_length=128, examples=["Dr. Jane Doe"])
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_not_whitespace(cls, v: str) -> str:
        if v.strip() == "":
            raise ValueError("Password must not be blank.")
        return v


class LoginRequest(BaseModel):
    """Payload for POST /auth/login (email + password)"""

    email: EmailStr
    password: str = Field(..., min_length=1)


class GoogleAuthRequest(BaseModel):
    """Payload for POST /auth/google (ID token from Google Identity Services)"""

    id_token: str = Field(..., description="Google ID token returned after OAuth flow")


# ── Responses ────────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    """Standard token response returned after successful authentication."""

    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    """Safe user representation — never exposes password_hash."""

    id: int
    full_name: str
    email: str
    profile_picture: Optional[str]
    auth_provider: str
    created_at: datetime

    model_config = {"from_attributes": True}


# Re-export so TokenResponse.model_rebuild() finds UserResponse
TokenResponse.model_rebuild()
