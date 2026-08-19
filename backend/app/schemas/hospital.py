"""Hospital-related request/response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from ..models.enums import FacilityType, UserRole


# ── Public-facing hospital output ──────────────────────────────────────


class HospitalBase(BaseModel):
    id: int
    name: str
    address: str
    phone_emergency: Optional[str] = None
    phone_general: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    is_verified: bool
    is_active: bool
    district: str
    division: Optional[str] = None  # populated when a division can be inferred
    osm_id: Optional[int] = None
    operator_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HospitalOut(HospitalBase):
    """Full hospital detail — used by GET /api/public/hospitals/{id}."""

    facilities: List[str] = Field(default_factory=list)
    average_rating: float = 0.0
    total_reviews: int = 0
    icu_total: int = 0
    icu_available: int = 0
    nicu_total: int = 0
    nicu_available: int = 0
    ccu_total: int = 0
    ccu_available: int = 0
    hdu_total: int = 0
    hdu_available: int = 0
    cost_per_day_icu: float = 0.0
    cost_per_day_nicu: float = 0.0
    cost_per_day_ccu: float = 0.0
    cost_per_day_hdu: float = 0.0
    is_stale: bool = False
    last_updated: Optional[datetime] = None
    distance_km: Optional[float] = None
    availability_color: Optional[str] = None


class HospitalSummaryOut(BaseModel):
    """Lightweight card — used by map + search list."""

    id: int
    name: str
    address: str
    district: str
    division: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_verified: bool
    is_active: bool
    icu_total: int = 0
    icu_available: int = 0
    nicu_total: int = 0
    nicu_available: int = 0
    ccu_total: int = 0
    ccu_available: int = 0
    hdu_total: int = 0
    hdu_available: int = 0
    cost_per_day_icu: float = 0.0
    cost_per_day_nicu: float = 0.0
    cost_per_day_ccu: float = 0.0
    cost_per_day_hdu: float = 0.0
    average_rating: float = 0.0
    total_reviews: int = 0
    last_updated: Optional[datetime] = None
    is_stale: bool = False
    availability_color: Optional[str] = None
    distance_km: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class HospitalAdminOut(BaseModel):
    """Admin user attached to a hospital."""

    id: int
    username: str
    email: EmailStr
    role: UserRole
    is_active: bool
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ── Public registration ───────────────────────────────────────────────


class HospitalCreate(BaseModel):
    """Used by system_admin to create a hospital directly (OSM imports etc.)."""

    name: str = Field(min_length=2, max_length=255)
    district: str = Field(min_length=2, max_length=100)
    address: str = Field(min_length=2, max_length=500)
    phone_emergency: Optional[str] = Field(default=None, max_length=40)
    phone_general: Optional[str] = Field(default=None, max_length=40)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    description: Optional[str] = None
    photo_url: Optional[str] = Field(default=None, max_length=500)
    osm_id: Optional[int] = None
    operator_name: Optional[str] = Field(default=None, max_length=255)
    facility_types: List[FacilityType] = Field(default_factory=list)
    is_verified: bool = False


class HospitalAdminCreate(BaseModel):
    """Public self-service registration form for hospital admins."""

    hospital_name: str = Field(min_length=2, max_length=255)
    district_name: str = Field(min_length=2, max_length=100)
    address: str = Field(min_length=2, max_length=500)
    phone_emergency: Optional[str] = Field(default=None, max_length=40)
    phone_general: Optional[str] = Field(default=None, max_length=40)
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)
    facility_types: List[FacilityType]
    capacities: dict[FacilityType, int] = Field(default_factory=dict)
    admin_name: str = Field(min_length=3, max_length=50)
    admin_email: EmailStr
    admin_password: str = Field(min_length=8, max_length=128)

    @model_validator(mode="after")
    def _validate(self) -> "HospitalAdminCreate":
        if not self.facility_types:
            raise ValueError("At least one facility_type is required")
        for ft, cap in self.capacities.items():
            if cap < 0:
                raise ValueError(
                    f"Capacity for {ft.value} must be >= 0"
                )
            if ft not in self.facility_types:
                raise ValueError(
                    f"Capacity provided for unselected facility {ft.value}"
                )
        return self


class RegistrationOut(BaseModel):
    """Response payload for POST /api/auth/register (legacy combined flow)."""

    message: str
    hospital_id: int


class HospitalSelfRegisterIn(BaseModel):
    """
    Step 2 of the hospital-admin registration flow.
    The calling user is already authenticated as hospital_admin;
    this creates the hospital profile and links it to their account.
    """

    hospital_name: str = Field(min_length=2, max_length=255)
    district_name: str = Field(min_length=2, max_length=100)
    address: str = Field(min_length=2, max_length=500)
    phone_emergency: Optional[str] = Field(default=None, max_length=40)
    phone_general: Optional[str] = Field(default=None, max_length=40)
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)
    facility_types: List[FacilityType]
    capacities: dict[FacilityType, int] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _validate(self) -> "HospitalSelfRegisterIn":
        if not self.facility_types:
            raise ValueError("At least one facility_type is required")
        for ft, cap in self.capacities.items():
            if cap < 0:
                raise ValueError(f"Capacity for {ft.value} must be >= 0")
            if ft not in self.facility_types:
                raise ValueError(
                    f"Capacity provided for unselected facility {ft.value}"
                )
        return self


class HospitalSelfRegisterOut(BaseModel):
    """Response payload for POST /api/auth/register-hospital."""

    message: str
    hospital_id: int


# ── Profile & full update ─────────────────────────────────────────────


class HospitalProfileOut(BaseModel):
    id: int
    name: str
    address: str
    phone_emergency: Optional[str] = None
    phone_general: Optional[str] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geocoded_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class HospitalProfileUpdate(BaseModel):
    """Hospital admin can edit profile fields except name."""

    address: Optional[str] = Field(default=None, min_length=2, max_length=500)
    phone_emergency: Optional[str] = Field(default=None, max_length=40)
    phone_general: Optional[str] = Field(default=None, max_length=40)
    description: Optional[str] = None
    photo_url: Optional[str] = Field(default=None, max_length=500)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)


class HospitalUpdate(BaseModel):
    """System admin full update — name allowed."""

    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    address: Optional[str] = Field(default=None, min_length=2, max_length=500)
    phone_emergency: Optional[str] = Field(default=None, max_length=40)
    phone_general: Optional[str] = Field(default=None, max_length=40)
    description: Optional[str] = None
    photo_url: Optional[str] = Field(default=None, max_length=500)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    is_verified: Optional[bool] = None
    is_active: Optional[bool] = None
    district: Optional[str] = Field(default=None, min_length=2, max_length=100)


# ── System admin — suspend, verify ────────────────────────────────────


class VerifyIn(BaseModel):
    is_verified: bool


class SuspendIn(BaseModel):
    is_suspended: bool
    reason: str = Field(min_length=1, max_length=500)


# ── User management ────────────────────────────────────────────────────


class AdminUserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)