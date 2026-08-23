from __future__ import annotations

from typing import List, Optional

from sqlalchemy import func, select, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..core.security import hash_password
from ..core.time import now_utc
from ..models import (
    BedAvailability,
    Hospital,
    HospitalFacility,
    UpdateHistory,
    UpdateStatus,
    UpdateType,
    User,
    UserRole,
)
from ..models.enums import FacilityType
from ..schemas.hospital import HospitalAdminCreate, HospitalSelfRegisterIn, HospitalUpdate


def _now():
    return now_utc()


async def register_hospital_with_admin(
    db: AsyncSession,
    *,
    payload: HospitalAdminCreate,
) -> Hospital:
    """Legacy combined registration — creates hospital + admin user + bed row.

    The district is stored verbatim from the payload — we no longer look
    it up in the reference table, so hospitals are not coupled to the
    rows in ``districts``.
    """
    # Normalize email at the boundary so uniqueness checks and storage are
    # case-insensitive.
    normalized_email = payload.admin_email.strip().lower()
    normalized_username = payload.admin_name.strip().lower()

    existing_email = await db.execute(
        select(User).where(func.lower(User.email) == normalized_email)
    )
    if existing_email.scalar_one_or_none() is not None:
        raise ValueError("Email already registered")

    # The DB has a unique constraint; we surface a clean 400 instead of a 500
    # from an IntegrityError.
    existing_username = await db.execute(
        select(User).where(func.lower(User.username) == normalized_username)
    )
    if existing_username.scalar_one_or_none() is not None:
        raise ValueError("Username already taken")

    hospital = Hospital(
        name=payload.hospital_name,
        district=payload.district_name.strip(),
        address=payload.address,
        phone_emergency=payload.phone_emergency,
        phone_general=payload.phone_general,
        latitude=payload.lat,
        longitude=payload.lng,
        is_verified=False,
        is_active=True,
    )
    db.add(hospital)
    await db.flush()

    # Facilities — dedup to avoid duplicate HospitalFacility rows.
    facilities: List[HospitalFacility] = []
    bed_totals = {f: 0 for f in FacilityType}
    for ftype in dict.fromkeys(payload.facility_types):
        total = int(payload.capacities.get(ftype, 0) or 0)
        facilities.append(
            HospitalFacility(
                hospital_id=hospital.id,
                facility_type=ftype,
                total_capacity=total,
            )
        )
        bed_totals[ftype] = total
    db.add_all(facilities)

    bed_row = BedAvailability(
        hospital_id=hospital.id,
        icu_total=bed_totals[FacilityType.icu],
        nicu_total=bed_totals[FacilityType.nicu],
        ccu_total=bed_totals[FacilityType.ccu],
        hdu_total=bed_totals[FacilityType.hdu],
        last_updated=now_utc(),
    )
    db.add(bed_row)

    admin_user = User(
        username=payload.admin_name,
        email=normalized_email,
        password_hash=hash_password(payload.admin_password),
        role=UserRole.hospital_admin,
        hospital_id=hospital.id,
        is_active=True,
    )
    db.add(admin_user)

    await db.flush()
    return hospital


