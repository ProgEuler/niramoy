"""District model — belongs to a division."""

from __future__ import annotations

from typing import List

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class District(Base):
    __tablename__ = "districts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    division_id: Mapped[int] = mapped_column(
        ForeignKey("divisions.id", ondelete="CASCADE"), nullable=False, index=True
    )

    division = relationship("Division", back_populates="districts")
    # No `hospitals` relationship — Hospital.district is a free-text column,
    # not an FK to districts.id, so SQLAlchemy cannot infer a join condition.
    ambulances: Mapped[List["Ambulance"]] = relationship(  # noqa: F821
        "Ambulance", back_populates="district"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<District id={self.id} name={self.name!r}>"
