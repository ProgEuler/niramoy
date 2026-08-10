"""
Seed the new Niramoy schema with divisions, districts, and a couple of
sample hospitals + admin user for local development.

Run from the `backend/` directory with the venv active:

    python -m app.seed

This is idempotent — re-running won't duplicate rows.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .core.config import settings
from .core.security import hash_password
from .database import AsyncSessionLocal, Base, engine
from .models import (
    BedAvailability,
    District,
    Division,
    Hospital,
    HospitalFacility,
    User,
    UserRole,
)
from .models.enums import FacilityType


logger = logging.getLogger(__name__)


SAMPLE_DIVISIONS = ["Dhaka", "Chattogram", "Rajshahi", "Khulna", "Barishal", "Rangpur", "Mymensingh", "Sylhet"]
# All 64 Bangladesh districts per the Bangladesh Bureau of Statistics.
# Keep the spelling in lock-step with `client/lib/use-districts.ts` so the
# frontend dropdown and the server lookup resolve to the same rows.
SAMPLE_DISTRICTS = {
    "Dhaka": [
        "Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj",
        "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi",
        "Rajbari", "Shariatpur", "Tangail",
    ],
    "Chattogram": [
        "Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cox's Bazar",
        "Cumilla", "Feni", "Khagrachhari", "Lakshmipur", "Noakhali",
        "Rangamati",
    ],
    "Rajshahi": [
        "Bogura", "Chapainawabganj", "Joypurhat", "Naogaon", "Natore",
        "Pabna", "Rajshahi", "Sirajganj",
    ],
    "Khulna": [
        "Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Khulna",
        "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira",
    ],
    "Barishal": [
        "Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali",
        "Pirojpur",
    ],
    "Rangpur": [
        "Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari",
        "Panchagarh", "Rangpur", "Thakurgaon",
    ],
    "Mymensingh": [
        "Jamalpur", "Mymensingh", "Netrokona", "Sherpur",
    ],
    "Sylhet": [
        "Habiganj", "Moulvibazar", "Sunamganj", "Sylhet",
    ],
}


async def _ensure_divisions_and_districts(db: AsyncSession) -> dict:
    divs: dict[str, Division] = {}
    for name in SAMPLE_DIVISIONS:
        row = (await db.execute(select(Division).where(Division.name == name))).scalar_one_or_none()
        if row is None:
            row = Division(name=name)
            db.add(row)
            await db.flush()
        divs[name] = row

    districts: list[District] = []
    for div_name, names in SAMPLE_DISTRICTS.items():
        div = divs[div_name]
        for n in names:
            row = (
                await db.execute(
                    select(District).where(District.name == n, District.division_id == div.id)
                )
            ).scalar_one_or_none()
            if row is None:
                row = District(name=n, division_id=div.id)
                db.add(row)
                await db.flush()
            districts.append(row)
    return divs


async def _ensure_super_admin(db: AsyncSession) -> User:
    existing = (
        await db.execute(select(User).where(User.email == "admin@niramoy.bd"))
    ).scalar_one_or_none()
    if existing is not None:
        return existing
    admin = User(
        username="systemadmin",
        email="admin@niramoy.bd",
        password_hash=hash_password("ChangeMe123!"),
        role=UserRole.system_admin,
        is_active=True,
    )
    db.add(admin)
    await db.flush()
    return admin


async def _ensure_sample_hospital(db: AsyncSession, district_name: str) -> Hospital:
    existing = (
        await db.execute(
            select(Hospital).where(Hospital.name == "Sample General Hospital")
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    h = Hospital(
        name="Sample General Hospital",
        district=district_name,
        address=f"Central {district_name}",
        phone_emergency="+8801700000000",
        phone_general="+8801800000000",
        latitude=23.78,
        longitude=90.41,
        description="Sample seed hospital.",
        photo_url=None,
        is_verified=True,
        is_active=True,
    )
    db.add(h)
    await db.flush()

    db.add(BedAvailability(
        hospital_id=h.id,
        icu_total=10, icu_available=4,
        nicu_total=5, nicu_available=2,
        ccu_total=8, ccu_available=3,
        hdu_total=12, hdu_available=6,
        cost_per_day_icu=5000.0, cost_per_day_nicu=4500.0,
        cost_per_day_ccu=4000.0, cost_per_day_hdu=3500.0,
        last_updated=datetime.now(tz=timezone.utc),
    ))
    for ft, total in (
        (FacilityType.icu, 10),
        (FacilityType.nicu, 5),
        (FacilityType.ccu, 8),
        (FacilityType.hdu, 12),
    ):
        db.add(HospitalFacility(
            hospital_id=h.id, facility_type=ft, total_capacity=total, is_active=True
        ))

    db.add(User(
        username="dhaka_admin",
        email="dhaka_admin@niramoy.bd",
        password_hash=hash_password("HospitalPass1!"),
        role=UserRole.hospital_admin,
        hospital_id=h.id,
        is_active=True,
    ))
    return h


async def main() -> int:
    # Create tables (no-op if migrations already ran).
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        try:
            await _ensure_divisions_and_districts(db)
            admin = await _ensure_super_admin(db)
            hospital = await _ensure_sample_hospital(db, "Dhaka")
            await db.commit()
            print(
                f"Seed OK. system_admin={admin.email} "
                f"sample_hospital_id={hospital.id}"
            )
        except Exception:
            await db.rollback()
            raise
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
