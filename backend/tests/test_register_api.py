"""
Tests for POST /api/auth/register.

The suite pins the contract of the register endpoint and exercises the
registration service / router end-to-end via an in-memory SQLite engine
and an httpx ASGI client. Happy path, Pydantic 422s, business 400s, the
edge cases (case-insensitive email, dedup of facility_types, username
uniqueness), and atomicity are all covered.
"""

from __future__ import annotations

from typing import Any

from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    BedAvailability,
    Hospital,
    HospitalFacility,
    User,
    UserRole,
)
from app.models.enums import FacilityType
from tests.conftest import insert_user


# ── Helpers ────────────────────────────────────────────────────────────


def make_payload(**overrides: Any) -> dict[str, Any]:
    """Return a valid registration payload, with optional field overrides."""
    payload: dict[str, Any] = {
        "hospital_name": "Test Hospital",
        "district_name": "Dhaka",
        "address": "123 Test Street, Dhaka",
        "phone_emergency": "+8801700000000",
        "phone_general": "+8801800000000",
        "lat": 23.78,
        "lng": 90.41,
        "facility_types": ["ICU", "NICU", "CCU", "HDU"],
        "capacities": {"ICU": 5, "NICU": 3, "CCU": 4, "HDU": 6},
        "admin_name": "test_admin",
        "admin_email": "admin@testhospital.com",
        "admin_password": "SecurePass123!",
    }
    payload.update(overrides)
    return payload


async def _first_detail(response_json: dict) -> str:
    """Return the first error message from a 422 response (structured or raw)."""
    errors = response_json.get("errors")
    if isinstance(errors, list) and errors:
        return errors[0]["message"]
    detail = response_json.get("detail")
    if isinstance(detail, list) and detail:
        return detail[0].get("msg", "")
    return ""


# ── Happy path ─────────────────────────────────────────────────────────


async def test_register_happy_path_creates_hospital_and_admin(
    client: AsyncClient, db_session: AsyncSession
):
    res = await client.post("/api/auth/register", json=make_payload())
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["message"] == "Registration received. Pending review."
    assert isinstance(body["hospital_id"], int)

    # Hospital exists.
    hospital = (
        await db_session.execute(
            select(Hospital).where(Hospital.id == body["hospital_id"])
        )
    ).scalar_one()
    assert hospital.name == "Test Hospital"
    assert hospital.district == "Dhaka"
    assert hospital.is_verified is False
    assert hospital.is_active is True

    # Admin user exists and is linked.
    admin = (
        await db_session.execute(
            select(User).where(User.email == "admin@testhospital.com")
        )
    ).scalar_one()
    assert admin.role == UserRole.hospital_admin
    assert admin.hospital_id == hospital.id
    assert admin.is_active is True
    # Password is hashed, not stored in plaintext.
    assert admin.password_hash != "SecurePass123!"
    assert admin.password_hash.startswith("$")

    # Facilities all created.
    facilities = (
        await db_session.execute(
            select(HospitalFacility).where(HospitalFacility.hospital_id == hospital.id)
        )
    ).scalars().all()
    facility_types = {f.facility_type for f in facilities}
    assert facility_types == {FacilityType.icu, FacilityType.nicu, FacilityType.ccu, FacilityType.hdu}

    # Bed availability row matches the capacities.
    bed = (
        await db_session.execute(
            select(BedAvailability).where(BedAvailability.hospital_id == hospital.id)
        )
    ).scalar_one()
    assert bed.icu_total == 5
    assert bed.nicu_total == 3
    assert bed.ccu_total == 4
    assert bed.hdu_total == 6


async def test_register_response_shape(client: AsyncClient):
    res = await client.post("/api/auth/register", json=make_payload())
    assert res.status_code == 201
    body = res.json()
    assert set(body.keys()) == {"message", "hospital_id"}
    assert isinstance(body["message"], str)
    assert isinstance(body["hospital_id"], int)


async def test_register_accepts_arbitrary_district_string(client: AsyncClient, db_session: AsyncSession):
    """District is denormalized to a free-text column — any string is accepted.

    Previously the service rejected unknown district names with a 400; the
    model now stores whatever string the payload provides, so a value like
    "Atlantis" should persist verbatim.
    """
    res = await client.post(
        "/api/auth/register",
        json=make_payload(district_name="Atlantis"),
    )
    assert res.status_code == 201, res.text

    hospital = (
        await db_session.execute(
            select(Hospital).where(Hospital.id == res.json()["hospital_id"])
        )
    ).scalar_one()
    assert hospital.district == "Atlantis"


# ── Pydantic 422s ──────────────────────────────────────────────────────


async def test_register_short_hospital_name(client: AsyncClient):
    res = await client.post("/api/auth/register", json=make_payload(hospital_name="A"))
    assert res.status_code == 422


async def test_register_short_admin_name(client: AsyncClient):
    res = await client.post("/api/auth/register", json=make_payload(admin_name="ab"))
    assert res.status_code == 422


async def test_register_short_password(client: AsyncClient):
    res = await client.post("/api/auth/register", json=make_payload(admin_password="short1"))
    assert res.status_code == 422


