"""
System admin router — /api/admin/*

All routes require role=system_admin.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..core.dependencies import require_system_admin
from ..core.pagination import paginate, total_pages_for
from ..core.security import create_password_reset_token, hash_password
from ..core.time import now_utc
from ..core.utils import enum_value
from ..database import get_db
from ..models import (
    Ambulance,
    BedAvailability,
    District,
    Division,
    Hospital,
    HospitalFacility,
    UpdateHistory,
    UpdateStatus,
    User,
    UserRole,
)
from ..models.enums import FacilityType, UpdateType, UserRole as UserRoleEnum
from ..schemas.common import PaginatedResponse
from ..schemas.hospital import (
    AdminUserCreate,
    HospitalAdminOut,
    HospitalCreate,
    HospitalSummaryOut,
    HospitalUpdate,
    SuspendIn,
    VerifyIn,
)
from ..schemas.update_history import (
    UpdateApprovalIn,
    UpdateHistoryOut,
    UpdateRejectionIn,
)
from ..schemas.user import UserOut
from ..services import bed_service, hospital_service, report_service
from ..services.notification_service import send_password_reset_email, send_verification_email
from ..services.serializers import hospital_to_summary


router = APIRouter(prefix="/api/admin", tags=["system-admin"])


# ── Hospitals ──────────────────────────────────────────────────────────


def _admin_user_to_out(u: User) -> HospitalAdminOut:
    return HospitalAdminOut(
        id=u.id,
        username=u.username,
        email=u.email,
        role=u.role,
        is_active=u.is_active,
        last_login=u.last_login,
    )


@router.get("/hospitals", response_model=PaginatedResponse[HospitalSummaryOut])
async def list_hospitals(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    search: Optional[str] = None,
    district: Optional[str] = None,
    is_verified: Optional[bool] = None,
    is_active: Optional[bool] = None,
) -> PaginatedResponse[HospitalSummaryOut]:
    where = []
    if search:
        pat = f"%{search.lower()}%"
        where.append(func.lower(Hospital.name).like(pat))
    if district is not None:
        where.append(func.lower(Hospital.district) == district.lower())
    if is_verified is not None:
        where.append(Hospital.is_verified.is_(is_verified))
    if is_active is not None:
        where.append(Hospital.is_active.is_(is_active))

    base = (
        select(Hospital)
        .options(
            selectinload(Hospital.bed_availability),
            selectinload(Hospital.ratings),
        )
    )
    if where:
        base = base.where(and_(*where))

    total = int(
        (await db.execute(select(func.count(Hospital.id)).where(and_(*where)))).scalar_one()
        or 0
    )
    rows = (
        await db.execute(
            base.order_by(Hospital.name.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()

    items = [hospital_to_summary(h) for h in rows]
    return PaginatedResponse[HospitalSummaryOut](
        data=items,
        page=page,
        page_size=page_size,
        total_count=total,
        total_pages=total_pages_for(total, page_size),
    )


@router.get("/hospitals/{hospital_id}")
async def get_hospital(
    hospital_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
) -> dict:
    h = await hospital_service.fetch_hospital_for_admin(db, hospital_id)
    if h is None:
        raise HTTPException(status_code=404, detail="Hospital not found")

    bed = h.bed_availability
    admins = [_admin_user_to_out(u) for u in h.admins]
    history_summary = (
        await db.execute(
            select(UpdateHistory)
            .where(UpdateHistory.hospital_id == h.id)
            .order_by(UpdateHistory.created_at.desc())
            .limit(10)
        )
    ).scalars().all()

    return {
        "id": h.id,
        "name": h.name,
        "address": h.address,
        "phone_emergency": h.phone_emergency,
        "phone_general": h.phone_general,
        "description": h.description,
        "photo_url": h.photo_url,
        "latitude": h.latitude,
        "longitude": h.longitude,
        "is_verified": h.is_verified,
        "is_active": h.is_active,
        "district": h.district,
        "created_at": h.created_at,
        "updated_at": h.updated_at,
        "facilities": [
            {
                "type": enum_value(f.facility_type),
                "total_capacity": f.total_capacity,
                "is_active": f.is_active,
            }
            for f in h.facilities
        ],
        "bed_availability": {
            "icu_total": bed.icu_total if bed else 0,
            "icu_available": bed.icu_available if bed else 0,
            "nicu_total": bed.nicu_total if bed else 0,
            "nicu_available": bed.nicu_available if bed else 0,
            "ccu_total": bed.ccu_total if bed else 0,
            "ccu_available": bed.ccu_available if bed else 0,
            "hdu_total": bed.hdu_total if bed else 0,
            "hdu_available": bed.hdu_available if bed else 0,
            "cost_per_day_icu": bed.cost_per_day_icu if bed else 0.0,
            "cost_per_day_nicu": bed.cost_per_day_nicu if bed else 0.0,
            "cost_per_day_ccu": bed.cost_per_day_ccu if bed else 0.0,
            "cost_per_day_hdu": bed.cost_per_day_hdu if bed else 0.0,
            "last_updated": bed.last_updated if bed else None,
        } if bed else None,
        "assigned_admin": admins,
        "recent_update_history": [UpdateHistoryOut.model_validate(r) for r in history_summary],
    }


@router.post("/hospitals", status_code=status.HTTP_201_CREATED)
async def create_hospital(
    payload: HospitalCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_system_admin),
) -> dict:
    h = Hospital(
        name=payload.name,
        district=payload.district,
        address=payload.address,
        phone_emergency=payload.phone_emergency,
        phone_general=payload.phone_general,
        latitude=payload.latitude,
        longitude=payload.longitude,
        description=payload.description,
        photo_url=payload.photo_url,
        osm_id=payload.osm_id,
        operator_name=payload.operator_name,
        is_verified=payload.is_verified,
        is_active=True,
    )
    db.add(h)
    await db.flush()

    for ftype in payload.facility_types:
        db.add(
            HospitalFacility(
                hospital_id=h.id,
                facility_type=ftype,
                total_capacity=0,
                is_active=True,
            )
        )
    db.add(BedAvailability(hospital_id=h.id, last_updated=now_utc()))

    await db.commit()
    await db.refresh(h)
    return {"id": h.id, "name": h.name}


@router.put("/hospitals/{hospital_id}")
async def update_hospital(
    hospital_id: int,
    payload: HospitalUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_system_admin),
) -> dict:
    h = await hospital_service.fetch_hospital_for_admin(db, hospital_id)
    if h is None:
        raise HTTPException(status_code=404, detail="Hospital not found")
    await hospital_service.admin_update_hospital(db, hospital=h, user=user, payload=payload)
    await db.commit()
    return {"id": h.id}


@router.patch("/hospitals/{hospital_id}/verify")
async def verify_hospital(
    hospital_id: int,
    payload: VerifyIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
) -> dict:
    h = (await db.execute(select(Hospital).where(Hospital.id == hospital_id))).scalar_one_or_none()
    if h is None:
        raise HTTPException(status_code=404, detail="Hospital not found")
    h.is_verified = payload.is_verified
    await db.commit()
    if payload.is_verified:
        admins = (
            await db.execute(select(User).where(User.hospital_id == hospital_id))
        ).scalars().all()
        for a in admins:
            await send_verification_email(a.email, h.name)
    return {"id": h.id, "is_verified": h.is_verified}


@router.patch("/hospitals/{hospital_id}/suspend")
async def suspend_hospital(
    hospital_id: int,
    payload: SuspendIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_system_admin),
) -> dict:
    h = (await db.execute(select(Hospital).where(Hospital.id == hospital_id))).scalar_one_or_none()
    if h is None:
        raise HTTPException(status_code=404, detail="Hospital not found")
    new_active = not payload.is_suspended
    h.is_active = new_active
    await db.execute(
        update(User)
        .where(User.hospital_id == hospital_id)
        .values(is_active=new_active)
    )
    await db.flush()
    await hospital_service.log_profile_change(
        db,
        hospital=h,
        user=admin,
        field_name="is_active",
        old_value=str(new_active),
        new_value=str(payload.is_suspended),
        note=payload.reason,
    )
    await db.commit()
    return {"id": h.id, "is_active": h.is_active}


@router.delete("/hospitals/{hospital_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_hospital(
    hospital_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
):
    h = (await db.execute(select(Hospital).where(Hospital.id == hospital_id))).scalar_one_or_none()
    if h is None:
        raise HTTPException(status_code=404, detail="Hospital not found")
    h.is_active = False
    await db.commit()
    return None


# ── Users ──────────────────────────────────────────────────────────────


@router.get("/users", response_model=PaginatedResponse[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    role: Optional[UserRoleEnum] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
) -> PaginatedResponse[UserOut]:
    where = []
    if role is not None:
        where.append(User.role == role)
    if is_active is not None:
        where.append(User.is_active.is_(is_active))
    if search:
        pat = f"%{search.lower()}%"
        where.append(
            func.lower(User.username).like(pat) | func.lower(User.email).like(pat)
        )

    total = int(
        (await db.execute(select(func.count(User.id)).where(and_(*where)))).scalar_one() or 0
    )
    rows = (
        await db.execute(
            select(User)
            .where(and_(*where))
            .order_by(User.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()

    items = [UserOut.model_validate(u) for u in rows]
    return PaginatedResponse[UserOut](
        data=items,
        page=page,
        page_size=page_size,
        total_count=total,
        total_pages=total_pages_for(total, page_size),
    )


@router.patch("/users/{user_id}/suspend")
async def suspend_user(
    user_id: int,
    payload: SuspendIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
) -> dict:
    u = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    u.is_active = not payload.is_suspended
    await db.commit()
    return {"id": u.id, "is_active": u.is_active}


@router.patch("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
) -> dict:
    u = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    token = create_password_reset_token(sub=str(u.id), email=u.email)
    await send_password_reset_email(u.email, token)
    return {"message": "Reset email sent"}


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_admin_user(
    payload: AdminUserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
) -> dict:
    # email/username uniqueness check.
    exists = (
        await db.execute(
            select(User).where(
                (User.email == payload.email) | (User.username == payload.username)
            )
        )
    ).scalar_one_or_none()
    if exists is not None:
        raise HTTPException(status_code=400, detail="Email or username already in use")

    u = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=UserRole.system_admin,
        is_active=True,
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return {"id": u.id, "username": u.username, "email": u.email}


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
):
    u = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    u.is_active = False
    await db.commit()
    return None


# ── Update moderation ─────────────────────────────────────────────────


@router.get("/updates", response_model=PaginatedResponse[UpdateHistoryOut])
async def list_updates(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    status_filter: Optional[UpdateStatus] = Query(None, alias="status"),
    hospital_id: Optional[int] = None,
    update_type: Optional[UpdateType] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
) -> PaginatedResponse[UpdateHistoryOut]:
    where = []
    if status_filter is not None:
        where.append(UpdateHistory.status == status_filter)
    if hospital_id is not None:
        where.append(UpdateHistory.hospital_id == hospital_id)
    if update_type is not None:
        where.append(UpdateHistory.update_type == update_type)
    if date_from is not None:
        where.append(UpdateHistory.created_at >= date_from)
    if date_to is not None:
        where.append(UpdateHistory.created_at <= date_to)

    total = int(
        (await db.execute(select(func.count(UpdateHistory.id)).where(and_(*where)))).scalar_one() or 0
    )
    rows = (
        await db.execute(
            select(UpdateHistory)
            .where(and_(*where))
            .order_by(UpdateHistory.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()

    items = [UpdateHistoryOut.model_validate(r) for r in rows]
    return PaginatedResponse[UpdateHistoryOut](
        data=items,
        page=page,
        page_size=page_size,
        total_count=total,
        total_pages=total_pages_for(total, page_size),
    )


@router.patch("/updates/{update_id}/approve")
async def approve_update(
    update_id: int,
    payload: UpdateApprovalIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_system_admin),
) -> dict:
    entry = (
        await db.execute(select(UpdateHistory).where(UpdateHistory.id == update_id))
    ).scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=404, detail="Update not found")
    if entry.status is not UpdateStatus.Pending:
        raise HTTPException(status_code=400, detail="Update is not pending")

    if entry.update_type is UpdateType.BedCount:
        bed = await bed_service.approve_pending_update(db, history_id=update_id, admin=admin)
        if bed is None:
            raise HTTPException(status_code=400, detail="Cannot apply update")
    else:
        entry.status = UpdateStatus.Live

    if payload.note:
        entry.note = (entry.note + " | " if entry.note else "") + payload.note

    await db.commit()
    return {"id": entry.id, "status": entry.status}


@router.patch("/updates/{update_id}/reject")
async def reject_update(
    update_id: int,
    payload: UpdateRejectionIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
) -> dict:
    entry = (
        await db.execute(select(UpdateHistory).where(UpdateHistory.id == update_id))
    ).scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=404, detail="Update not found")
    entry.status = UpdateStatus.Rejected
    entry.rejection_reason = payload.reason
    await db.commit()
    return {"id": entry.id, "status": entry.status}


# ── Reports ────────────────────────────────────────────────────────────


@router.get("/reports/availability-summary")
async def availability_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
    division_id: Optional[int] = None,
    district_id: Optional[int] = None,
    bed_type: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
) -> List[dict]:
    return await report_service.availability_summary(
        db,
        division_id=division_id,
        district_id=district_id,
        bed_type=bed_type,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/reports/update-frequency")
async def update_frequency(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
) -> List[dict]:
    return await report_service.update_frequency(db)


@router.get("/reports/platform-stats")
async def platform_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
) -> dict:
    return await report_service.platform_stats(db)


# ── Div / district / ambulance CRUD ───────────────────────────────────


@router.get("/divisions", response_model=PaginatedResponse[dict])
async def list_divisions(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
):
    rows = (await db.execute(select(Division).order_by(Division.name))).scalars().all()
    items = [{"id": d.id, "name": d.name} for d in rows]
    sliced, total, _ = paginate(items, page, page_size)
    return PaginatedResponse[dict](
        data=sliced,
        page=page,
        page_size=page_size,
        total_count=total,
        total_pages=total_pages_for(total, page_size),
    )


@router.post("/divisions", status_code=status.HTTP_201_CREATED)
async def create_division(
    name: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
):
    d = Division(name=name)
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return {"id": d.id, "name": d.name}


@router.put("/divisions/{division_id}")
async def update_division(
    division_id: int,
    name: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
):
    d = (await db.execute(select(Division).where(Division.id == division_id))).scalar_one_or_none()
    if d is None:
        raise HTTPException(status_code=404, detail="Division not found")
    d.name = name
    await db.commit()
    return {"id": d.id, "name": d.name}


@router.delete("/divisions/{division_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_division(
    division_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
):
    d = (await db.execute(select(Division).where(Division.id == division_id))).scalar_one_or_none()
    if d is None:
        raise HTTPException(status_code=404, detail="Division not found")
    await db.delete(d)
    await db.commit()
    return None


@router.get("/districts", response_model=PaginatedResponse[dict])
async def list_districts(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
    division_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
):
    stmt = select(District)
    if division_id is not None:
        stmt = stmt.where(District.division_id == division_id)
    rows = (await db.execute(stmt.order_by(District.name))).scalars().all()
    items = [{"id": d.id, "name": d.name, "division_id": d.division_id} for d in rows]
    sliced, total, _ = paginate(items, page, page_size)
    return PaginatedResponse[dict](
        data=sliced,
        page=page,
        page_size=page_size,
        total_count=total,
        total_pages=total_pages_for(total, page_size),
    )


@router.post("/districts", status_code=status.HTTP_201_CREATED)
async def create_district(
    name: str,
    division_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
):
    d = District(name=name, division_id=division_id)
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return {"id": d.id, "name": d.name, "division_id": d.division_id}


@router.put("/districts/{district_id}")
async def update_district(
    district_id: int,
    name: str,
    division_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
):
    d = (await db.execute(select(District).where(District.id == district_id))).scalar_one_or_none()
    if d is None:
        raise HTTPException(status_code=404, detail="District not found")
    d.name = name
    d.division_id = division_id
    await db.commit()
    return {"id": d.id, "name": d.name, "division_id": d.division_id}


@router.delete("/districts/{district_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_district(
    district_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
):
    d = (await db.execute(select(District).where(District.id == district_id))).scalar_one_or_none()
    if d is None:
        raise HTTPException(status_code=404, detail="District not found")
    await db.delete(d)
    await db.commit()
    return None


@router.get("/ambulances", response_model=PaginatedResponse[dict])
async def list_ambulances_admin(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
    district_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
):
    stmt = select(Ambulance)
    if district_id is not None:
        stmt = stmt.where(Ambulance.district_id == district_id)
    rows = (await db.execute(stmt.order_by(Ambulance.name))).scalars().all()
    items = [
        {
            "id": a.id,
            "name": a.name,
            "organization": a.organization,
            "district_id": a.district_id,
            "phone": a.phone,
            "type": enum_value(a.type),
            "is_24h": a.is_24h,
            "is_active": a.is_active,
        }
        for a in rows
    ]
    sliced, total, _ = paginate(items, page, page_size)
    return PaginatedResponse[dict](
        data=sliced,
        page=page,
        page_size=page_size,
        total_count=total,
        total_pages=total_pages_for(total, page_size),
    )


@router.post("/ambulances", status_code=status.HTTP_201_CREATED)
async def create_ambulance(
    name: str,
    district_id: int,
    phone: str,
    type: str,
    organization: Optional[str] = None,
    is_24h: bool = False,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
):
    a = Ambulance(
        name=name,
        organization=organization,
        district_id=district_id,
        phone=phone,
        type=type,
        is_24h=is_24h,
        is_active=True,
    )
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return {"id": a.id, "name": a.name}


@router.put("/ambulances/{ambulance_id}")
async def update_ambulance(
    ambulance_id: int,
    name: str,
    district_id: int,
    phone: str,
    type: str,
    organization: Optional[str] = None,
    is_24h: bool = False,
    is_active: bool = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
):
    a = (await db.execute(select(Ambulance).where(Ambulance.id == ambulance_id))).scalar_one_or_none()
    if a is None:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    a.name = name
    a.organization = organization
    a.district_id = district_id
    a.phone = phone
    a.type = type
    a.is_24h = is_24h
    a.is_active = is_active
    await db.commit()
    return {"id": a.id}


@router.delete("/ambulances/{ambulance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ambulance(
    ambulance_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_system_admin),
):
    a = (await db.execute(select(Ambulance).where(Ambulance.id == ambulance_id))).scalar_one_or_none()
    if a is None:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    await db.delete(a)
    await db.commit()
    return None