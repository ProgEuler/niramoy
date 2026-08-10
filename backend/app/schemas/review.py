"""Review-related request/response schemas."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=2000)