async def test_register_long_password(client: AsyncClient):
    res = await client.post(
        "/api/auth/register",
        json=make_payload(admin_password="x" * 129),
    )
    assert res.status_code == 422


async def test_register_invalid_email(client: AsyncClient):
    res = await client.post(
        "/api/auth/register", json=make_payload(admin_email="not-an-email")
    )
    assert res.status_code == 422


async def test_register_invalid_lat_lng(client: AsyncClient):
    res = await client.post(
        "/api/auth/register",
        json=make_payload(lat=200.0, lng=-999.0),
    )
    assert res.status_code == 422


async def test_register_empty_facility_types(client: AsyncClient):
    res = await client.post(
        "/api/auth/register", json=make_payload(facility_types=[], capacities={})
    )
    assert res.status_code == 422
    detail = await _first_detail(res.json())
    assert "facility_type" in detail.lower()


async def test_register_capacity_for_unselected_facility(client: AsyncClient):
    res = await client.post(
        "/api/auth/register",
        json=make_payload(
            facility_types=["ICU"],
            capacities={"ICU": 5, "NICU": 2},
        ),
    )
    assert res.status_code == 422


async def test_register_negative_capacity(client: AsyncClient):
    res = await client.post(
        "/api/auth/register",
        json=make_payload(
            facility_types=["ICU"],
            capacities={"ICU": -1},
        ),
    )
    assert res.status_code == 422


# ── Business 400s ──────────────────────────────────────────────────────


async def test_register_duplicate_email_400_hints_email_field(client: AsyncClient, db_session: AsyncSession):
    await insert_user(
        db_session,
        email="admin@testhospital.com",
        username="seed_admin",
    )
    res = await client.post("/api/auth/register", json=make_payload())
    assert res.status_code == 400
    assert res.headers.get("x-error-field") == "admin_email"


async def test_register_duplicate_username_400_hints_username_field(client: AsyncClient, db_session: AsyncSession):
    await insert_user(
        db_session,
        email="seed@testhospital.com",
        username="test_admin",
    )
    res = await client.post(
        "/api/auth/register",
        json=make_payload(admin_email="different@testhospital.com"),
    )
    assert res.status_code == 400
    assert res.headers.get("x-error-field") == "admin_name"


async def test_register_duplicate_email(client: AsyncClient, db_session: AsyncSession):
    await insert_user(
        db_session,
        email="admin@testhospital.com",
        username="other_admin",
    )
    res = await client.post("/api/auth/register", json=make_payload())
    assert res.status_code == 400
    assert "email" in res.json()["detail"].lower()


async def test_register_duplicate_email_case_insensitive(
    client: AsyncClient, db_session: AsyncSession
):
    """Email comparison must be case-insensitive so users don't slip through."""
    await insert_user(
        db_session,
        email="admin@testhospital.com",
        username="seed_admin",
    )
    res = await client.post(
        "/api/auth/register",
        json=make_payload(admin_email="ADMIN@TESTHOSPITAL.COM"),
    )
    assert res.status_code == 400
    assert "email" in res.json()["detail"].lower()


async def test_register_duplicate_username(client: AsyncClient, db_session: AsyncSession):
    """Username is unique in the DB; the service must surface 400, not 500."""
    await insert_user(
        db_session,
        email="seed@testhospital.com",
        username="test_admin",
    )
    res = await client.post(
        "/api/auth/register",
        json=make_payload(admin_email="different@testhospital.com"),
    )
    assert res.status_code == 400
    assert "username" in res.json()["detail"].lower()


async def test_register_duplicate_facility_types_dedup(
    client: AsyncClient, db_session: AsyncSession
):
    """Duplicate facility_types entries should be deduplicated, not stored twice."""
    res = await client.post(
        "/api/auth/register",
        json=make_payload(
            facility_types=["ICU", "ICU", "NICU"],
            capacities={"ICU": 5, "NICU": 3},
        ),
    )
    assert res.status_code == 201, res.text

    hospital_id = res.json()["hospital_id"]
    facilities = (
        await db_session.execute(
            select(HospitalFacility).where(HospitalFacility.hospital_id == hospital_id)
        )
    ).scalars().all()
    facility_types = [f.facility_type for f in facilities]
    # Two unique facility types only.
    assert sorted(facility_types) == sorted([FacilityType.icu, FacilityType.nicu])


# ── Atomicity ──────────────────────────────────────────────────────────


async def test_register_failed_business_check_does_not_leak_partial_state(
    client: AsyncClient, db_session: AsyncSession
):
    """A duplicate-email rejection must leave no Hospital or BedAvailability row."""
    await insert_user(
        db_session,
        email="admin@testhospital.com",
        username="seed_admin",
    )

    # Count hospitals before and after.
    before = (
        await db_session.execute(select(func.count(Hospital.id)))
    ).scalar_one()
    before_beds = (
        await db_session.execute(select(func.count(BedAvailability.id)))
    ).scalar_one()

    res = await client.post("/api/auth/register", json=make_payload())
    assert res.status_code == 400

    after = (
        await db_session.execute(select(func.count(Hospital.id)))
    ).scalar_one()
    after_beds = (
        await db_session.execute(select(func.count(BedAvailability.id)))
    ).scalar_one()

    assert before == after
    assert before_beds == after_beds
