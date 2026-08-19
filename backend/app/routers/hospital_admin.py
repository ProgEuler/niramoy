"""
Hospital admin router — /api/hospital/*

All routes require an authenticated hospital_admin whose JWT `hospital_id`
matches the resource. `require_hospital_admin` enforces the role check;
we explicitly compare `current.hospital_id` against the path param to
prevent one hospital admin reading another hospital's data.
"""

from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..core.config import settings
from ..core.dependencies import require_hospital_admin
from ..core.pagination import total_pages_for
from ..core.time import now_utc
from ..core.utils import enum_value
from ..database import get_db
from ..models import Hospital, UpdateHistory, UpdateStatus, User
from ..models.enums import UpdateType
from ..schemas.bed_availability import (
    BedAvailabilityOut,
    BedUpdateIn,
    BedUpdateResult,
    PricingOut,
    PricingUpdateIn,
)
from ..schemas.common import PaginatedResponse
from ..schemas.hospital import HospitalProfileOut, HospitalProfileUpdate
from ..schemas.update_history import UpdateHistoryOut
from ..services import bed_service, hospital_service
from ..services.geo_service import is_stale


router = APIRouter(prefix="/api/hospital", tags=["hospital-admin"])


# Helper: load this admin's hospital.
async def _load_my_hospital(db: AsyncSession, user: User) -> Hospital:
    result = await db.execute(
        select(Hospital)
        .where(Hospital.id == user.hospital_id)
        .options(
            selectinload(Hospital.bed_availability),
            selectinload(Hospital.ratings),
        )
    )
    h = result.scalar_one_or_none()
    if h is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found"
        )
    return h


def _is_stale_warning(lu: Optional[datetime]) -> bool:
    if lu is None:
        return True
    threshold = settings.dashboard_stale_warning_hours
    return is_stale(lu, threshold)


# ── Dashboard ──────────────────────────────────────────────────────────


@router.get("/dashboard")
async def dashboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_hospital_admin),
) -> dict:
    hospital = await _load_my_hospital(db, user)

    # last 5 update_history entries
    hist_result = await db.execute(
        select(UpdateHistory)
        .where(UpdateHistory.hospital_id == hospital.id)
        .order_by(UpdateHistory.created_at.desc())
        .limit(5)
    )
    history = [UpdateHistoryOut.model_validate(h) for h in hist_result.scalars().all()]

    bed = hospital.bed_availability
    last_updated = bed.last_updated if bed else None
    stale = _is_stale_warning(last_updated)
    profile_preview = HospitalProfileOut.model_validate(hospital).model_dump()

    return {
        "hospital": profile_preview,
        "bed_availability": (
            BedAvailabilityOut.model_validate(bed).model_dump() if bed else None
        ),
        "last_updated": last_updated,
        "is_stale": stale,
        "stale_warning": stale,
        "recent_history": [h.model_dump(mode="json") for h in history],
    }


# ── Beds ───────────────────────────────────────────────────────────────


@router.get("/beds", response_model=BedAvailabilityOut)
async def get_beds(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_hospital_admin),
) -> BedAvailabilityOut:
    bed = await bed_service.get_or_create_bed_row(db, user.hospital_id)
    out = BedAvailabilityOut.model_validate(bed)
    out.is_stale = is_stale(bed.last_updated, settings.stale_threshold_hours)
    return out


@router.patch("/beds", response_model=BedUpdateResult)
async def update_beds(
    payload: BedUpdateIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_hospital_admin),
) -> BedUpdateResult:
    result = await bed_service.apply_bed_update(
        db,
        hospital_id=user.hospital_id,
        payload=payload,
        user=user,
    )
    await db.commit()
    return BedUpdateResult(**result)


# ── Pricing ────────────────────────────────────────────────────────────


@router.get("/pricing", response_model=PricingOut)
async def get_pricing(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_hospital_admin),
) -> PricingOut:
    bed = await bed_service.get_or_create_bed_row(db, user.hospital_id)
    return PricingOut.model_validate(bed)


