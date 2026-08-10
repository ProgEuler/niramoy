"""Shared schemas — pagination wrapper, common enums."""

from __future__ import annotations

from typing import Generic, List, TypeVar

from pydantic import BaseModel, ConfigDict, Field


T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard wrapper for every list endpoint."""

    data: List[T]
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    total_count: int = Field(ge=0)
    total_pages: int = Field(ge=0)

    model_config = ConfigDict(from_attributes=True)