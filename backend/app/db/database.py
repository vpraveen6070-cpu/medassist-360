"""
app/db/database.py
───────────────────
SQLAlchemy engine + session factory.
Defaults to SQLite (file-based, zero-config).
Swap DATABASE_URL in .env to switch to PostgreSQL with zero code changes.
"""
from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings

settings = get_settings()

# SQLite needs check_same_thread=False; ignored by other DB drivers
_connect_args = (
    {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

engine = create_engine(settings.DATABASE_URL, connect_args=_connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


def init_db() -> None:
    """Create all tables that don't already exist (called at startup)."""
    # Import models here so SQLAlchemy registers them on Base.metadata
    import app.db.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
