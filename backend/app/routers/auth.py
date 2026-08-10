"""
Auth router — /api/auth/*

POST /api/auth/register-user           — Step 1: create account, returns token pair
POST /api/auth/register-hospital       — Step 2: create hospital profile (authenticated)
POST /api/auth/login
POST /api/auth/register                — Legacy combined registration (kept for compatibility)
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/refresh
GET  /api/auth/me
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.dependencies import get_current_user, require_hospital_admin
from ..core.utils import enum_value
from ..database import get_db
from ..models import User
from ..schemas.hospital import (
    HospitalAdminCreate,
    HospitalSelfRegisterIn,
    HospitalSelfRegisterOut,
    RegistrationOut,
)
from ..schemas.user import (
    LoginIn,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshIn,
    TokenPairOut,
    UserRegisterIn,
)
from ..services import auth_service
from ..services.hospital_service import (
    create_hospital_for_user,
    register_hospital_with_admin,
)
from ..services.notification_service import send_password_reset_email


router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Step 1: Register user account ─────────────────────────────────────


@router.post(
    "/register-user",
    status_code=status.HTTP_201_CREATED,
    response_model=TokenPairOut,
)
async def register_user(
    payload: UserRegisterIn, db: AsyncSession = Depends(get_db)
) -> TokenPairOut:
    """
    Create a new hospital_admin user account and return a token pair so the
    client is immediately signed in.  The user still has no hospital at this
    point — they must complete step 2 (/register-hospital).
    """
    try:
        user = await auth_service.register_user(
            db,
            username=payload.username,
            email=payload.email,
            password=payload.password,
        )
    except ValueError as exc:
        await db.rollback()
        raise _user_registration_error(exc) from exc

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already in use",
            headers={"X-Error-Field": "email"},
        ) from exc

    await db.refresh(user)
    return TokenPairOut(**auth_service.build_token_pair(user))


# ── Step 2: Register hospital profile (authenticated) ─────────────────


@router.post(
    "/register-hospital",
    status_code=status.HTTP_201_CREATED,
    response_model=HospitalSelfRegisterOut,
)
async def register_hospital(
    payload: HospitalSelfRegisterIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HospitalSelfRegisterOut:
    """
    Attach a hospital profile to the already-authenticated hospital_admin.
    The hospital starts unverified; an admin must approve it before the
    hospital admin gets full dashboard access.
    """
    if current_user.hospital_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already registered a hospital",
        )

    try:
        hospital = await create_hospital_for_user(
            db, user=current_user, payload=payload
        )
    except ValueError as exc:
        await db.rollback()
        raise _hospital_registration_error(exc) from exc

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conflicting record while saving hospital",
        ) from exc

    return HospitalSelfRegisterOut(
        message="Hospital registration submitted. Pending admin review.",
        hospital_id=hospital.id,
    )


# ── Login ──────────────────────────────────────────────────────────────


@router.post("/login", response_model=TokenPairOut)
async def login(payload: LoginIn, db: AsyncSession = Depends(get_db)) -> TokenPairOut:
    user = await auth_service.authenticate_user(
        db, email=payload.email, password=payload.password
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    await auth_service.mark_login(db, user)
    await db.commit()
    return TokenPairOut(**auth_service.build_token_pair(user))


# ── Legacy combined registration (kept for compatibility) ─────────────


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=RegistrationOut,
)
async def register(
    payload: HospitalAdminCreate, db: AsyncSession = Depends(get_db)
) -> RegistrationOut:
    try:
        hospital = await register_hospital_with_admin(db, payload=payload)
    except ValueError as exc:
        await db.rollback()
        raise _registration_error(exc) from exc

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conflicting record — email or username already in use",
            headers={"X-Error-Field": "admin_email"},
        ) from exc

    return RegistrationOut(
        message="Registration received. Pending review.",
        hospital_id=hospital.id,
    )


# ── Forgot / reset password ────────────────────────────────────────────


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    payload: PasswordResetRequest, db: AsyncSession = Depends(get_db)
) -> dict:
    user = await auth_service.find_user_by_email(db, payload.email)
    if user is not None and user.is_active:
        token = await auth_service.issue_reset_token(user)
        await send_password_reset_email(user.email, token)
    return {"message": "If the email exists, a reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    payload: PasswordResetConfirm, db: AsyncSession = Depends(get_db)
) -> dict:
    ok = await auth_service.consume_reset_token(
        db, token=payload.token, new_password=payload.new_password
    )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token",
        )
    await db.commit()
    return {"message": "Password updated"}


# ── Refresh ────────────────────────────────────────────────────────────


@router.post("/refresh", response_model=TokenPairOut)
async def refresh(payload: RefreshIn, db: AsyncSession = Depends(get_db)) -> TokenPairOut:
    tokens = await auth_service.refresh_tokens(db, payload.refresh_token)
    if tokens is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    return TokenPairOut(**tokens)


# ── Me ─────────────────────────────────────────────────────────────────


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)) -> dict:
    hospital_is_verified: bool | None = None
    if current_user.hospital is not None:
        hospital_is_verified = current_user.hospital.is_verified
    elif current_user.hospital_id is None:
        # No hospital registered yet.
        hospital_is_verified = None

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": enum_value(current_user.role),
        "hospital_id": current_user.hospital_id,
        "is_active": current_user.is_active,
        "hospital_is_verified": hospital_is_verified,
    }


# ── Error helpers ──────────────────────────────────────────────────────


def _user_registration_error(exc: ValueError) -> HTTPException:
    msg = str(exc)
    field: str | None = None
    if "Email" in msg:
        field = "email"
    elif "Username" in msg:
        field = "username"
    headers = {"X-Error-Field": field} if field else None
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=msg,
        headers=headers,
    )


def _hospital_registration_error(exc: ValueError) -> HTTPException:
    msg = str(exc)
    field: str | None = None
    if "District" in msg and "does not exist" in msg:
        field = "district_name"
    headers = {"X-Error-Field": field} if field else None
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=msg,
        headers=headers,
    )


def _registration_error(exc: ValueError) -> HTTPException:
    """Translate service-layer ValueError messages into a structured 400."""
    msg = str(exc)
    field: str | None = None
    if "District" in msg and "does not exist" in msg:
        field = "district_name"
    elif "Email" in msg:
        field = "admin_email"
    elif "Username" in msg:
        field = "admin_name"
    headers = {"X-Error-Field": field} if field else None
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=msg,
        headers=headers,
    )
