import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_db
from app.limiter import limiter
from app.models.db import SharedRoute, Route
from app.models.schemas import SharedRouteView

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/routes/{share_token}", response_model=SharedRouteView)
@limiter.limit("30/minute")
async def get_shared_route(request: Request, share_token: str, db: Session = Depends(get_db)):
    stmt = select(SharedRoute).where(SharedRoute.share_token == share_token)
    shared = db.execute(stmt).scalars().first()

    if not shared:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared route not found",
        )

    stmt_route = select(Route).where(Route.id == shared.route_id)
    route = db.execute(stmt_route).scalars().first()

    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Route data not found",
        )

    return SharedRouteView.model_validate(route)
