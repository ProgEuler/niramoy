"""Pagination math shared by list endpoints."""

from __future__ import annotations

from typing import List, Sequence, Tuple, TypeVar


T = TypeVar("T")


def paginate(seq: Sequence[T], page: int, page_size: int) -> Tuple[List[T], int, int]:
    """Slice a sequence and compute total_pages. Returns (sliced, total, total_pages)."""
    total = len(seq)
    start = (page - 1) * page_size
    end = start + page_size
    total_pages = (total + page_size - 1) // page_size if total else 0
    return list(seq[start:end]), total, total_pages


def total_pages_for(total_count: int, page_size: int) -> int:
    return (total_count + page_size - 1) // page_size if total_count else 0