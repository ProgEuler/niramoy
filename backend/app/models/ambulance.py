"""Ambulance directory entries."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base
from .enums import AmbulanceType


class Ambulance(Base):
    __tablename__ = "ambulances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    organization: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    district_id: Mapped[int] = mapped_column(
        ForeignKey("districts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    phone: Mapped[str] = mapped_column(String(40), nullable=False)
    type: Mapped[AmbulanceType] = mapped_column(String(16), nullable=False, index=True)
    is_24h: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true", index=True
    )

    district = relationship("District", back_populates="ambulances")
