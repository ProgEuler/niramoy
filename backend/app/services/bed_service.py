from __future__ import annotations

from typing import Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.time import now_utc
from ..models import BedAvailability, Hospital, UpdateHistory, UpdateStatus, UpdateType, User
from ..schemas.bed_availability import BedUpdateIn
from .notification_service import push_bed_update


_BED_FIELDS = ("icu", "nicu", "ccu", "hdu")


def _now():
    return now_utc()


async def get_or_create_bed_row(db: AsyncSession, hospital_id: int) -> BedAvailability:
    result = await db.execute(
        select(BedAvailability).where(BedAvailability.hospital_id == hospital_id)
    )
    row = result.scalar_one_or_none()
    if row is not None:
        return row
    row = BedAvailability(hospital_id=hospital_id)
    db.add(row)
    await db.flush()
    return row


def _drop_fraction(prev: int, new: int, total: int) -> float:
    """Fractional drop from prev to new as a fraction of `total`."""
    if total <= 0:
        return 0.0
    if new >= prev:
        return 0.0
    return (prev - new) / total


async def apply_bed_update(
    db: AsyncSession,
    *,
    hospital_id: int,
    payload: BedUpdateIn,
    user: User,
) -> Dict[str, object]:
    """
    Apply a bed-count update. Returns {"status": "live"|"pending", ...}.
    """
    bed_row = await get_or_create_bed_row(db, hospital_id)

    # Validate each value against capacity; clamp if user somehow sends higher.
    proposed: Dict[str, int] = {}
    for f in _BED_FIELDS:
        attr = f"{f}_available"
        new_val = getattr(payload, f"{f}_available", None)
        if new_val is None:
            continue
        total = getattr(bed_row, f"{f}_total", 0) or 0
        if new_val < 0:
            new_val = 0
        if total and new_val > total:
            new_val = total
        proposed[f] = new_val

    # Moderation threshold — if any bed type drops more than `moderation_drop_pct`
    # of its total capacity, the change is queued for review.
    needs_review = False
    threshold = float(settings.moderation_drop_pct)
    for f, new_val in proposed.items():
        prev = getattr(bed_row, f"{f}_available", 0) or 0
        total = getattr(bed_row, f"{f}_total", 0) or 0
        if _drop_fraction(prev, new_val, total) > threshold:
            needs_review = True
            break

    hospital_result = await db.execute(
        select(Hospital).where(Hospital.id == hospital_id)
    )
    hospital = hospital_result.scalar_one_or_none()
    hospital_name = hospital.name if hospital else f"Hospital {hospital_id}"

    if needs_review:
        # Pending — write history rows, do NOT update bed_availability yet.
        for f, new_val in proposed.items():
            prev = getattr(bed_row, f"{f}_available", 0) or 0
            db.add(
                UpdateHistory(
                    hospital_id=hospital_id,
                    updated_by_user_id=user.id,
                    update_type=UpdateType.BedCount,
                    field_name=f"{f}_available",
                    previous_value=str(prev),
                    new_value=str(new_val),
                    note=payload.note,
                    status=UpdateStatus.Pending,
                )
            )
        await db.flush()
        return {
            "status": "pending",
            "message": "Under review",
        }

    # Live — apply, log every changed field, push websocket event.
    changed_any = False
    for f, new_val in proposed.items():
        prev = getattr(bed_row, f"{f}_available", 0) or 0
        if prev == new_val:
            continue
        changed_any = True
        db.add(
            UpdateHistory(
                hospital_id=hospital_id,
                updated_by_user_id=user.id,
                update_type=UpdateType.BedCount,
                field_name=f"{f}_available",
                previous_value=str(prev),
                new_value=str(new_val),
                note=payload.note,
                status=UpdateStatus.Live,
            )
        )
        setattr(bed_row, f"{f}_available", new_val)

    if changed_any:
        bed_row.last_updated = _now()
        bed_row.updated_by_user_id = user.id
        await db.flush()
        await push_bed_update(
            hospital_id=hospital_id,
            hospital_name=hospital_name,
            bed_row=bed_row,
        )

    return {"status": "live", "updated_at": bed_row.last_updated}


async def approve_pending_update(
    db: AsyncSession,
    *,
    history_id: int,
    admin: User,
) -> Optional[BedAvailability]:
    """Apply a pending BedCount update — set status=Live and update bed row."""
    result = await db.execute(
        select(UpdateHistory).where(UpdateHistory.id == history_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        return None
    if entry.update_type is not UpdateType.BedCount:
        return None
    if entry.status is not UpdateStatus.Pending:
        return None

    bed_row = await get_or_create_bed_row(db, entry.hospital_id)

    field = entry.field_name  # e.g. "icu_available"
    if field and entry.new_value is not None:
        try:
            new_val = int(entry.new_value)
        except ValueError:
            new_val = 0
        setattr(bed_row, field, new_val)

    bed_row.last_updated = _now()
    bed_row.updated_by_user_id = admin.id

    entry.status = UpdateStatus.Live
    await db.flush()

    hospital_result = await db.execute(
        select(Hospital).where(Hospital.id == entry.hospital_id)
    )
    hospital = hospital_result.scalar_one_or_none()
    await push_bed_update(
        hospital_id=entry.hospital_id,
        hospital_name=hospital.name if hospital else f"Hospital {entry.hospital_id}",
        bed_row=bed_row,
    )
    return bed_row
