"""Shared ORM → DTO serializers."""

from __future__ import annotations

from ..core.config import settings
from ..models import Hospital
from ..schemas.hospital import HospitalSummaryOut
from .geo_service import availability_color


def hospital_to_summary(h: Hospital) -> HospitalSummaryOut:
    """Single source of truth for converting a Hospital row into a summary DTO.

    Public and admin routers both call this — keeps the shape consistent.
    """
    bed = getattr(h, "bed_availability", None)
    rating = getattr(h, "ratings", None)
    last_updated = bed.last_updated if bed else None
    color = availability_color(
        bed_row=bed,
        last_updated=last_updated,
        stale_hours=settings.stale_threshold_hours,
    )
    from ..services.geo_service import is_stale as _is_stale

    return HospitalSummaryOut(
        id=h.id,
        name=h.name,
        address=h.address,
        district=h.district,
        division=None,
        latitude=h.latitude,
        longitude=h.longitude,
        is_verified=h.is_verified,
        is_active=h.is_active,
        icu_total=bed.icu_total if bed else 0,
        icu_available=bed.icu_available if bed else 0,
        nicu_total=bed.nicu_total if bed else 0,
        nicu_available=bed.nicu_available if bed else 0,
        ccu_total=bed.ccu_total if bed else 0,
        ccu_available=bed.ccu_available if bed else 0,
        hdu_total=bed.hdu_total if bed else 0,
        hdu_available=bed.hdu_available if bed else 0,
        cost_per_day_icu=bed.cost_per_day_icu if bed else 0.0,
        cost_per_day_nicu=bed.cost_per_day_nicu if bed else 0.0,
        cost_per_day_ccu=bed.cost_per_day_ccu if bed else 0.0,
        cost_per_day_hdu=bed.cost_per_day_hdu if bed else 0.0,
        average_rating=rating.average_rating if rating else 0.0,
        total_reviews=rating.total_reviews if rating else 0,
        last_updated=last_updated,
        is_stale=_is_stale(last_updated, settings.stale_threshold_hours),
        availability_color=color,
        is_featured=h.is_featured,
        description=h.description,
    )