"""User-related schemas — never expose password_hash."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from ..models.enums import UserRole


# ── Response ────────────────────────────────────────────────────────────


class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: UserRole
    hospital_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ── Auth requests ──────────────────────────────────────────────────────


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class RefreshIn(BaseModel):
    refresh_token: str


class TokenPairOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: UserRole
    hospital_id: Optional[int] = None
    expires_at: datetime
    username: str


class UserCreate(BaseModel):
    """Patient self-registration (rarely used — most users come via hospital admin invite)."""

    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserRegisterIn(BaseModel):
    """
    Step 1 of the hospital-admin registration flow.
    Creates the user account and returns a token pair so the user is
    immediately signed in and can proceed to register their hospital.
    """

    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)