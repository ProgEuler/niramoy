"""Update-history response + admin moderation request schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from ..models.enums import UpdateStatus, UpdateType


class UpdateHistoryOut(BaseModel):
    id: int
    hospital_id: int
    updated_by_user_id: Optional[int]
    update_type: UpdateType
    field_name: Optional[str]
    previous_value: Optional[str]
    new_value: Optional[str]
    note: Optional[str]
    status: UpdateStatus
    rejection_reason: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UpdateApprovalIn(BaseModel):
    note: Optional[str] = Field(default=None, max_length=500)


class UpdateRejectionIn(BaseModel):
    reason: str = Field(min_length=1, max_length=500)