"""
app/db/models.py
─────────────────
SQLAlchemy ORM model for the users table.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

# pyrefly: ignore [missing-import]
from sqlalchemy import DateTime, Integer, String, func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class User(Base):
    """
    Represents an application user.

    Supports two authentication providers:
      - "local": email + bcrypt-hashed password
      - "google": Google OAuth (password_hash is NULL)
    """

    __tablename__ = "users"

    # ── Primary key ──────────────────────────────────────────────────────────
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # ── Identity ─────────────────────────────────────────────────────────────
    full_name: Mapped[str] = mapped_column(String(128), nullable=False)
    email: Mapped[str] = mapped_column(
        String(256), unique=True, index=True, nullable=False
    )

    # ── Auth ─────────────────────────────────────────────────────────────────
    # NULL for Google-only accounts
    password_hash: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    # NULL for local accounts
    google_id: Mapped[Optional[str]] = mapped_column(
        String(256), unique=True, nullable=True
    )

    # "local" | "google"
    auth_provider: Mapped[str] = mapped_column(String(32), default="local")

    # ── Profile ───────────────────────────────────────────────────────────────
    profile_picture: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # ── Timestamps ───────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} provider={self.auth_provider!r}>"
