"""
SQLAlchemy ORM models.

Models are split per domain in their own files; this `__init__` re-exports
them so callers can `from app.models import User, Hospital, ...` and so
Alembic picks them all up via `Base.metadata`.
"""

from .user import User, UserRole  # noqa: F401
from .division import Division  # noqa: F401
from .district import District  # noqa: F401
from .hospital import (  # noqa: F401
    Hospital,
    HospitalFacility,
    FacilityType,
)
from .bed_availability import BedAvailability  # noqa: F401
from .update_history import UpdateHistory, UpdateStatus, UpdateType  # noqa: F401
from .review import Review, HospitalRating  # noqa: F401
from .ambulance import Ambulance, AmbulanceType  # noqa: F401


__all__ = [
    "User",
    "UserRole",
    "Division",
    "District",
    "Hospital",
    "HospitalFacility",
    "FacilityType",
    "BedAvailability",
    "UpdateHistory",
    "UpdateStatus",
    "UpdateType",
    "Review",
    "HospitalRating",
    "Ambulance",
    "AmbulanceType",
]
