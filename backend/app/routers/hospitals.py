from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import SessionLocal
from ..models import Hospital
from ..schemas import (
    HospitalCreate,
    HospitalUpdate,
    HospitalOut,
    HospitalStats,
    HospitalsListResponse,
    BedCount,
)


router = APIRouter(
    prefix="/api/hospitals",
    tags=["hospitals"],
)


# ──────────────────────────── Dependencies ────────────────────────────


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# NOTE: Auth is currently open while the public read API is being built.
# When write-protection is enabled, add `current_user: User = Depends(get_current_user)`
# to POST/PATCH/DELETE — the dependency lives in `main.py`.


# ──────────────────────────── Helpers ────────────────────────────


_BED_TYPES = ("icu", "nicu", "ccu", "hdu")


def _normalize_beds(beds: dict) -> dict:
    """Default any missing bed type to {total:0, available:0} so the
    frontend always sees the full Record<BedType, BedCount> shape.
    Accepts both raw dicts and Pydantic BedCount instances."""
    out = {}
    for bt in _BED_TYPES:
        v = beds.get(bt) if beds else None
        total = int(getattr(v, "total", 0) if v is not None else 0)
        available = int(getattr(v, "available", 0) if v is not None else 0)
        if available > total:
            available = total
        out[f"{bt}_total"] = total
        out[f"{bt}_available"] = available
    return out


def _normalize_price(price: dict) -> dict:
    out = {}
    for bt in _BED_TYPES:
        v = price.get(bt) if price else None
        out[f"{bt}_price"] = int(v or 0)
    return out


def _apply_beds_update(model: Hospital, beds: dict) -> None:
    for bt in _BED_TYPES:
        v = beds.get(bt) if beds else None
        if v is None:
            continue
        total = int(getattr(v, "total", 0))
        available = int(getattr(v, "available", 0))
        if available > total:
            available = total
        setattr(model, f"{bt}_total", total)
        setattr(model, f"{bt}_available", available)


def _apply_price_update(model: Hospital, price: dict) -> None:
    for bt in _BED_TYPES:
        if bt in price and price[bt] is not None:
            setattr(model, f"{bt}_price", int(price[bt]))


def _to_out(h: Hospital) -> HospitalOut:
    """ORM → wire shape. Builds the nested `beds` and `price` dicts the
    client expects."""
    beds = {
        bt: BedCount(
            total=getattr(h, f"{bt}_total"),
            available=getattr(h, f"{bt}_available"),
        )
        for bt in _BED_TYPES
    }
    price = {bt: getattr(h, f"{bt}_price") for bt in _BED_TYPES}

    return HospitalOut(
        id=h.id,
        name=h.name,
        name_bn=h.name_bn,
        division=h.division.value if hasattr(h.division, "value") else h.division,
        district=h.district,
        lat=h.lat,
        lng=h.lng,
        type=h.type.value if hasattr(h.type, "value") else h.type,
        beds=beds,
        price=price,
        phone=h.phone,
        address=h.address,
        rating=h.rating,
        last_updated=h.last_updated,
        verified=h.verified,
    )


# ──────────────────────────── Endpoints ────────────────────────────


