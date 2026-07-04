"""
app/main.py
────────────
FastAPI application entry-point.

- Registers middleware (CORS)
- Includes all API routers
- Creates database tables on startup via lifespan
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.core.config import get_settings
from app.db.database import init_db

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Run startup / shutdown logic using the modern lifespan pattern."""
    # ── Startup ───────────────────────────────────────────────────────────
    init_db()  # Create tables if they don't exist yet
    print("✅  Database tables ready.")
    yield
    # ── Shutdown ──────────────────────────────────────────────────────────
    # Nothing to tear down for SQLite; add cleanup here for connection pools.


app = FastAPI(
    title="MedAssist 360 — Auth API",
    description="Handles user registration, login, and Google OAuth authentication.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router)


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health() -> dict:
    return {"status": "ok", "service": "MedAssist 360 Auth API"}
