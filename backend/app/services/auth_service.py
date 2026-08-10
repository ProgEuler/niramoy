"""
Auth service — login, refresh, forgot/reset password, registration helpers.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from jose import JWTError
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from ..core.time import now_utc
from ..core.utils import enum_value
from ..models import User


def _now() -> datetime:
    return now_utc()


async def authenticate_user(
    db: AsyncSession, *, email: str, password: str
) -> Optional[User]:
    """
    Returns User if (email, password) match AND user is active.
    Returns None for *any* failure — caller must return 401 without revealing
    whether email or password was wrong.
    """
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        # Run a dummy verify to make timing roughly equal.
        verify_password(password, "$2b$12$invalidhashforthemingmitigation............")
        return None
    if not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


async def mark_login(db: AsyncSession, user: User) -> None:
    await db.execute(
        update(User).where(User.id == user.id).values(last_login=_now())
    )


def build_token_pair(user: User) -> dict:
    expires = _now().timestamp() + 60 * 60  # approximate for response
    expires_at = datetime.fromtimestamp(expires, tz=timezone.utc)
    role_str = enum_value(user.role)
    access = create_access_token(
        sub=str(user.id),
        role=role_str,
        hospital_id=user.hospital_id,
        email=user.email,
    )
    refresh = create_refresh_token(
        sub=str(user.id),
        role=role_str,
        hospital_id=user.hospital_id,
        email=user.email,
    )
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "role": user.role,
        "hospital_id": user.hospital_id,
        "expires_at": expires_at,
        "username": user.username,
    }


async def refresh_tokens(db: AsyncSession, refresh_token: str) -> Optional[dict]:
    try:
        payload = decode_token(refresh_token)
    except JWTError:
        return None
    if payload.get("type") != "refresh":
        return None
    sub = payload.get("sub")
    if sub is None:
        return None
    try:
        user_id = int(sub)
    except (TypeError, ValueError):
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        return None
    return build_token_pair(user)


async def find_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def register_user(
    db: AsyncSession,
    *,
    username: str,
    email: str,
    password: str,
) -> User:
    """
    Step 1 of the new hospital-admin registration flow.

    Creates a hospital_admin user with no hospital yet (hospital_id=None).
    Raises ValueError with a human-readable message on conflict.
    """
    from ..models import UserRole  # local import to avoid circular

    normalized_email = email.strip().lower()
    normalized_username = username.strip().lower()

    existing_email = await db.execute(
        select(User).where(User.email == normalized_email)
    )
    if existing_email.scalar_one_or_none() is not None:
        raise ValueError("Email already registered")

    existing_username = await db.execute(
        select(User).where(User.username == normalized_username)
    )
    if existing_username.scalar_one_or_none() is not None:
        raise ValueError("Username already taken")

    user = User(
        username=username.strip(),
        email=normalized_email,
        password_hash=hash_password(password),
        role=UserRole.hospital_admin,
        hospital_id=None,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    return user


async def issue_reset_token(user: User) -> str:
    return create_password_reset_token(sub=str(user.id), email=user.email)


async def consume_reset_token(db: AsyncSession, token: str, new_password: str) -> bool:
    try:
        payload = decode_token(token)
    except JWTError:
        return False
    if payload.get("type") != "password_reset":
        return False
    sub = payload.get("sub")
    if sub is None:
        return False
    try:
        user_id = int(sub)
    except (TypeError, ValueError):
        return False
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        return False
    new_hash = hash_password(new_password)
    await db.execute(
        update(User).where(User.id == user.id).values(password_hash=new_hash)
    )
    return True