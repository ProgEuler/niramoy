"""Audit log of every change — bed counts, pricing, profile."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base
from .enums import UpdateStatus, UpdateType


class UpdateHistory(Base):
    __tablename__ = "update_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    hospital_id: Mapped[int] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    updated_by_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    update_type: Mapped[UpdateType] = mapped_column(String(32), nullable=False, index=True)
    field_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    previous_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[UpdateStatus] = mapped_column(
        String(16),
        nullable=False,
        default=UpdateStatus.Live,
        server_default=UpdateStatus.Live.value,
        index=True,
    )
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    hospital = relationship("Hospital", back_populates="update_history_rows")
    updater = relationship("User", foreign_keys=[updated_by_user_id])

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<UpdateHistory id={self.id} hospital_id={self.hospital_id} "
            f"type={self.update_type} status={self.status}>"
        )
