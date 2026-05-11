import logging
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.models.db import Coupon, Partner, Transaction, User
from app.services import pricing

logger = logging.getLogger(__name__)


def validate_coupon(db: Session, code: str):
    coupon = db.execute(
        select(Coupon).where(Coupon.code == code.upper(), Coupon.is_active == True)
    ).scalars().first()
    if not coupon:
        return None
    partner = db.execute(
        select(Partner).where(Partner.id == coupon.partner_id, Partner.is_active == True)
    ).scalars().first()
    if not partner:
        return None
    return coupon, partner


def attach_coupon_to_user(db: Session, user: User, coupon: Coupon) -> None:
    user.coupon_id = coupon.id
    user.partner_id = coupon.partner_id


def record_transaction(
    db: Session,
    user: User,
    asaas_payment_id: str,
    amount_paid: float,
    event_type: str,
) -> bool:
    """Insert transaction row idempotently. Returns True if inserted, False if duplicate."""
    plan_key = user.plan or "tester"
    try:
        full_price = float(pricing.get_plan(plan_key)["price_full"])
    except KeyError:
        full_price = 0.0
    commission_amount = pricing.commission_for(plan_key) if user.partner_id else 0.0

    # INSERT ... ON CONFLICT DO NOTHING avoids IntegrityError without touching the
    # outer session state (no flush/rollback that would expire already-dirty ORM objects).
    result = db.execute(
        text("""
            INSERT INTO transactions
              (user_id, plan, amount_paid, full_price, commission_amount, coupon_used,
               coupon_id, partner_id, asaas_payment_id, event_type, created_at)
            VALUES
              (:user_id, :plan, :amount_paid, :full_price, :commission_amount, :coupon_used,
               :coupon_id, :partner_id, :asaas_payment_id, :event_type, NOW())
            ON CONFLICT (asaas_payment_id) DO NOTHING
        """),
        {
            "user_id": user.id,
            "plan": plan_key,
            "amount_paid": amount_paid,
            "full_price": full_price,
            "commission_amount": commission_amount,
            "coupon_used": bool(user.coupon_id),
            "coupon_id": user.coupon_id,
            "partner_id": user.partner_id,
            "asaas_payment_id": asaas_payment_id,
            "event_type": event_type,
        },
    )

    if result.rowcount == 0:
        logger.info("Duplicate transaction asaas_payment_id=%s — skipped", asaas_payment_id)
        return False

    if user.partner_id and commission_amount:
        db.execute(
            text("UPDATE partners SET commission_balance = commission_balance + :amt WHERE id = :id"),
            {"amt": commission_amount, "id": user.partner_id},
        )
        logger.info("Commission R$%.2f credited to partner_id=%s", commission_amount, user.partner_id)

    return True
