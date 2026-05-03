import logging
from datetime import datetime

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models.db import Route, Upload, User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("/export")
async def export_user_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """LGPD Art. 18, II — portabilidade de dados."""
    routes = db.execute(
        select(Route).where(Route.user_id == current_user.id)
    ).scalars().all()
    uploads = db.execute(
        select(Upload).where(Upload.user_id == current_user.id)
    ).scalars().all()

    return {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "cpf_cnpj": current_user.cpf_cnpj,
            "plan": current_user.plan,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
            "lgpd_consent_at": current_user.lgpd_consent_at.isoformat() if current_user.lgpd_consent_at else None,
        },
        "routes": [
            {
                "id": r.id,
                "name": r.name,
                "start_address": r.start_address,
                "end_address": r.end_address,
                "waypoints": r.waypoints,
                "total_distance_km": r.total_distance_km,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in routes
        ],
        "uploads": [
            {
                "id": u.id,
                "filename": u.filename,
                "file_type": u.file_type,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in uploads
        ],
    }


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """LGPD Art. 18, VI — eliminação de dados. Soft-delete; purge em 30 dias."""
    current_user.deleted_at = datetime.utcnow()
    current_user.is_active = False
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to soft-delete user %s: %s", current_user.email, exc)
        raise
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("csrf_token", path="/")
    logger.info("User soft-deleted (LGPD): %s", current_user.email)
