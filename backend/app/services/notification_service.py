"""
WebSocket notification service.

The actual ConnectionManager lives in `routers/websocket.py`. This module
provides a thin wrapper so service code (bed_service) doesn't have to
import router modules directly — keeps the dependency direction clean.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from ..models import BedAvailability


if TYPE_CHECKING:
    from ..routers.websocket import ConnectionManager  # pragma: no cover


# Module-level reference, set in main.py during startup.
_manager: "ConnectionManager | None" = None


def set_manager(manager: "ConnectionManager") -> None:
    """Called from main.py to wire the singleton."""
    global _manager
    _manager = manager


def get_manager() -> "ConnectionManager | None":
    return _manager


async def push_bed_update(
    *, hospital_id: int, hospital_name: str, bed_row: BedAvailability
) -> None:
    """Broadcast a bed_count_updated event. No-op if WS manager not wired yet."""
    mgr = _manager
    if mgr is None:
        return
    payload = {
        "event": "bed_count_updated",
        "hospital_id": hospital_id,
        "hospital_name": hospital_name,
        "icu_available": bed_row.icu_available,
        "nicu_available": bed_row.nicu_available,
        "ccu_available": bed_row.ccu_available,
        "hdu_available": bed_row.hdu_available,
        "updated_at": bed_row.last_updated.isoformat() if bed_row.last_updated else None,
    }
    await mgr.broadcast(payload)


async def send_password_reset_email(email: str, token: str) -> None:
    """Stub — wire to SMTP / SES / SendGrid in production."""
    # In dev we just print so you can grab the token from the logs.
    import logging

    logging.getLogger(__name__).info(
        "Password reset email → %s | token=%s", email, token
    )


async def send_verification_email(email: str, hospital_name: str) -> None:
    """Stub — wire to SMTP in production."""
    import logging

    logging.getLogger(__name__).info(
        "Verification email → %s for hospital %s", email, hospital_name
    )