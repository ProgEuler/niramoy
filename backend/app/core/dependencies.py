"""
FastAPI dependencies — DB session, current user, role guards.
"""

from __future__ import annotations

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import User, UserRole
from .security import decode_token


# SCHEME — auto_error=False so we can return our own 401 shape.
bearer_scheme = HTTPBearer(auto_error=False)


_CRED_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Decode JWT, return active user. 401 on any failure."""
    if credentials is None:
        raise _CRED_ERROR

    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise _CRED_ERROR

    if payload.get("type") != "access":
        raise _CRED_ERROR

    sub = payload.get("sub")
    if sub is None:
        raise _CRED_ERROR

    try:
        user_id = int(sub)
    except (TypeError, ValueError):
        raise _CRED_ERROR

    result = await db.execute(
        select(User).where(User.id == user_id).options(selectinload(User.hospital))
    )
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise _CRED_ERROR

    return user


async def require_hospital_admin(
    current: User = Depends(get_current_user),
) -> User:
    if current.role != UserRole.hospital_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )
    if current.hospital_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hospital admin is not assigned to a hospital",
        )
    return current


async def require_system_admin(current: User = Depends(get_current_user)) -> User:
    if current.role != UserRole.system_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )
    return current


async def require_patient(current: User = Depends(get_current_user)) -> User:
    if current.role != UserRole.patient:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )
    return current


def get_hospital_admin_for(hospital_id_path_param: str = "hospital_id"):
    """
    Factory that returns a dependency enforcing:
      - role == hospital_admin
      - JWT hospital_id claim matches the {hospital_id} path/query param
    """

    async def _dep(
        hospital_id: int,
        current: User = Depends(require_hospital_admin),
    ) -> User:
        if current.hospital_id != hospital_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
            )
        return current

    return _dep
