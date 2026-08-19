"""
Public router — /api/public/*

No authentication. Anyone can read these endpoints.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..core.config import settings
from ..core.dependencies import require_patient
from ..core.pagination import paginate, total_pages_for
from ..database import get_db
from ..models import (
    Ambulance,
    District,
    Division,
    Hospital,
    HospitalRating,
    Review,
    UpdateHistory,
    User,
)
from ..schemas.common import PaginatedResponse
from ..schemas.hospital import HospitalOut, HospitalSummaryOut
from ..schemas.review import ReviewCreate
from ..core.utils import enum_value
from ..services.geo_service import (
    availability_color,
    filter_by_radius,
    haversine_km,
    in_bounding_box,
    is_stale,
)
from ..services.serializers import hospital_to_summary


router = APIRouter(prefix="/api/public", tags=["public"])


_STATS_CACHE_VALUE: Optional[dict] = None
_STATS_CACHE_EXPIRES: float = 0.0
_STATS_TTL_SEC = 60


async def _query_verified_active_hospitals(db: AsyncSession) -> List[Hospital]:
    """Returns verified+active hospitals with their bed row eagerly loaded."""
    result = await db.execute(
        select(Hospital)
        .where(Hospital.is_verified.is_(True), Hospital.is_active.is_(True))
        .options(
            selectinload(Hospital.bed_availability),
            selectinload(Hospital.ratings),
        )
    )
    return list(result.scalars().all())


# ── /hospitals/map ─────────────────────────────────────────────────────


@router.get("/hospitals/map", response_model=PaginatedResponse[HospitalSummaryOut])
async def map_hospitals(
    db: AsyncSession = Depends(get_db),
    sw_lat: float = Query(...),
    sw_lng: float = Query(...),
    ne_lat: float = Query(...),
    ne_lng: float = Query(...),
    bed_type: Optional[str] = Query(None, description="icu|nicu|ccu|hdu"),
    available_only: bool = Query(False),
    district: Optional[str] = None,
    cost_min: Optional[float] = None,
    cost_max: Optional[float] = None,
    min_rating: Optional[float] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
) -> PaginatedResponse[HospitalSummaryOut]:
    candidates = await _query_verified_active_hospitals(db)
    out: List[HospitalSummaryOut] = []
    for h in candidates:
        if h.latitude is None or h.longitude is None:
            continue
        if not in_bounding_box(h.latitude, h.longitude, sw_lat, sw_lng, ne_lat, ne_lng):
            continue
        if district is not None and h.district.lower() != district.lower():
            continue
        s = hospital_to_summary(h)
        if bed_type:
            total = getattr(s, f"{bed_type}_total")
            avail = getattr(s, f"{bed_type}_available")
            if total <= 0:
                continue
            if available_only and avail <= 0:
                continue
        if min_rating is not None and s.average_rating < min_rating:
            continue
        if cost_min is not None or cost_max is not None:
            prices = [s.cost_per_day_icu, s.cost_per_day_nicu, s.cost_per_day_ccu, s.cost_per_day_hdu]
            prices = [p for p in prices if p > 0]
            if not prices:
                continue
            if cost_min is not None and min(prices) < cost_min:
                continue
            if cost_max is not None and min(prices) > cost_max:
                continue
        out.append(s)

    sliced, total, _ = paginate(out, page, page_size)
    return PaginatedResponse[HospitalSummaryOut](
        data=sliced,
        page=page,
        page_size=page_size,
        total_count=total,
        total_pages=total_pages_for(total, page_size),
    )


# ── /hospitals/nearby ──────────────────────────────────────────────────


@router.get("/hospitals/nearby")
async def nearby_hospitals(
    db: AsyncSession = Depends(get_db),
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(..., gt=0, le=500),
    bed_type: Optional[str] = Query(None),
    available_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
) -> dict:
    candidates = await _query_verified_active_hospitals(db)
    points = []
    for h in candidates:
        if h.latitude is None or h.longitude is None:
            continue
        points.append((h.id, h.latitude, h.longitude))

    distances = dict(filter_by_radius(points, lat=lat, lng=lng, radius_km=radius_km))
    if not distances:
        return {
            "data": [],
            "page": page,
            "page_size": page_size,
            "total_count": 0,
            "total_pages": 0,
        }

    by_id = {h.id: h for h in candidates}
    out = []
    for hid, dist in distances.items():
        h = by_id.get(hid)
        if h is None:
            continue
        s = hospital_to_summary(h)
        s.distance_km = round(dist, 3)
        if bed_type:
            total = getattr(s, f"{bed_type}_total")
            avail = getattr(s, f"{bed_type}_available")
            if total <= 0:
                continue
            if available_only and avail <= 0:
                continue
        out.append(s)

    sliced, total, _ = paginate(out, page, page_size)
    return {
        "data": [s.model_dump(mode="json") for s in sliced],
        "page": page,
        "page_size": page_size,
        "total_count": total,
        "total_pages": total_pages_for(total, page_size),
    }


# ── /hospitals/{id} ────────────────────────────────────────────────────


@router.get("/hospitals/{hospital_id}", response_model=HospitalOut)
async def get_hospital_public(
    hospital_id: int,
    db: AsyncSession = Depends(get_db),
) -> HospitalOut:
    result = await db.execute(
        select(Hospital)
        .where(
            Hospital.id == hospital_id,
            Hospital.is_verified.is_(True),
            Hospital.is_active.is_(True),
        )
        .options(
            selectinload(Hospital.bed_availability),
            selectinload(Hospital.facilities),
            selectinload(Hospital.ratings),
            selectinload(Hospital.reviews),
        )
    )
    h = result.scalar_one_or_none()
    if h is None:
        raise HTTPException(status_code=404, detail="Hospital not found")

    bed = h.bed_availability
    last_updated = bed.last_updated if bed else None
    stale = is_stale(last_updated, settings.stale_threshold_hours)

    # 7-day availability trend from UpdateHistory.
    cutoff_dt = datetime.now(tz=timezone.utc).replace(microsecond=0)
    cutoff = cutoff_dt.timestamp() - 7 * 24 * 3600
    trend_rows = (
        await db.execute(
            select(
                func.date_trunc("day", UpdateHistory.created_at).label("day"),
                func.count(UpdateHistory.id),
            )
            .where(
                UpdateHistory.hospital_id == h.id,
                UpdateHistory.created_at >= datetime.fromtimestamp(cutoff, tz=timezone.utc),
            )
            .group_by("day")
            .order_by("day")
        )
    ).all()

    return HospitalOut(
        id=h.id,
        name=h.name,
        address=h.address,
        phone_emergency=h.phone_emergency,
        phone_general=h.phone_general,
        latitude=h.latitude,
        longitude=h.longitude,
        description=h.description,
        photo_url=h.photo_url,
        is_verified=h.is_verified,
        is_active=h.is_active,
        district=h.district,
        division=None,
        osm_id=h.osm_id,
        operator_name=h.operator_name,
        created_at=h.created_at,
        updated_at=h.updated_at,
        facilities=[
            f.facility_type.value if hasattr(f.facility_type, "value") else f.facility_type
            for f in h.facilities
        ],
        average_rating=h.ratings.average_rating if h.ratings else 0.0,
        total_reviews=h.ratings.total_reviews if h.ratings else 0,
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
        last_updated=last_updated,
        is_stale=stale,
        availability_color=availability_color(
            bed_row=bed,
            last_updated=last_updated,
            stale_hours=settings.stale_threshold_hours,
        ),
    )


# ── Reviews ────────────────────────────────────────────────────────────


@router.get("/hospitals/{hospital_id}/reviews", response_model=PaginatedResponse[dict])
async def list_reviews(
    hospital_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    exists = (
        await db.execute(
            select(Hospital.id).where(
                Hospital.id == hospital_id,
                Hospital.is_verified.is_(True),
                Hospital.is_active.is_(True),
            )
        )
    ).scalar_one_or_none()
    if exists is None:
        raise HTTPException(status_code=404, detail="Hospital not found")

    total = int(
        (
            await db.execute(
                select(func.count(Review.id)).where(Review.hospital_id == hospital_id)
            )
        ).scalar_one()
        or 0
    )
    rows = (
        await db.execute(
            select(Review, User.username)
            .join(User, User.id == Review.user_id)
            .where(Review.hospital_id == hospital_id)
            .order_by(Review.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    data = [
        {
            "id": r.id,
            "user_id": r.user_id,
            "username": uname,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for (r, uname) in rows
    ]
    return PaginatedResponse[dict](
        data=data,
        page=page,
        page_size=page_size,
        total_count=total,
        total_pages=total_pages_for(total, page_size),
    )


@router.post("/hospitals/{hospital_id}/reviews", status_code=status.HTTP_201_CREATED)
async def post_review(
    hospital_id: int,
    payload: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_patient),
):
    exists = (
        await db.execute(
            select(Hospital.id).where(
                Hospital.id == hospital_id,
                Hospital.is_verified.is_(True),
                Hospital.is_active.is_(True),
            )
        )
    ).scalar_one_or_none()
    if exists is None:
        raise HTTPException(status_code=404, detail="Hospital not found")

    review = Review(
        hospital_id=hospital_id, user_id=user.id, rating=payload.rating, comment=payload.comment
    )
    db.add(review)
    await db.flush()

    avg, count = (
        await db.execute(
            select(func.avg(Review.rating), func.count(Review.id)).where(
                Review.hospital_id == hospital_id
            )
        )
    ).one()

    rating_row = (
        await db.execute(
            select(HospitalRating).where(HospitalRating.hospital_id == hospital_id)
        )
    ).scalar_one_or_none()
    if rating_row is None:
        rating_row = HospitalRating(
            hospital_id=hospital_id,
            average_rating=float(avg or 0.0),
            total_reviews=int(count or 0),
        )
        db.add(rating_row)
    else:
        rating_row.average_rating = float(avg or 0.0)
        rating_row.total_reviews = int(count or 0)

    await db.commit()
    return {"id": review.id, "rating": payload.rating, "comment": payload.comment}


# ── Stats ──────────────────────────────────────────────────────────────


@router.get("/stats")
async def stats(db: AsyncSession = Depends(get_db)) -> dict:
    global _STATS_CACHE_VALUE, _STATS_CACHE_EXPIRES
    now_ts = time.time()
    if _STATS_CACHE_VALUE is not None and _STATS_CACHE_EXPIRES > now_ts:
        return _STATS_CACHE_VALUE

    ba = Hospital.bed_availability
    row = (
        await db.execute(
            select(
                func.count(Hospital.id),
                func.coalesce(func.sum(ba.icu_available), 0),
                func.coalesce(func.sum(ba.nicu_available), 0),
                func.max(ba.last_updated),
            ).where(Hospital.is_verified.is_(True), Hospital.is_active.is_(True))
        )
    ).one()

    value = {
        "total_hospitals": int(row[0] or 0),
        "icu_available": int(row[1] or 0),
        "nicu_available": int(row[2] or 0),
        "last_updated": row[3].isoformat() if row[3] else None,
    }
    _STATS_CACHE_VALUE = value
    _STATS_CACHE_EXPIRES = now_ts + _STATS_TTL_SEC
    return value


# ── Search ─────────────────────────────────────────────────────────────


@router.get("/search", response_model=PaginatedResponse[HospitalSummaryOut])
async def search_hospitals(
    db: AsyncSession = Depends(get_db),
    q: Optional[str] = None,
    district: Optional[str] = None,
    bed_type: Optional[str] = None,
    available_only: bool = False,
    cost_min: Optional[float] = None,
    cost_max: Optional[float] = None,
    min_rating: Optional[float] = None,
    sort_by: str = Query("most_available", pattern="^(nearest|most_available|lowest_cost|top_rated)$"),
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
) -> PaginatedResponse[HospitalSummaryOut]:
    candidates = await _query_verified_active_hospitals(db)

    out: List[HospitalSummaryOut] = []
    for h in candidates:
        if district is not None and h.district.lower() != district.lower():
            continue
        if q:
            needle = q.lower()
            if needle not in h.name.lower() and needle not in h.address.lower():
                continue
        s = hospital_to_summary(h)
        if bed_type:
            total = getattr(s, f"{bed_type}_total")
            avail = getattr(s, f"{bed_type}_available")
            if total <= 0:
                continue
            if available_only and avail <= 0:
                continue
        if min_rating is not None and s.average_rating < min_rating:
            continue
        if cost_min is not None or cost_max is not None:
            prices = [s.cost_per_day_icu, s.cost_per_day_nicu, s.cost_per_day_ccu, s.cost_per_day_hdu]
            prices = [p for p in prices if p > 0]
            if not prices:
                continue
            if cost_min is not None and min(prices) < cost_min:
                continue
            if cost_max is not None and min(prices) > cost_max:
                continue
        # Distance
        if lat is not None and lng is not None and h.latitude is not None and h.longitude is not None:
            s.distance_km = round(haversine_km(lat, lng, h.latitude, h.longitude), 3)
        out.append(s)

    # Sort.
    if sort_by == "nearest":
        out.sort(key=lambda s: (s.distance_km is None, s.distance_km if s.distance_km is not None else 0))
    elif sort_by == "most_available":
        out.sort(
            key=lambda s: (
                -(s.icu_available + s.nicu_available + s.ccu_available + s.hdu_available),
                s.name,
            )
        )
    elif sort_by == "lowest_cost":
        out.sort(
            key=lambda s: (
                min(
                    [
                        p
                        for p in (
                            s.cost_per_day_icu,
                            s.cost_per_day_nicu,
                            s.cost_per_day_ccu,
                            s.cost_per_day_hdu,
                        )
                        if p and p > 0
                    ]
                    or [0]
                ),
                s.name,
            )
        )
    elif sort_by == "top_rated":
        out.sort(key=lambda s: (-s.average_rating, -s.total_reviews, s.name))

    sliced, total, _ = paginate(out, page, page_size)
    return PaginatedResponse[HospitalSummaryOut](
        data=sliced,
        page=page,
        page_size=page_size,
        total_count=total,
        total_pages=total_pages_for(total, page_size),
    )


# ── Div / district / ambulances ────────────────────────────────────────


@router.get("/divisions", response_model=List[dict])
async def public_divisions(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Division).order_by(Division.name))).scalars().all()
    return [{"id": d.id, "name": d.name} for d in rows]


@router.get("/districts", response_model=List[dict])
async def public_districts(
    db: AsyncSession = Depends(get_db),
    division_id: Optional[int] = None,
):
    stmt = select(District)
    if division_id is not None:
        stmt = stmt.where(District.division_id == division_id)
    rows = (await db.execute(stmt.order_by(District.name))).scalars().all()
    return [{"id": d.id, "name": d.name, "division_id": d.division_id} for d in rows]


@router.get("/ambulances", response_model=List[dict])
async def public_ambulances(
    db: AsyncSession = Depends(get_db),
    district_id: Optional[int] = None,
):
    stmt = select(Ambulance).where(Ambulance.is_active.is_(True))
    if district_id is not None:
        stmt = stmt.where(Ambulance.district_id == district_id)
    rows = (await db.execute(stmt.order_by(Ambulance.name))).scalars().all()
    return [
        {
            "id": a.id,
            "name": a.name,
            "organization": a.organization,
            "district_id": a.district_id,
            "phone": a.phone,
            "type": enum_value(a.type),
            "is_24h": a.is_24h,
        }
        for a in rows
    ]