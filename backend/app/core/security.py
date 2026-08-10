"""
Security primitives: password hashing + JWT encode/decode.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import settings
from .time import now_utc


# bcrypt has a 72-byte input cap; passlib truncates safely by default.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Passwords ───────────────────────────────────────────────────────────


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        # Malformed hash (wrong algorithm, truncated, etc.) — always fail.
        return False


# ── JWT ─────────────────────────────────────────────────────────────────


def _now() -> datetime:
    return now_utc()


def create_access_token(
    *,
    sub: str,
    role: str,
    hospital_id: Optional[int] = None,
    email: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Build a short-lived access token with role + optional hospital_id claim."""
    expire = _now() + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload: Dict[str, Any] = {
        "sub": str(sub),
        "role": role,
        "exp": expire,
        "iat": _now(),
        "type": "access",
    }
    if hospital_id is not None:
        payload["hospital_id"] = int(hospital_id)
    if email is not None:
        payload["email"] = email
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(
    *,
    sub: str,
    role: str,
    hospital_id: Optional[int] = None,
    email: Optional[str] = None,
) -> str:
    expire = _now() + timedelta(days=settings.refresh_token_expire_days)
    payload: Dict[str, Any] = {
        "sub": str(sub),
        "role": role,
        "exp": expire,
        "iat": _now(),
        "type": "refresh",
    }
    if hospital_id is not None:
        payload["hospital_id"] = int(hospital_id)
    if email is not None:
        payload["email"] = email
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_password_reset_token(*, sub: str, email: str) -> str:
    expire = _now() + timedelta(minutes=settings.password_reset_ttl_minutes)
    payload = {
        "sub": str(sub),
        "email": email,
        "exp": expire,
        "iat": _now(),
        "type": "password_reset",
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> Dict[str, Any]:
    """Decode + validate a JWT. Raises JWTError on any failure."""
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])


def safe_decode(token: str) -> Optional[Dict[str, Any]]:
    """Return payload dict or None. Never raises."""
    try:
        return decode_token(token)
    except JWTError:
        return None
