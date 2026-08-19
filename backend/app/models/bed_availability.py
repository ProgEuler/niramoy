"""Bed availability — one row per hospital updating in real-time."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class BedAvailability(Base):
    __tablename__ = "bed_availability"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    hospital_id: Mapped[int] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    icu_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    icu_available: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    nicu_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    nicu_available: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ccu_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ccu_available: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    hdu_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    hdu_available: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    cost_per_day_icu: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cost_per_day_nicu: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cost_per_day_ccu: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cost_per_day_hdu: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
    updated_by_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    hospital = relationship("Hospital", back_populates="bed_availability")

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<BedAvailability hospital_id={self.hospital_id} "
            f"icu={self.icu_available}/{self.icu_total}>"
        )
