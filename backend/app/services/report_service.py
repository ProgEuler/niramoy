"""
Report service — aggregates for system admin endpoints.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.time import now_utc
from ..models import (
    BedAvailability,
    District,
    Hospital,
    Review,
    UpdateHistory,
    User,
    UserRole,
)
from ..models.enums import FacilityType, UpdateStatus


def _now() -> datetime:
    return now_utc()


async def availability_summary(
    db: AsyncSession,
    *,
    division_id: Optional[int],
    district_id: Optional[int],
    bed_type: Optional[str],
    date_from: Optional[datetime],
    date_to: Optional[datetime],
) -> List[Dict]:
    """District-wise aggregate — beds total/available per district."""
    field_map = {
        "icu": (BedAvailability.icu_total, BedAvailability.icu_available),
        "nicu": (BedAvailability.nicu_total, BedAvailability.nicu_available),
        "ccu": (BedAvailability.ccu_total, BedAvailability.ccu_available),
        "hdu": (BedAvailability.hdu_total, BedAvailability.hdu_available),
    }
    total_col, avail_col = field_map.get(
        bed_type or "", field_map[FacilityType.icu.value.lower()]
    )

    stmt = (
        select(
            District.id.label("district_id"),
            District.name.label("district_name"),
            func.coalesce(func.sum(total_col), 0).label("total"),
            func.coalesce(func.sum(avail_col), 0).label("available"),
            func.count(Hospital.id).label("hospital_count"),
        )
        .select_from(District)
        .join(Hospital, Hospital.district == District.name, isouter=True)
        .join(BedAvailability, BedAvailability.hospital_id == Hospital.id, isouter=True)
        .where(Hospital.is_verified.is_(True), Hospital.is_active.is_(True))
        .group_by(District.id, District.name)
    )
    if division_id is not None:
        stmt = stmt.where(District.division_id == division_id)
    if district_id is not None:
        stmt = stmt.where(District.id == district_id)
    if date_from is not None:
        stmt = stmt.where(BedAvailability.last_updated >= date_from)
    if date_to is not None:
        stmt = stmt.where(BedAvailability.last_updated <= date_to)

    rows = (await db.execute(stmt)).all()
    return [
        {
            "district_id": r.district_id,
            "district_name": r.district_name,
            "hospital_count": int(r.hospital_count or 0),
            "total_beds": int(r.total or 0),
            "available_beds": int(r.available or 0),
        }
        for r in rows
    ]


async def update_frequency(db: AsyncSession) -> List[Dict]:
    """Hospitals ranked by update frequency."""
    subq = (
        select(
            UpdateHistory.hospital_id,
            func.count(UpdateHistory.id).label("update_count"),
            func.max(UpdateHistory.created_at).label("last_updated"),
            func.avg(
                func.extract(
                    "epoch",
                    UpdateHistory.created_at
                    - func.lag(UpdateHistory.created_at)
                    .over(
                        partition_by=UpdateHistory.hospital_id,
                        order_by=UpdateHistory.created_at,
                    ),
                )
                / 3600.0
            ).label("avg_interval_hours"),
        )
        .group_by(UpdateHistory.hospital_id)
        .subquery()
    )

    stmt = (
        select(
            Hospital.id,
            Hospital.name,
            subq.c.update_count,
            subq.c.last_updated,
            subq.c.avg_interval_hours,
        )
        .join(subq, subq.c.hospital_id == Hospital.id)
        .order_by(subq.c.update_count.desc())
    )
    rows = (await db.execute(stmt)).all()
    return [
        {
            "hospital_id": r.id,
            "hospital_name": r.name,
            "update_count": int(r.update_count or 0),
            "last_updated": r.last_updated.isoformat() if r.last_updated else None,
            "average_interval_hours": (
                float(r.avg_interval_hours)
                if r.avg_interval_hours is not None
                else None
            ),
        }
        for r in rows
    ]


async def platform_stats(db: AsyncSession) -> Dict:
    total_hospitals = int(
        (await db.execute(select(func.count(Hospital.id)))).scalar_one() or 0
    )
    verified_hospitals = int(
        (
            await db.execute(
                select(func.count(Hospital.id)).where(
                    Hospital.is_verified.is_(True), Hospital.is_active.is_(True)
                )
            )
        ).scalar_one()
        or 0
    )
    pending_approval = int(
        (
            await db.execute(
                select(func.count(UpdateHistory.id)).where(
                    UpdateHistory.status == UpdateStatus.Pending
                )
            )
        ).scalar_one()
        or 0
    )

    totals = (
        await db.execute(
            select(
                func.coalesce(func.sum(BedAvailability.icu_total), 0),
                func.coalesce(func.sum(BedAvailability.icu_available), 0),
            )
        )
    ).one()
    icu_total = int(totals[0] or 0)
    icu_avail = int(totals[1] or 0)

    stale_cutoff = _now().timestamp() - 24 * 3600
    stale_count = int(
        (
            await db.execute(
                select(func.count(BedAvailability.id)).where(
                    BedAvailability.last_updated
                    < datetime.fromtimestamp(stale_cutoff, tz=timezone.utc)
                )
            )
        ).scalar_one()
        or 0
    )

    total_reviews = int(
        (await db.execute(select(func.count(Review.id)))).scalar_one() or 0
    )
    active_admins = int(
        (
            await db.execute(
                select(func.count(User.id)).where(
                    User.role == UserRole.hospital_admin,
                    User.is_active.is_(True),
                )
            )
        ).scalar_one()
        or 0
    )

    return {
        "total_hospitals": total_hospitals,
        "verified_hospitals": verified_hospitals,
        "pending_approval": pending_approval,
        "pending_hospitals": int(
            (
                await db.execute(
                    select(func.count(Hospital.id)).where(
                        Hospital.is_verified.is_(False), Hospital.is_active.is_(True)
                    )
                )
            ).scalar_one()
            or 0
        ),
        "suspended_hospitals": int(
            (
                await db.execute(
                    select(func.count(Hospital.id)).where(
                        Hospital.is_active.is_(False)
                    )
                )
            ).scalar_one()
            or 0
        ),
        "total_icu_beds": icu_total,
        "available_icu_beds": icu_avail,
        "hospitals_stale_over_24h": stale_count,
        "total_reviews": total_reviews,
        "active_admins": active_admins,
    }