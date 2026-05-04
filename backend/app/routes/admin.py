import logging
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import get_admin_user, get_db, get_routes_used_today
from app.models.db import Coupon, DailyUsage, Partner, Route, Transaction, User
from app.models.schemas import (
    AdminUserPatch,
    CouponCreate,
    CouponResponse,
    PartnerCreate,
    PartnerResponse,
    TransactionResponse,
    UserResponse,
)
from app.services import pricing

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class ChangePasswordRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


class WithdrawRequest(BaseModel):
    amount: float = Field(gt=0)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])


def _user_response(user: User, db: Session) -> dict:
    data = UserResponse.model_validate(user).model_dump()
    data["routes_used_today"] = get_routes_used_today(user.id, db)
    return data


@router.get("/stats")
async def get_stats(
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    total_users = db.execute(select(func.count()).select_from(User)).scalar()
    active_subs = db.execute(
        select(func.count()).select_from(User).where(User.plan_status == "active")
    ).scalar()
    trial_users = db.execute(
        select(func.count()).select_from(User).where(User.plan_status == "trial")
    ).scalar()
    total_routes = db.execute(select(func.count()).select_from(Route)).scalar()
    routes_today = db.execute(
        select(func.sum(DailyUsage.routes_used)).where(DailyUsage.date == date.today())
    ).scalar() or 0

    pending_count = db.execute(
        select(func.count()).select_from(User).where(User.plan_status == "pending")
    ).scalar()
    cancelled_count = db.execute(
        select(func.count()).select_from(User).where(User.plan_status == "cancelled")
    ).scalar()

    mrr = 0.0
    plan_counts = {}
    for plan_key, plan_data in pricing.PLANS.items():
        count = db.execute(
            select(func.count()).select_from(User).where(User.plan == plan_key)
        ).scalar()
        plan_counts[plan_key] = count
        if plan_data["tier"] in ("consumer", "enterprise") and float(plan_data["price_full"]) > 0:
            active_plan_count = db.execute(
                select(func.count()).select_from(User).where(
                    User.plan == plan_key, User.plan_status == "active"
                )
            ).scalar()
            mrr += active_plan_count * float(plan_data["price_full"])

    commission_owed_total = db.execute(
        select(func.coalesce(func.sum(Partner.commission_balance), 0)).select_from(Partner)
    ).scalar() or 0.0

    return {
        "total_users": total_users,
        "active_subscriptions": active_subs,
        "trial_users": trial_users,
        "pending_payments": pending_count,
        "cancelled_subscriptions": cancelled_count,
        "mrr": round(mrr, 2),
        "total_routes": total_routes,
        "routes_today": routes_today,
        "plan_distribution": plan_counts,
        "commission_owed_total": float(commission_owed_total),
    }


@router.get("/users")
async def list_users(
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    search: Optional[str] = Query(default=None),
):
    stmt = select(User).order_by(User.created_at.desc()).limit(limit).offset(offset)
    if search:
        stmt = stmt.where(User.email.ilike(f"%{search}%") | User.full_name.ilike(f"%{search}%"))
    users = db.execute(stmt).scalars().all()
    return [_user_response(u, db) for u in users]


@router.get("/users/{user_id}")
async def get_user(
    user_id: int,
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    user = db.execute(select(User).where(User.id == user_id)).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_response(user, db)


@router.patch("/users/{user_id}")
async def patch_user(
    user_id: int,
    patch: AdminUserPatch,
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    user = db.execute(select(User).where(User.id == user_id)).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, val in patch.model_dump(exclude_unset=True).items():
        setattr(user, field, val)

    try:
        db.commit()
        db.refresh(user)
    except Exception as exc:
        db.rollback()
        logger.exception("Admin patch user %s failed: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Could not update user")

    logger.info("Admin updated user %s: %s", user.email, patch.model_dump(exclude_unset=True))
    return _user_response(user, db)


@router.get("/users/{user_id}/routes")
async def get_user_routes(
    user_id: int,
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=100),
):
    routes = db.execute(
        select(Route)
        .where(Route.user_id == user_id)
        .order_by(Route.created_at.desc())
        .limit(limit)
    ).scalars().all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "optimization_type": r.optimization_type,
            "total_distance_km": r.total_distance_km,
            "waypoints_count": len(r.waypoints) if r.waypoints else 0,
            "created_at": r.created_at.isoformat(),
        }
        for r in routes
    ]


