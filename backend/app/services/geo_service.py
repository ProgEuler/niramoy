"""
Geographic helpers — pure Python Haversine.

We deliberately do NOT pull in PostGIS or any geo library. The dataset is
small enough to filter by bounding box in SQL and then refine with
Haversine in Python.
"""

from __future__ import annotations

from datetime import datetime, timezone
from math import atan2, cos, radians, sin, sqrt
from typing import Iterable, List, Tuple


EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance between two lat/lng points in kilometres."""
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return EARTH_RADIUS_KM * 2 * atan2(sqrt(a), sqrt(1 - a))


def filter_by_radius(
    points: Iterable[Tuple[int, float, float]],
    *,
    lat: float,
    lng: float,
    radius_km: float,
) -> List[Tuple[int, float]]:
    """
    `points` is an iterable of (id, lat, lng). Returns list of (id, distance_km)
    for points within `radius_km` of (lat, lng), sorted by distance ascending.
    Points missing coordinates are silently skipped.
    """
    out: List[Tuple[int, float]] = []
    for pid, plat, plng in points:
        if plat is None or plng is None:
            continue
        d = haversine_km(lat, lng, plat, plng)
        if d <= radius_km:
            out.append((pid, d))
    out.sort(key=lambda x: x[1])
    return out


def in_bounding_box(
    lat: float, lng: float, sw_lat: float, sw_lng: float, ne_lat: float, ne_lng: float
) -> bool:
    return sw_lat <= lat <= ne_lat and sw_lng <= lng <= ne_lng


def _tz_aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def is_stale(last_updated: datetime | None, stale_hours: int) -> bool:
    if last_updated is None:
        return True
    now = datetime.now(tz=timezone.utc)
    return (now - _tz_aware(last_updated)).total_seconds() > stale_hours * 3600


_BED_TYPES = ("icu", "nicu", "ccu", "hdu")


def _availability_color_for_pair(available: int, total: int) -> str:
    if total <= 0:
        return "red"
    pct = available / total
    if pct > 0.5:
        return "green"
    if pct >= 0.1:
        return "orange"
    return "red"


_RANK = {"green": 3, "orange": 2, "red": 1, "grey": 0}


def availability_color(
    *,
    bed_row,
    last_updated: datetime | None,
    stale_hours: int,
) -> str:
    """
    Worst colour across ICU/NICU/CCU/HDU.
    Grey overrides everything if the row is stale.
    """
    if is_stale(last_updated, stale_hours):
        return "grey"
    if bed_row is None:
        return "red"
    worst = "green"
    for bt in _BED_TYPES:
        avail = getattr(bed_row, f"{bt}_available", 0) or 0
        total = getattr(bed_row, f"{bt}_total", 0) or 0
        c = _availability_color_for_pair(avail, total)
        if _RANK[c] < _RANK[worst]:
            worst = c
    return worst