async def create_hospital_for_user(
    db: AsyncSession,
    *,
    user: User,
    payload: HospitalSelfRegisterIn,
) -> Hospital:
    """
    Step 2 of the new registration flow.

    The user is already authenticated as hospital_admin.  This creates the
    Hospital record + facilities + bed row and links it back to the user.
    Raises ValueError if the user already has a hospital_id.
    """
    if user.hospital_id is not None:
        raise ValueError("User already has a hospital registered")

    hospital = Hospital(
        name=payload.hospital_name,
        district=payload.district_name.strip(),
        address=payload.address,
        phone_emergency=payload.phone_emergency,
        phone_general=payload.phone_general,
        latitude=payload.lat,
        longitude=payload.lng,
        is_verified=False,
        is_active=True,
    )
    db.add(hospital)
    await db.flush()

    facilities: List[HospitalFacility] = []
    bed_totals = {f: 0 for f in FacilityType}
    for ftype in dict.fromkeys(payload.facility_types):
        total = int(payload.capacities.get(ftype, 0) or 0)
        facilities.append(
            HospitalFacility(
                hospital_id=hospital.id,
                facility_type=ftype,
                total_capacity=total,
            )
        )
        bed_totals[ftype] = total
    db.add_all(facilities)

    db.add(
        BedAvailability(
            hospital_id=hospital.id,
            icu_total=bed_totals[FacilityType.icu],
            nicu_total=bed_totals[FacilityType.nicu],
            ccu_total=bed_totals[FacilityType.ccu],
            hdu_total=bed_totals[FacilityType.hdu],
            last_updated=now_utc(),
        )
    )

    # Link the user to this hospital.
    user.hospital_id = hospital.id
    await db.flush()
    return hospital
    """Public registration — creates hospital + admin user + bed row.

    The district is stored verbatim from the payload — we no longer look
    it up in the reference table, so hospitals are not coupled to the
    rows in ``districts``.
    """
    # Normalize email at the boundary so uniqueness checks and storage are
    # case-insensitive.
    normalized_email = payload.admin_email.strip().lower()
    normalized_username = payload.admin_name.strip().lower()

    existing_email = await db.execute(
        select(User).where(func.lower(User.email) == normalized_email)
    )
    if existing_email.scalar_one_or_none() is not None:
        raise ValueError("Email already registered")

    # The DB has a unique constraint; we surface a clean 400 instead of a 500
    # from an IntegrityError.
    existing_username = await db.execute(
        select(User).where(func.lower(User.username) == normalized_username)
    )
    if existing_username.scalar_one_or_none() is not None:
        raise ValueError("Username already taken")

    hospital = Hospital(
        name=payload.hospital_name,
        district=payload.district_name.strip(),
        address=payload.address,
        phone_emergency=payload.phone_emergency,
        phone_general=payload.phone_general,
        latitude=payload.lat,
        longitude=payload.lng,
        is_verified=False,
        is_active=True,
    )
    db.add(hospital)
    await db.flush()

    # Facilities — dedup to avoid duplicate HospitalFacility rows.
    facilities: List[HospitalFacility] = []
    bed_totals = {f: 0 for f in FacilityType}
    for ftype in dict.fromkeys(payload.facility_types):
        total = int(payload.capacities.get(ftype, 0) or 0)
        facilities.append(
            HospitalFacility(
                hospital_id=hospital.id,
                facility_type=ftype,
                total_capacity=total,
            )
        )
        bed_totals[ftype] = total
    db.add_all(facilities)

    bed_row = BedAvailability(
        hospital_id=hospital.id,
        icu_total=bed_totals[FacilityType.icu],
        nicu_total=bed_totals[FacilityType.nicu],
        ccu_total=bed_totals[FacilityType.ccu],
        hdu_total=bed_totals[FacilityType.hdu],
        last_updated=now_utc(),
    )
    db.add(bed_row)

    admin_user = User(
        username=payload.admin_name,
        email=normalized_email,
        password_hash=hash_password(payload.admin_password),
        role=UserRole.hospital_admin,
        hospital_id=hospital.id,
        is_active=True,
    )
    db.add(admin_user)

    await db.flush()
    return hospital


async def log_profile_change(
    db: AsyncSession,
    *,
    hospital: Hospital,
    user: User,
    field_name: str,
    old_value: Optional[str],
    new_value: Optional[str],
    note: Optional[str] = None,
) -> None:
    if old_value == new_value:
        return
    db.add(
        UpdateHistory(
            hospital_id=hospital.id,
            updated_by_user_id=user.id,
            update_type=UpdateType.Profile,
            field_name=field_name,
            previous_value=old_value,
            new_value=new_value,
            note=note,
            status=UpdateStatus.Live,
        )
    )


