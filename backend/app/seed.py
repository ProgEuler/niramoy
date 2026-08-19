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


# ── Featured hospitals (landing page) ─────────────────────────────────
#
# Curated set of well-known Bangladesh hospitals. Used by the
# /api/public/hospitals/featured endpoint to populate the landing page.
# Each entry is idempotent — re-running the seed will not duplicate rows.
# The `key` is a stable slug used to look up the existing row.
FEATURED_HOSPITALS = [
    {
        "key": "square-hospitals-ltd",
        "name": "Square Hospitals Ltd.",
        "district": "Dhaka",
        "address": "18/F, Bir Uttam Qazi Nuruzzaman Sarak, West Panthapath, Dhaka 1205",
        "phone_emergency": "+880-2-8159457",
        "phone_general": "+880-2-8159457",
        "latitude": 23.7515,
        "longitude": 90.3854,
        "description": (
            "A 500-bed tertiary care hospital and one of the leading "
            "private healthcare providers in Bangladesh."
        ),
        "icu_total": 36, "icu_available": 8,
        "nicu_total": 18, "nicu_available": 4,
        "ccu_total": 20, "ccu_available": 5,
        "hdu_total": 24, "hdu_available": 10,
        "cost_per_day_icu": 12000.0,
        "cost_per_day_nicu": 10000.0,
        "cost_per_day_ccu": 9000.0,
        "cost_per_day_hdu": 7000.0,
    },
    {
        "key": "united-hospital-dhaka",
        "name": "United Hospital Limited",
        "district": "Dhaka",
        "address": "Plot 15, Road 71, Gulshan 2, Dhaka 1212",
        "phone_emergency": "+880-2-8836000",
        "phone_general": "+880-2-8836000",
        "latitude": 23.7925,
        "longitude": 90.4078,
        "description": (
            "JCI-accredited 500-bed hospital in Gulshan offering a full "
            "spectrum of tertiary care services."
        ),
        "icu_total": 40, "icu_available": 6,
        "nicu_total": 14, "nicu_available": 3,
        "ccu_total": 18, "ccu_available": 4,
        "hdu_total": 22, "hdu_available": 9,
        "cost_per_day_icu": 14000.0,
        "cost_per_day_nicu": 11000.0,
        "cost_per_day_ccu": 9500.0,
        "cost_per_day_hdu": 7500.0,
    },
    {
        "key": "apolo-hospital-dhaka",
        "name": "Apollo Hospital Dhaka",
        "district": "Dhaka",
        "address": "Plot 81, Block E, Bashundhara R/A, Dhaka 1229",
        "phone_emergency": "+880-2-8401661",
        "phone_general": "+880-2-8401661",
        "latitude": 23.8103,
        "longitude": 90.4125,
        "description": (
            "JCI-accredited 450-bed tertiary care hospital operated by "
            "Apollo Hospitals group."
        ),
        "icu_total": 32, "icu_available": 5,
        "nicu_total": 12, "nicu_available": 2,
        "ccu_total": 16, "ccu_available": 3,
        "hdu_total": 20, "hdu_available": 7,
        "cost_per_day_icu": 13000.0,
        "cost_per_day_nicu": 10500.0,
        "cost_per_day_ccu": 9000.0,
        "cost_per_day_hdu": 7000.0,
    },
    {
        "key": "evercare-hospital-dhaka",
        "name": "Evercare Hospital Dhaka",
        "district": "Dhaka",
        "address": "Plot 81, Block E, Bashundhara R/A, Dhaka 1229",
        "phone_emergency": "+880-2-55067777",
        "phone_general": "+880-2-55067777",
        "latitude": 23.8160,
        "longitude": 90.4240,
        "description": (
            "A 425-bed tertiary care hospital with a focus on advanced "
            "cardiac, neuro and oncology services."
        ),
        "icu_total": 30, "icu_available": 7,
        "nicu_total": 10, "nicu_available": 3,
        "ccu_total": 18, "ccu_available": 5,
        "hdu_total": 18, "hdu_available": 8,
        "cost_per_day_icu": 12500.0,
        "cost_per_day_nicu": 10000.0,
        "cost_per_day_ccu": 8500.0,
        "cost_per_day_hdu": 6500.0,
    },
    {
        "key": "dmch-dhaka-medical",
        "name": "Dhaka Medical College Hospital",
        "district": "Dhaka",
        "address": "Bakshibazar, Secretariat Road, Dhaka 1000",
        "phone_emergency": "+880-2-55165088",
        "phone_general": "+880-2-55165088",
        "latitude": 23.7265,
        "longitude": 90.3975,
        "description": (
            "The largest government-run tertiary hospital in Bangladesh "
            "with over 2,600 beds."
        ),
        "icu_total": 50, "icu_available": 12,
        "nicu_total": 22, "nicu_available": 5,
        "ccu_total": 28, "ccu_available": 8,
        "hdu_total": 40, "hdu_available": 18,
        "cost_per_day_icu": 2000.0,
        "cost_per_day_nicu": 1800.0,
        "cost_per_day_ccu": 1800.0,
        "cost_per_day_hdu": 1500.0,
    },
    {
        "key": "birdem",
        "name": "BIRDEM General Hospital",
        "district": "Dhaka",
        "address": "122, Kazi Nazrul Islam Avenue, Shahbagh, Dhaka 1000",
        "phone_emergency": "+880-2-9665001",
        "phone_general": "+880-2-9665001",
        "latitude": 23.7388,
        "longitude": 90.3950,
        "description": (
            "Bangladesh Institute of Research and Rehabilitation in "
            "Diabetes, Endocrine and Metabolic Disorders — a 600-bed "
            "specialized tertiary hospital."
        ),
        "icu_total": 28, "icu_available": 6,
        "nicu_total": 8, "nicu_available": 2,
        "ccu_total": 16, "ccu_available": 4,
        "hdu_total": 20, "hdu_available": 9,
        "cost_per_day_icu": 4500.0,
        "cost_per_day_nicu": 4000.0,
        "cost_per_day_ccu": 4000.0,
        "cost_per_day_hdu": 3000.0,
    },
    {
        "key": "chattogram-medical",
        "name": "Chattogram Medical College Hospital",
        "district": "Chattogram",
        "address": "K.B. Fazlul Kader Road, Chattogram 4203",
        "phone_emergency": "+880-31-619400",
        "phone_general": "+880-31-619400",
        "latitude": 22.3350,
        "longitude": 91.8130,
        "description": (
            "The largest government hospital in the Chattogram division "
            "with 1,310 beds."
        ),
        "icu_total": 32, "icu_available": 8,
        "nicu_total": 14, "nicu_available": 3,
        "ccu_total": 18, "ccu_available": 5,
        "hdu_total": 26, "hdu_available": 12,
        "cost_per_day_icu": 1800.0,
        "cost_per_day_nicu": 1700.0,
        "cost_per_day_ccu": 1700.0,
        "cost_per_day_hdu": 1400.0,
    },
    {
        "key": "rajshahi-medical",
        "name": "Rajshahi Medical College Hospital",
        "district": "Rajshahi",
        "address": "Laxmipur, Rajshahi 6000",
        "phone_emergency": "+880-721-772150",
        "phone_general": "+880-721-772150",
        "latitude": 24.3636,
        "longitude": 88.6241,
        "description": (
            "A 1,200-bed government tertiary hospital serving the "
            "Rajshahi division and the greater northwest region."
        ),
        "icu_total": 24, "icu_available": 6,
        "nicu_total": 10, "nicu_available": 2,
        "ccu_total": 14, "ccu_available": 4,
        "hdu_total": 20, "hdu_available": 10,
        "cost_per_day_icu": 1700.0,
        "cost_per_day_nicu": 1600.0,
        "cost_per_day_ccu": 1600.0,
        "cost_per_day_hdu": 1300.0,
    },
    {
        "key": "khulna-medical",
        "name": "Khulna Medical College Hospital",
        "district": "Khulna",
        "address": "Boyra Main Road, Khulna 9000",
        "phone_emergency": "+880-41-760041",
        "phone_general": "+880-41-760041",
        "latitude": 22.8088,
        "longitude": 89.5585,
        "description": (
            "A 850-bed government tertiary hospital and the principal "
            "referral center of the Khulna division."
        ),
        "icu_total": 22, "icu_available": 5,
        "nicu_total": 8, "nicu_available": 2,
        "ccu_total": 12, "ccu_available": 3,
        "hdu_total": 18, "hdu_available": 8,
        "cost_per_day_icu": 1600.0,
        "cost_per_day_nicu": 1500.0,
        "cost_per_day_ccu": 1500.0,
        "cost_per_day_hdu": 1200.0,
    },
    {
        "key": "sylhet-mag-osmani",
        "name": "Sylhet MAG Osmani Medical College Hospital",
        "district": "Sylhet",
        "address": "Medical College Road, Sylhet 3100",
        "phone_emergency": "+880-821-713667",
        "phone_general": "+880-821-713667",
        "latitude": 24.8949,
        "longitude": 91.8687,
        "description": (
            "Named after General M. A. G. Osmani, this 900-bed teaching "
            "hospital is the principal tertiary-care center of Sylhet."
        ),
        "icu_total": 20, "icu_available": 4,
        "nicu_total": 8, "nicu_available": 2,
        "ccu_total": 12, "ccu_available": 3,
        "hdu_total": 16, "hdu_available": 7,
        "cost_per_day_icu": 1500.0,
        "cost_per_day_nicu": 1400.0,
        "cost_per_day_ccu": 1400.0,
        "cost_per_day_hdu": 1100.0,
    },
    {
        "key": "cmc-chattogram",
        "name": "Chevron Clinical Laboratory (Chattogram)",
        "district": "Chattogram",
        "address": "12, O.R. Nizam Road, Panchlaish, Chattogram 4203",
        "phone_emergency": "+880-31-656840",
        "phone_general": "+880-31-656840",
        "latitude": 22.3590,
        "longitude": 91.8215,
        "description": (
            "A specialized diagnostic and day-care facility in the port "
            "city, frequently chosen for cardiac and lab diagnostics."
        ),
        "icu_total": 12, "icu_available": 3,
        "nicu_total": 4, "nicu_available": 1,
        "ccu_total": 8, "ccu_available": 2,
        "hdu_total": 10, "hdu_available": 4,
        "cost_per_day_icu": 9000.0,
        "cost_per_day_nicu": 8000.0,
        "cost_per_day_ccu": 8000.0,
        "cost_per_day_hdu": 6000.0,
    },
    {
        "key": "labaid-dhaka",
        "name": "Labaid Specialized Hospital",
        "district": "Dhaka",
        "address": "House 01, Road 04, Dhanmondi, Dhaka 1205",
        "phone_emergency": "+880-2-9676356",
        "phone_general": "+880-2-9676356",
        "latitude": 23.7461,
        "longitude": 90.3732,
        "description": (
            "A 300-bed multidisciplinary hospital in Dhanmondi with a "
            "strong cardiac and oncology program."
        ),
        "icu_total": 24, "icu_available": 5,
        "nicu_total": 8, "nicu_available": 2,
        "ccu_total": 14, "ccu_available": 4,
        "hdu_total": 16, "hdu_available": 7,
        "cost_per_day_icu": 8500.0,
        "cost_per_day_nicu": 7500.0,
        "cost_per_day_ccu": 7500.0,
        "cost_per_day_hdu": 6000.0,
    },
]


