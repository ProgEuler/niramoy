"""Shared time helpers."""

from __future__ import annotations

from datetime import datetime, timezone


def now_utc() -> datetime:
    """Current time in UTC, timezone-aware."""
    return datetime.now(tz=timezone.utc)
