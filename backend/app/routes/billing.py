import asyncio
import logging
from datetime import date, datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.deps import get_current_user, get_db
from app.models.db import User
from app.models.schemas import PlanInfo, SubscribeRequest, SubscriptionResponse
from app.services.asaas import AsaasService, PLAN_LIMITS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/billing", tags=["billing"])

_PAID_PLANS = {"basic", "starter", "delivery", "premium"}


@router.get("/plans", response_model=List[PlanInfo])
async def list_plans():
    return [
        PlanInfo(key=k, **{f: v for f, v in v.items()})
        for k, v in PLAN_LIMITS.items()
        if k != "enterprise"
    ]


@router.post("/subscribe", response_model=SubscriptionResponse)
async def subscribe(
    req: SubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings=Depends(get_settings),
):
    if req.plan not in _PAID_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan for subscription")

    if not settings.asaas_api_key:
        raise HTTPException(status_code=503, detail="Payment service not configured")

    asaas = AsaasService(settings.asaas_api_key, sandbox=settings.asaas_sandbox)

    # Create Asaas customer if not exists
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
            raise HTTPException(status_code=502, detail="Could not create payment customer")

    plan_info = PLAN_LIMITS[req.plan]
    next_due = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")

    try:
        subscription = await asyncio.to_thread(
            asaas.create_subscription,
            current_user.asaas_customer_id,
            req.billing_type,
            plan_info["price"],
            next_due,
            f"Route Manager — {plan_info['name']}",
        )
    except Exception as exc:
        logger.exception("Asaas create_subscription failed for %s: %s", current_user.email, exc)
        raise HTTPException(status_code=502, detail="Could not create subscription")

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
    settings=Depends(get_settings),
):
    if not current_user.subscription_id:
        raise HTTPException(status_code=404, detail="No active subscription")

    if not settings.asaas_api_key:
        return SubscriptionResponse(
            subscription_id=current_user.subscription_id,
            plan=current_user.plan or "tester",
            plan_status=current_user.plan_status or "trial",
        )

    asaas = AsaasService(settings.asaas_api_key, sandbox=settings.asaas_sandbox)
    try:
        data = await asyncio.to_thread(asaas.get_subscription, current_user.subscription_id)
    except Exception as exc:
        logger.warning("Could not fetch subscription %s: %s", current_user.subscription_id, exc)
        raise HTTPException(status_code=502, detail="Could not fetch subscription status")

    return SubscriptionResponse(
        subscription_id=current_user.subscription_id,
        plan=current_user.plan or "tester",
        plan_status=current_user.plan_status or "trial",
    )


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
