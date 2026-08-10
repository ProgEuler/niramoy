"""Shared utility helpers."""

from __future__ import annotations

from typing import Any


def enum_value(x: Any) -> str:
    """Safely extract `.value` from an enum-like, or return the input as-is.

    SQLAlchemy enum columns return Enum instances, but Pydantic-validated
    objects sometimes already contain the raw value. This helper normalises
    both cases.
    """
    return x.value if hasattr(x, "value") else x
