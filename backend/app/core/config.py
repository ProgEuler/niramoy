"""
Application configuration.

All env-driven values live here. Importing `settings` from anywhere gives
the same singleton.
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


load_dotenv()


class Settings(BaseSettings):
    """Runtime settings — populated from environment / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ───────────────────────────────────────────────────────────────
    app_name: str = Field(default="Niramoy Backend")
    app_version: str = Field(default="1.0.0")
    debug: bool = Field(default=False)

    # ── Database ──────────────────────────────────────────────────────────
    # Async driver for runtime, sync driver for Alembic.
    database_url: str = Field(
        default="postgresql+asyncpg://niramoy:1234@localhost:5432/niramoy_db"
    )
    database_url_sync: str = Field(
        default="postgresql+psycopg2://niramoy:1234@localhost:5432/niramoy_db"
    )

    # ── JWT ───────────────────────────────────────────────────────────────
    secret_key: str = Field(
        default="change-me-in-production-this-is-only-a-development-default-key-32+"
    )
    algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=60)
    refresh_token_expire_days: int = Field(default=7)
    password_reset_ttl_minutes: int = Field(default=60)

    # ── CORS ──────────────────────────────────────────────────────────────
    cors_origins: List[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "*"]
    )

    # ── Bed data freshness ────────────────────────────────────────────────
    stale_threshold_hours: int = Field(default=24)
    dashboard_stale_warning_hours: int = Field(default=6)
    moderation_drop_pct: float = Field(
        default=0.50,
        description=(
            "If available drops by more than this fraction of total capacity, "
            "the update is queued for moderation instead of going live."
        ),
    )

    # ── Email (placeholder — wire to a real provider in production) ───────
    smtp_host: str = Field(default="")
    smtp_port: int = Field(default=587)
    smtp_user: str = Field(default="")
    smtp_password: str = Field(default="")
    email_from: str = Field(default="no-reply@niramoy.bd")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings accessor — reads env once per process."""
    return Settings()


# Convenience module-level alias.
settings = get_settings()
