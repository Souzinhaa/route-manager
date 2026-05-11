import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models.db import Partner, Transaction, User
from app.models.schemas import PartnerPortalResponse, PartnerPortalUser

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/partner", tags=["partner"])


@router.get("/portal/{token}", response_model=PartnerPortalResponse)
async def partner_portal(token: str, db: Session = Depends(get_db)):
    partner = db.execute(
        select(Partner).where(Partner.access_token == token, Partner.is_active == True)
    ).scalars().first()
    if not partner:
        raise HTTPException(status_code=404, detail="Link inválido ou parceiro inativo")

    active_users = db.execute(
        select(User).where(
            User.partner_id == partner.id,
            User.plan_status == "active",
        )
    ).scalars().all()

    total_earned = db.execute(
        select(func.coalesce(func.sum(Transaction.commission_amount), 0)).where(
            Transaction.partner_id == partner.id
        )
    ).scalar() or 0.0

    return PartnerPortalResponse(
        id=partner.id,
        name=partner.name,
        commission_balance=float(partner.commission_balance or 0),
        pix_key=partner.pix_key,
        pix_key_type=partner.pix_key_type,
        active_users=[
            PartnerPortalUser(email=u.email, plan=u.plan or "tester", plan_status=u.plan_status or "trial")
            for u in active_users
        ],
        total_earned=float(total_earned),
    )