@router.patch("/pricing", response_model=PricingOut)
async def update_pricing(
    payload: PricingUpdateIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_hospital_admin),
) -> PricingOut:
    bed = await bed_service.get_or_create_bed_row(db, user.hospital_id)

    fields = [
        ("cost_per_day_icu", payload.cost_icu, bed.cost_per_day_icu),
        ("cost_per_day_nicu", payload.cost_nicu, bed.cost_per_day_nicu),
        ("cost_per_day_ccu", payload.cost_ccu, bed.cost_per_day_ccu),
        ("cost_per_day_hdu", payload.cost_hdu, bed.cost_per_day_hdu),
    ]
    changed = False
    for fname, new_v, old_v in fields:
        if new_v is None or float(new_v) == float(old_v):
            continue
        db.add(
            UpdateHistory(
                hospital_id=user.hospital_id,
                updated_by_user_id=user.id,
                update_type=UpdateType.Pricing,
                field_name=fname,
                previous_value=str(old_v),
                new_value=str(new_v),
                note=None,
                status=UpdateStatus.Live,
            )
        )
        setattr(bed, fname, float(new_v))
        changed = True
    if changed:
        bed.last_updated = now_utc()
        bed.updated_by_user_id = user.id

    await db.commit()
    return PricingOut.model_validate(bed)


# ── Profile ────────────────────────────────────────────────────────────


@router.get("/profile", response_model=HospitalProfileOut)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_hospital_admin),
) -> HospitalProfileOut:
    hospital = await _load_my_hospital(db, user)
    return HospitalProfileOut.model_validate(hospital)


@router.patch("/profile", response_model=HospitalProfileOut)
async def update_profile(
    payload: HospitalProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_hospital_admin),
) -> HospitalProfileOut:
    raw = payload.model_dump(exclude_unset=True)
    if "name" in raw:
        raise HTTPException(
            status_code=400,
            detail="Hospital name cannot be changed via this endpoint",
        )

    hospital = await _load_my_hospital(db, user)
    await hospital_service.update_hospital_profile(
        db,
        hospital=hospital,
        user=user,
        new_address=raw.get("address"),
        new_phone_emergency=raw.get("phone_emergency"),
        new_phone_general=raw.get("phone_general"),
        new_description=raw.get("description"),
        new_photo_url=raw.get("photo_url"),
        new_lat=raw.get("latitude"),
        new_lng=raw.get("longitude"),
    )
    await db.commit()
    return HospitalProfileOut.model_validate(hospital)


# ── History ────────────────────────────────────────────────────────────


@router.get("/history", response_model=PaginatedResponse[UpdateHistoryOut])
async def list_history(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_hospital_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    update_type: Optional[UpdateType] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
) -> PaginatedResponse[UpdateHistoryOut]:
    where = [UpdateHistory.hospital_id == user.hospital_id]
    if update_type is not None:
        where.append(UpdateHistory.update_type == update_type)
    if date_from is not None:
        where.append(UpdateHistory.created_at >= date_from)
    if date_to is not None:
        where.append(UpdateHistory.created_at <= date_to)

    total = int(
        (
            await db.execute(
                select(func.count(UpdateHistory.id)).where(and_(*where))
            )
        ).scalar_one()
        or 0
    )

    offset = (page - 1) * page_size
    rows = (
        await db.execute(
            select(UpdateHistory)
            .where(and_(*where))
            .order_by(UpdateHistory.created_at.desc())
            .offset(offset)
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


@router.get("/history/export")
async def export_history(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_hospital_admin),
) -> StreamingResponse:
    rows = (
        await db.execute(
            select(UpdateHistory)
            .where(UpdateHistory.hospital_id == user.hospital_id)
            .order_by(UpdateHistory.created_at.desc())
        )
    ).scalars().all()

    def _gen():
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(
            [
                "id",
                "created_at",
                "update_type",
                "field_name",
                "previous_value",
                "new_value",
                "status",
                "rejection_reason",
                "note",
                "updated_by_user_id",
            ]
        )
        for r in rows:
            writer.writerow(
                [
                    r.id,
                    r.created_at.isoformat() if r.created_at else "",
                    enum_value(r.update_type),
                    r.field_name or "",
                    r.previous_value or "",
                    r.new_value or "",
                    enum_value(r.status),
                    r.rejection_reason or "",
                    r.note or "",
                    r.updated_by_user_id or "",
                ]
            )
            yield buf.getvalue()
            buf.seek(0)
            buf.truncate(0)
        if buf.tell():
            yield buf.getvalue()

    return StreamingResponse(
        _gen(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="history.csv"'},
    )