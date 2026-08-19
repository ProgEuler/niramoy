"""Bed availability + pricing schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class BedAvailabilityOut(BaseModel):
    hospital_id: int
    icu_total: int
    icu_available: int
    nicu_total: int
    nicu_available: int
    ccu_total: int
    ccu_available: int
    hdu_total: int
    hdu_available: int
    cost_per_day_icu: float
    cost_per_day_nicu: float
    cost_per_day_ccu: float
    cost_per_day_hdu: float
    last_updated: datetime
    is_stale: bool = False

    model_config = ConfigDict(from_attributes=True)


class BedUpdateIn(BaseModel):
    icu_available: Optional[int] = Field(default=None, ge=0)
    nicu_available: Optional[int] = Field(default=None, ge=0)
    ccu_available: Optional[int] = Field(default=None, ge=0)
    hdu_available: Optional[int] = Field(default=None, ge=0)
    note: Optional[str] = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _at_least_one(self) -> "BedUpdateIn":
        if all(
            v is None for v in (self.icu_available, self.nicu_available, self.ccu_available, self.hdu_available)
        ):
            raise ValueError("At least one bed-type value must be provided")
        return self


class BedUpdateResult(BaseModel):
    status: str  # "live" or "pending"
    updated_at: Optional[datetime] = None
    message: Optional[str] = None


# ── Pricing ─────────────────────────────────────────────────────────────


class PricingOut(BaseModel):
    cost_per_day_icu: float
    cost_per_day_nicu: float
    cost_per_day_ccu: float
    cost_per_day_hdu: float

    model_config = ConfigDict(from_attributes=True)


class PricingUpdateIn(BaseModel):
    cost_icu: Optional[float] = Field(default=None, gt=0)
    cost_nicu: Optional[float] = Field(default=None, gt=0)
    cost_ccu: Optional[float] = Field(default=None, gt=0)
    cost_hdu: Optional[float] = Field(default=None, gt=0)

    @model_validator(mode="after")
    def _at_least_one(self) -> "PricingUpdateIn":
        if all(v is None for v in (self.cost_icu, self.cost_nicu, self.cost_ccu, self.cost_hdu)):
            raise ValueError("At least one cost field must be provided")
        return self