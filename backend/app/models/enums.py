"""Shared Python enums mapped to Postgres ENUM columns."""

from __future__ import annotations

import enum


class UserRole(str, enum.Enum):
    patient = "patient"
    hospital_admin = "hospital_admin"
    system_admin = "system_admin"


class FacilityType(str, enum.Enum):
    icu = "ICU"
    nicu = "NICU"
    ccu = "CCU"
    hdu = "HDU"


class UpdateType(str, enum.Enum):
    BedCount = "BedCount"
    Pricing = "Pricing"
    Profile = "Profile"


class UpdateStatus(str, enum.Enum):
    Live = "Live"
    Pending = "Pending"
    Rejected = "Rejected"


class AmbulanceType(str, enum.Enum):
    Government = "Government"
    Private = "Private"
    NGO = "NGO"