async def update_hospital_profile(
    db: AsyncSession,
    *,
    hospital: Hospital,
    user: User,
    new_address: Optional[str],
    new_phone_emergency: Optional[str],
    new_phone_general: Optional[str],
    new_description: Optional[str],
    new_photo_url: Optional[str],
    new_lat: Optional[float],
    new_lng: Optional[float],
) -> None:
    """Apply a profile patch + log every changed field."""
    changes = [
        ("address", hospital.address, new_address),
        ("phone_emergency", hospital.phone_emergency, new_phone_emergency),
        ("phone_general", hospital.phone_general, new_phone_general),
        ("description", hospital.description, new_description),
        ("photo_url", hospital.photo_url, new_photo_url),
        ("latitude", str(hospital.latitude) if hospital.latitude is not None else None, str(new_lat) if new_lat is not None else None),
        ("longitude", str(hospital.longitude) if hospital.longitude is not None else None, str(new_lng) if new_lng is not None else None),
    ]

    coords_changed = False
    for field, old, new in changes:
        if new is None:
            continue
        if old == new:
            continue
        await log_profile_change(
            db,
            hospital=hospital,
            user=user,
            field_name=field,
            old_value=old,
            new_value=new,
        )
        # Latitude/longitude are stored as Float columns — the change
        # tuple above stringifies them for the history log, so cast
        # back to float before assigning to avoid writing a string
        # into a numeric column (which silently no-ops on commit).
        if field in ("latitude", "longitude"):
            setattr(hospital, field, float(new))
            coords_changed = True
        else:
            setattr(hospital, field, new)

    if coords_changed:
        hospital.geocoded_at = _now()


async def admin_update_hospital(
    db: AsyncSession,
    *,
    hospital: Hospital,
    user: User,
    payload: HospitalUpdate,
) -> Hospital:
    """System-admin full update — name allowed, every change logged."""
    fields = [
        ("name", hospital.name, payload.name),
        ("address", hospital.address, payload.address),
        ("phone_emergency", hospital.phone_emergency, payload.phone_emergency),
        ("phone_general", hospital.phone_general, payload.phone_general),
        ("description", hospital.description, payload.description),
        ("photo_url", hospital.photo_url, payload.photo_url),
        ("latitude", str(hospital.latitude) if hospital.latitude is not None else None, str(payload.latitude) if payload.latitude is not None else None),
        ("longitude", str(hospital.longitude) if hospital.longitude is not None else None, str(payload.longitude) if payload.longitude is not None else None),
        ("is_verified", str(hospital.is_verified), None if payload.is_verified is None else str(payload.is_verified)),
        ("is_active", str(hospital.is_active), None if payload.is_active is None else str(payload.is_active)),
    ]
    for field, old, new in fields:
        if new is None:
            continue
        if old == new:
            continue
        await log_profile_change(
            db,
            hospital=hospital,
            user=user,
            field_name=field,
            old_value=old,
            new_value=new,
        )
        if field in ("is_verified", "is_active"):
            setattr(hospital, field, new == "True")
        elif field in ("latitude", "longitude"):
            setattr(hospital, field, float(new))
        else:
            setattr(hospital, field, new)
    if payload.district is not None and payload.district != hospital.district:
        await log_profile_change(
            db,
            hospital=hospital,
            user=user,
            field_name="district",
            old_value=hospital.district,
            new_value=payload.district,
        )
        hospital.district = payload.district
    await db.flush()
    return hospital


async def fetch_hospital_for_admin(
    db: AsyncSession, hospital_id: int
) -> Optional[Hospital]:
    result = await db.execute(
        select(Hospital)
        .where(Hospital.id == hospital_id)
        .options(
            selectinload(Hospital.bed_availability),
            selectinload(Hospital.facilities),
            selectinload(Hospital.admins),
            selectinload(Hospital.update_history_rows),
            selectinload(Hospital.ratings),
        )
    )
    return result.scalar_one_or_none()