@router.get("", response_model=HospitalsListResponse)
def list_hospitals(
    db: Session = Depends(get_db),
    division: Optional[str] = Query(None, description="Filter by division"),
    district: Optional[str] = Query(None, description="Filter by district"),
    type: Optional[str] = Query(None, description="'public' | 'private'"),
    bed_type: Optional[str] = Query(
        None, description="icu | nicu | ccu | hdu — only hospitals offering this"
    ),
    only_available: bool = Query(
        False, description="Only return hospitals with at least one bed available"
    ),
    verified: Optional[bool] = Query(None, description="Filter by verified flag"),
    search: Optional[str] = Query(
        None, description="Case-insensitive substring match on name / name_bn / address"
    ),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    q = db.query(Hospital)

    if division:
        q = q.filter(Hospital.division == division)
    if district:
        q = q.filter(Hospital.district == district)
    if type:
        q = q.filter(Hospital.type == type)
    if bed_type and bed_type in _BED_TYPES:
        q = q.filter(getattr(Hospital, f"{bed_type}_total") > 0)
        if only_available:
            q = q.filter(getattr(Hospital, f"{bed_type}_available") > 0)
    elif only_available:
        q = q.filter(
            (Hospital.icu_available > 0)
            | (Hospital.nicu_available > 0)
            | (Hospital.ccu_available > 0)
            | (Hospital.hdu_available > 0)
        )
    if verified is not None:
        q = q.filter(Hospital.verified == verified)
    if search:
        pat = f"%{search.lower()}%"
        q = q.filter(
            func.lower(Hospital.name).like(pat)
            | func.lower(Hospital.name_bn).like(pat)
            | func.lower(Hospital.address).like(pat)
        )

    total = q.count()
    rows = q.order_by(Hospital.name.asc()).offset(offset).limit(limit).all()
    return HospitalsListResponse(items=[_to_out(h) for h in rows], total=total)


@router.get("/stats", response_model=HospitalStats)
def get_stats(db: Session = Depends(get_db)):
    icu_total = db.query(func.coalesce(func.sum(Hospital.icu_available), 0)).scalar()
    nicu_total = db.query(func.coalesce(func.sum(Hospital.nicu_available), 0)).scalar()
    ccu_total = db.query(func.coalesce(func.sum(Hospital.ccu_available), 0)).scalar()
    hdu_total = db.query(func.coalesce(func.sum(Hospital.hdu_available), 0)).scalar()
    count = db.query(func.count(Hospital.id)).scalar()
    last_updated = db.query(func.max(Hospital.last_updated)).scalar()

    return HospitalStats(
        totalHospitals=int(count or 0),
        icuAvailable=int(icu_total or 0),
        nicuAvailable=int(nicu_total or 0),
        ccuAvailable=int(ccu_total or 0),
        hduAvailable=int(hdu_total or 0),
        lastUpdatedMax=last_updated or datetime.now(timezone.utc),
    )


@router.get("/{hospital_id}", response_model=HospitalOut)
def get_hospital(hospital_id: str, db: Session = Depends(get_db)):
    h = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not h:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found"
        )
    return _to_out(h)


@router.post("", response_model=HospitalOut, status_code=status.HTTP_201_CREATED)
def create_hospital(
    payload: HospitalCreate,
    db: Session = Depends(get_db),
    # TODO: gate behind get_current_user once write-auth is rolled out
):
    if db.query(Hospital).filter(Hospital.id == payload.id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Hospital with id '{payload.id}' already exists",
        )

    bed_cols = _normalize_beds(payload.beds)
    price_cols = _normalize_price(payload.price)

    h = Hospital(
        id=payload.id,
        name=payload.name,
        name_bn=payload.name_bn,
        division=payload.division,
        district=payload.district,
        lat=payload.lat,
        lng=payload.lng,
        type=payload.type,
        phone=payload.phone,
        address=payload.address,
        rating=payload.rating,
        verified=payload.verified,
        last_updated=datetime.now(timezone.utc),
        **bed_cols,
        **price_cols,
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return _to_out(h)


@router.patch("/{hospital_id}", response_model=HospitalOut)
def update_hospital(
    hospital_id: str,
    payload: HospitalUpdate,
    db: Session = Depends(get_db),
    # TODO: gate behind get_current_user once write-auth is rolled out
):
    h = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not h:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found"
        )

    # Pull nested fields FIRST (use the validated model directly so we keep
    # the BedCount instances — not the dumped version where they become dicts).
    nested_changed = False
    if payload.beds is not None:
        _apply_beds_update(h, payload.beds)
        nested_changed = True
    if payload.price is not None:
        _apply_price_update(h, payload.price)
        nested_changed = True

    # Then apply flat fields. Pydantic v2 ``model_dump(exclude_unset=True)``
    # returns the nested models as plain dicts which is fine for setattr.
    data = payload.model_dump(exclude_unset=True)
    for nested in ("beds", "price"):
        data.pop(nested, None)
    for k, v in data.items():
        setattr(h, k, v)

    if nested_changed or data:
        # Bump freshness whenever any availability/price data changed.
        h.last_updated = datetime.now(timezone.utc)

    db.commit()
    db.refresh(h)
    return _to_out(h)


@router.delete("/{hospital_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hospital(
    hospital_id: str,
    db: Session = Depends(get_db),
    # TODO: gate behind get_current_user once write-auth is rolled out
):
    h = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not h:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found"
        )
    db.delete(h)
    db.commit()
    return None