@router.delete("/users/{user_id}/routes/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_route(
    user_id: int,
    route_id: int,
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    route = db.execute(
        select(Route).where(Route.id == route_id, Route.user_id == user_id)
    ).scalars().first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    db.delete(route)
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not delete route")


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    body: ChangePasswordRequest,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    admin.hashed_password = _pwd_context.hash(body.new_password)
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to change admin password for %s: %s", admin.email, exc)
        raise HTTPException(status_code=500, detail="Could not update password")


# ── Partners ──────────────────────────────────────────────────────────────────

@router.get("/partners", response_model=List[PartnerResponse])
async def list_partners(
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    partners = db.execute(select(Partner).order_by(Partner.created_at.desc())).scalars().all()
    return [PartnerResponse.model_validate(p) for p in partners]


@router.post("/partners", response_model=PartnerResponse, status_code=status.HTTP_201_CREATED)
async def create_partner(
    body: PartnerCreate,
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    partner = Partner(name=body.name, contact_email=body.contact_email)
    db.add(partner)
    try:
        db.commit()
        db.refresh(partner)
    except Exception as exc:
        db.rollback()
        logger.exception("Create partner failed: %s", exc)
        raise HTTPException(status_code=500, detail="Could not create partner")
    return PartnerResponse.model_validate(partner)


@router.get("/partners/{partner_id}")
async def get_partner(
    partner_id: int,
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    partner = db.execute(select(Partner).where(Partner.id == partner_id)).scalars().first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    users = db.execute(
        select(User).where(User.partner_id == partner_id)
    ).scalars().all()

    data = PartnerResponse.model_validate(partner).model_dump()
    data["users"] = [{"id": u.id, "email": u.email, "plan": u.plan} for u in users]
    return data


@router.post("/partners/{partner_id}/withdraw", status_code=status.HTTP_204_NO_CONTENT)
async def withdraw_commission(
    partner_id: int,
    body: WithdrawRequest,
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    partner = db.execute(select(Partner).where(Partner.id == partner_id)).scalars().first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    current_balance = float(partner.commission_balance or 0)
    if body.amount > current_balance:
        raise HTTPException(status_code=400, detail=f"Saldo insuficiente (R$ {current_balance:.2f})")

    partner.commission_balance = current_balance - body.amount
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not process withdrawal")


# ── Coupons ───────────────────────────────────────────────────────────────────

@router.get("/coupons", response_model=List[CouponResponse])
async def list_coupons(
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    coupons = db.execute(select(Coupon).order_by(Coupon.created_at.desc())).scalars().all()
    return [CouponResponse.model_validate(c) for c in coupons]


@router.post("/coupons", response_model=CouponResponse, status_code=status.HTTP_201_CREATED)
async def create_coupon(
    body: CouponCreate,
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    partner = db.execute(select(Partner).where(Partner.id == body.partner_id)).scalars().first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    coupon = Coupon(code=body.code.upper(), partner_id=body.partner_id)
    db.add(coupon)
    try:
        db.commit()
        db.refresh(coupon)
    except Exception as exc:
        db.rollback()
        logger.exception("Create coupon failed: %s", exc)
        raise HTTPException(status_code=400, detail="Código de cupom já existe ou erro interno")
    return CouponResponse.model_validate(coupon)


@router.patch("/coupons/{coupon_id}", response_model=CouponResponse)
async def toggle_coupon(
    coupon_id: int,
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    coupon = db.execute(select(Coupon).where(Coupon.id == coupon_id)).scalars().first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    coupon.is_active = not coupon.is_active
    try:
        db.commit()
        db.refresh(coupon)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not update coupon")
    return CouponResponse.model_validate(coupon)


# ── Transactions ──────────────────────────────────────────────────────────────

@router.get("/transactions", response_model=List[TransactionResponse])
async def list_transactions(
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    partner_id: Optional[int] = Query(default=None),
    since: Optional[datetime] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    stmt = select(Transaction).order_by(Transaction.created_at.desc()).limit(limit).offset(offset)
    if partner_id is not None:
        stmt = stmt.where(Transaction.partner_id == partner_id)
    if since is not None:
        stmt = stmt.where(Transaction.created_at >= since)
    rows = db.execute(stmt).scalars().all()
    return [TransactionResponse.model_validate(r) for r in rows]
