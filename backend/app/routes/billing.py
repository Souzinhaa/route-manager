import asyncio
import logging
from datetime import date, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.deps import get_current_user, get_db
from app.limiter import limiter
from app.models.db import PlanConfig, User
from app.models.schemas import (
    CouponValidateRequest,
    CouponValidateResponse,
    PlanInfo,
    SubscribeRequest,
    SubscriptionResponse,
)
from app.services import billing_service, pricing
from app.services.asaas import AsaasService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/billing", tags=["billing"])

_PAID_PLANS = {"basic", "starter", "delivery", "premium", "enterprise_medio", "enterprise_avancado"}
_SELF_SERVE_PLANS = _PAID_PLANS


@router.get("/plans", response_model=List[PlanInfo])
@limiter.limit("60/minute")
async def list_plans(request: Request, db: Session = Depends(get_db)):
    keys = ["tester", "basic", "starter", "delivery", "premium", "enterprise_medio", "enterprise_avancado"]

    # Fetch all PlanConfig rows in one query instead of 1 per plan
    cfg_rows = db.execute(select(PlanConfig).where(PlanConfig.key.in_(keys))).scalars().all()
    cfg_map = {c.key: c for c in cfg_rows}

    result = []
    for k in keys:
        base = dict(pricing.PLANS[k])
        cfg = cfg_map.get(k)
        if cfg:
            for f in ("price_full", "price_coupon", "price_onboarding", "routes_per_day", "max_stops"):
                val = getattr(cfg, f, None)
                if val is not None:
                    base[f] = int(val) if f in ("routes_per_day", "max_stops") else float(val)
        result.append(PlanInfo(
            key=k,
            name=pricing.PLANS[k]["name"],
            tier=pricing.PLANS[k]["tier"],
            routes_per_day=base["routes_per_day"],
            max_stops=base["max_stops"],
            price_full=float(base["price_full"]),
            price_coupon=float(base["price_coupon"]),
            price_onboarding=float(base["price_onboarding"]),
        ))
    return result


@router.post("/coupons/validate", response_model=CouponValidateResponse)
@limiter.limit("10/minute")
async def validate_coupon(
    request: Request,
    req: CouponValidateRequest,
    db: Session = Depends(get_db),
):
    result = billing_service.validate_coupon(db, req.code)
    if not result:
        raise HTTPException(status_code=404, detail="Cupom inválido ou inativo")
    _, partner = result
    return CouponValidateResponse(valid=True, partner_name=partner.name, applies_discount=True)


@router.post("/subscribe", response_model=SubscriptionResponse)
@limiter.limit("5/minute")
async def subscribe(
    request: Request,
    req: SubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings=Depends(get_settings),
):
    if req.plan == "enterprise_custom":
        raise HTTPException(status_code=400, detail="Entre em contato com vendas para plano Enterprise Custom")

    if req.plan not in _SELF_SERVE_PLANS:
        raise HTTPException(status_code=400, detail="Plano inválido para assinatura")

    if not settings.asaas_api_key:
        raise HTTPException(status_code=503, detail="Payment service not configured")

    coupon_obj = None
    partner_obj = None
    if req.coupon_code:
        result = billing_service.validate_coupon(db, req.coupon_code)
        if not result:
            raise HTTPException(status_code=400, detail="Cupom inválido ou inativo")
        coupon_obj, partner_obj = result
        billing_service.attach_coupon_to_user(db, current_user, coupon_obj)

    asaas = AsaasService(settings.asaas_api_key, sandbox=settings.asaas_sandbox)

    if not current_user.asaas_customer_id:
        try:
            customer = await asyncio.to_thread(
                asaas.create_customer,
                current_user.full_name,
                current_user.email,
                req.cpf_cnpj,
            )
            current_user.asaas_customer_id = customer["id"]
        except Exception as exc:
            logger.exception("Asaas create_customer failed for %s: %s", current_user.email, exc)
            raise HTTPException(status_code=502, detail=str(exc) or "Could not create payment customer")

    plan_data = pricing.get_plan_merged(req.plan, db)
    value = pricing.resolve_price_merged(plan_data, current_user.is_onboarding, has_coupon=bool(coupon_obj))
    next_due = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")

    try:
        subscription = await asyncio.to_thread(
            asaas.create_subscription,
            current_user.asaas_customer_id,
            req.billing_type,
            value,
            next_due,
            f"Route Manager — {plan_data['name']}",
        )
    except Exception as exc:
        logger.exception("Asaas create_subscription failed for %s: %s", current_user.email, exc)
        raise HTTPException(status_code=502, detail=str(exc) or "Could not create subscription")

    current_user.subscription_id = subscription["id"]
    current_user.plan = req.plan
    current_user.plan_status = "pending"

    try:
        db.commit()
        db.refresh(current_user)
    except Exception as exc:
        db.rollback()
        logger.exception("DB commit failed on subscribe for %s: %s", current_user.email, exc)
        raise HTTPException(status_code=500, detail="Could not save subscription")

    payment_url: str | None = None
    try:
        payment_url = await asyncio.to_thread(asaas.get_pending_payment_url, subscription["id"])
    except Exception:
        pass

    return SubscriptionResponse(
        subscription_id=subscription["id"],
        plan=req.plan,
        plan_status="pending",
        payment_url=payment_url,
    )


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    current_user: User = Depends(get_current_user),
):
    if not current_user.subscription_id:
        raise HTTPException(status_code=404, detail="No active subscription")

    # plan_status is kept in sync by Asaas webhooks — no need to call Asaas on every read
    return SubscriptionResponse(
        subscription_id=current_user.subscription_id,
        plan=current_user.plan or "tester",
        plan_status=current_user.plan_status or "trial",
    )


@router.post("/downgrade", status_code=status.HTTP_204_NO_CONTENT)
async def downgrade_to_tester(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.plan = "tester"
    current_user.plan_status = "active"
    current_user.subscription_id = None
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("DB commit failed on downgrade for %s: %s", current_user.email, exc)
        raise HTTPException(status_code=500, detail="Could not downgrade plan")


@router.delete("/subscription", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings=Depends(get_settings),
):
    if not current_user.subscription_id:
        raise HTTPException(status_code=404, detail="No active subscription")

    if settings.asaas_api_key:
        asaas = AsaasService(settings.asaas_api_key, sandbox=settings.asaas_sandbox)
        try:
            await asyncio.to_thread(asaas.cancel_subscription, current_user.subscription_id)
        except Exception as exc:
            logger.warning("Asaas cancel failed for %s: %s", current_user.subscription_id, exc)

    current_user.plan_status = "cancelled"
    current_user.plan = "tester"
    current_user.subscription_id = None

    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("DB commit failed on cancel for %s: %s", current_user.email, exc)
        raise HTTPException(status_code=500, detail="Could not cancel subscription")
