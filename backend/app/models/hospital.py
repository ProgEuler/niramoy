"""Hospital + HospitalFacility models."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base
from .enums import FacilityType


class Hospital(Base):
    __tablename__ = "hospitals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    district: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    phone_emergency: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    phone_general: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    is_verified: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false", index=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true", index=True
    )

    # OSM source data (kept for traceability of OSM imports).
    osm_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    operator_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    geocoded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # No FK to the districts table — district is stored as a free-form
    # string captured at registration time so the Hospital does not
    # depend on the District reference table.
    facilities: Mapped[List["HospitalFacility"]] = relationship(
        "HospitalFacility", back_populates="hospital", cascade="all, delete-orphan"
    )
    bed_availability = relationship(
        "BedAvailability",
        back_populates="hospital",
        uselist=False,
        cascade="all, delete-orphan",
    )
    admins: Mapped[List["User"]] = relationship(  # noqa: F821
        "User", back_populates="hospital", foreign_keys="User.hospital_id"
    )
    ratings: Mapped["HospitalRating"] = relationship(  # noqa: F821
        "HospitalRating", back_populates="hospital", uselist=False, cascade="all, delete-orphan"
    )
    reviews: Mapped[List["Review"]] = relationship(  # noqa: F821
        "Review", back_populates="hospital", cascade="all, delete-orphan"
    )
    update_history_rows: Mapped[List["UpdateHistory"]] = relationship(  # noqa: F821
        "UpdateHistory", back_populates="hospital", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Hospital id={self.id} name={self.name!r}>"


class HospitalFacility(Base):
    """Per-bed-type capacity a hospital offers."""

    __tablename__ = "hospital_facilities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    hospital_id: Mapped[int] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    facility_type: Mapped[FacilityType] = mapped_column(
        String(16), nullable=False, index=True
    )
    total_capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    hospital = relationship("Hospital", back_populates="facilities")

    __table_args__ = (
        # One row per (hospital, facility_type).
        UniqueConstraint("hospital_id", "facility_type", name="uq_hospital_facility"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<HospitalFacility hospital_id={self.hospital_id} "
            f"type={self.facility_type} total={self.total_capacity}>"
        )
