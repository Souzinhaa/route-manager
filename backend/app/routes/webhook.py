import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.deps import get_db
from app.models.db import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhook", tags=["webhook"])

_PAYMENT_ACTIVE = {"PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"}
_PAYMENT_OVERDUE = {"PAYMENT_OVERDUE"}
_PAYMENT_CANCELLED = {"PAYMENT_DELETED", "SUBSCRIPTION_DELETED"}


@router.post("/asaas", status_code=status.HTTP_200_OK)
async def asaas_webhook(
    request: Request,
    db: Session = Depends(get_db),
    settings=Depends(get_settings),
    asaas_access_token: str = Header(None, alias="asaas-access-token"),
):
    # Validate webhook token
    if settings.asaas_webhook_token:
        if asaas_access_token != settings.asaas_webhook_token:
            raise HTTPException(status_code=403, detail="Invalid webhook token")

    body = await request.json()
    event: str = body.get("event", "")
    payment: dict = body.get("payment") or {}
    subscription_id: str | None = payment.get("subscription") or body.get("subscription", {}).get("id")

    logger.info("Asaas webhook event=%s subscription=%s", event, subscription_id)

    if not subscription_id:
        return {"status": "ignored"}

    user = db.execute(
        select(User).where(User.subscription_id == subscription_id)
    ).scalars().first()

    if not user:
        logger.warning("Webhook: no user for subscription_id=%s", subscription_id)
        return {"status": "unknown_subscription"}

    if event in _PAYMENT_ACTIVE:
        user.plan_status = "active"
        logger.info("User %s plan activated (event=%s)", user.email, event)

    elif event in _PAYMENT_OVERDUE:
        user.plan_status = "pending"
        logger.info("User %s plan pending (overdue payment)", user.email)

    elif event in _PAYMENT_CANCELLED:
        user.plan_status = "cancelled"
        user.plan = "tester"
        user.subscription_id = None
        logger.info("User %s plan cancelled (event=%s)", user.email, event)

    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Webhook DB commit failed for user %s: %s", user.email, exc)
        raise HTTPException(status_code=500, detail="DB error")

    return {"status": "ok"}