async def _ensure_featured_hospitals(db: AsyncSession) -> list[Hospital]:
    """Idempotently seed the curated featured-hospital list.

    Each row is matched by name (since addresses may legitimately vary
    across runs); existing rows have their `is_featured` flag flipped
    back on so re-running the seeder repairs a database that may have
    had the flag cleared by an admin.
    """
    seeded: list[Hospital] = []
    for entry in FEATURED_HOSPITALS:
        existing = (
            await db.execute(
                select(Hospital).where(Hospital.name == entry["name"])
            )
        ).scalar_one_or_none()
        if existing is not None:
            existing.is_featured = True
            existing.is_verified = True
            existing.is_active = True
            seeded.append(existing)
            continue

        h = Hospital(
            name=entry["name"],
            district=entry["district"],
            address=entry["address"],
            phone_emergency=entry["phone_emergency"],
            phone_general=entry["phone_general"],
            latitude=entry["latitude"],
            longitude=entry["longitude"],
            description=entry["description"],
            is_verified=True,
            is_active=True,
            is_featured=True,
        )
        db.add(h)
        await db.flush()

        db.add(BedAvailability(
            hospital_id=h.id,
            icu_total=entry["icu_total"],
            icu_available=entry["icu_available"],
            nicu_total=entry["nicu_total"],
            nicu_available=entry["nicu_available"],
            ccu_total=entry["ccu_total"],
            ccu_available=entry["ccu_available"],
            hdu_total=entry["hdu_total"],
            hdu_available=entry["hdu_available"],
            cost_per_day_icu=entry["cost_per_day_icu"],
            cost_per_day_nicu=entry["cost_per_day_nicu"],
            cost_per_day_ccu=entry["cost_per_day_ccu"],
            cost_per_day_hdu=entry["cost_per_day_hdu"],
            last_updated=datetime.now(tz=timezone.utc),
        ))
        for ft, total in (
            (FacilityType.icu, entry["icu_total"]),
            (FacilityType.nicu, entry["nicu_total"]),
            (FacilityType.ccu, entry["ccu_total"]),
            (FacilityType.hdu, entry["hdu_total"]),
        ):
            db.add(HospitalFacility(
                hospital_id=h.id,
                facility_type=ft,
                total_capacity=total,
                is_active=True,
            ))
        seeded.append(h)
    return seeded


async def main() -> int:
    # Create tables (no-op if migrations already ran).
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        try:
            await _ensure_divisions_and_districts(db)
            admin = await _ensure_super_admin(db)
            hospital = await _ensure_sample_hospital(db, "Dhaka")
            featured = await _ensure_featured_hospitals(db)
            await db.commit()
            print(
                f"Seed OK. system_admin={admin.email} "
                f"sample_hospital_id={hospital.id} "
                f"featured_hospitals={len(featured)}"
            )
        except Exception:
            await db.rollback()
            raise
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
