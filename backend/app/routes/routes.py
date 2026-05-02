import asyncio
import logging
import re
import uuid
from datetime import date, datetime
from pathlib import Path
from urllib.parse import quote

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.deps import get_current_user, get_db
from app.limiter import limiter
from app.models.db import DailyUsage, Route, Upload, User
from app.models.schemas import (
    OptimizeRouteRequest,
    OptimizeRouteResponse,
    RouteCreate,
    RouteResponse,
    UploadResponse,
)
from app.services.asaas import PLAN_LIMITS
from app.services.geocoding import GeocodingService
from app.services.nfe_parser import NFEParser
from app.services.ortools_service import OrToolsService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/routes", tags=["routes"])


def _check_plan_access(user: User, num_waypoints: int, db: Session) -> None:
    plan_key = (user.plan or "tester").lower()
    plan_status = (user.plan_status or "trial").lower()

    if plan_status == "trial":
        if user.trial_expires_at and datetime.utcnow() > user.trial_expires_at:
            raise HTTPException(
                status_code=402,
                detail="Trial expirado. Faça uma assinatura para continuar.",
            )
    elif plan_status in ("pending", "cancelled"):
        raise HTTPException(
            status_code=402,
            detail="Assinatura inativa. Atualize seu pagamento.",
        )

    limits = PLAN_LIMITS.get(plan_key, PLAN_LIMITS["tester"])

    max_wp = limits["max_waypoints"]
    if max_wp != -1 and num_waypoints > max_wp:
        raise HTTPException(
            status_code=400,
            detail=f"Plano {plan_key!r} permite no máximo {max_wp} paradas por rota.",
        )

    max_routes = limits["routes_per_day"]
    if max_routes != -1:
        today = date.today()
        usage = db.execute(
            select(DailyUsage).where(
                DailyUsage.user_id == user.id,
                DailyUsage.date == today,
            )
        ).scalars().first()
        used = usage.routes_used if usage else 0
        if used >= max_routes:
            raise HTTPException(
                status_code=429,
                detail=f"Limite diário atingido ({max_routes} rota(s)/dia no plano {plan_key!r}).",
            )


def _increment_daily_usage(user_id: int, db: Session) -> None:
    today = date.today()
    usage = db.execute(
        select(DailyUsage).where(DailyUsage.user_id == user_id, DailyUsage.date == today)
    ).scalars().first()
    if usage:
        usage.routes_used += 1
    else:
        db.add(DailyUsage(user_id=user_id, date=today, routes_used=1))

ALLOWED_EXTENSIONS = {".xml", ".pdf", ".png", ".jpg", ".jpeg"}
SAFE_FILENAME_RE = re.compile(r"[^A-Za-z0-9._-]")


def _sanitize_filename(raw: str) -> str:
    """Return a safe filename: strip path components, restrict charset, prefix with UUID."""
    base = Path(raw).name  # Drops directory components, including absolute or '..' segments.
    base = SAFE_FILENAME_RE.sub("_", base)
    if not base or base.startswith("."):
        base = "upload"
    return f"{uuid.uuid4().hex}_{base}"


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings=Depends(get_settings),
):
    raw_name = file.filename or "upload"
    suffix = Path(raw_name).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {suffix}",
        )

    upload_dir = Path(settings.upload_dir).resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)

    safe_name = _sanitize_filename(raw_name)
    file_path = (upload_dir / safe_name).resolve()
    if upload_dir not in file_path.parents:
        # Defensive: even after sanitizing, refuse if the resolved path escapes upload_dir.
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename")

    max_bytes = settings.max_upload_size_bytes
    written = 0
    try:
        async with aiofiles.open(file_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                written += len(chunk)
                if written > max_bytes:
                    await f.close()
                    file_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds {settings.max_upload_size_mb}MB limit",
                    )
                await f.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        file_path.unlink(missing_ok=True)
        logger.exception("Failed to write upload %s: %s", safe_name, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save uploaded file",
        )

    # NFEParser is sync (PDF/OCR is CPU-bound); offload to threadpool to avoid blocking the loop.
    extracted_data = await asyncio.to_thread(NFEParser.parse_file, str(file_path))

    db_upload = Upload(
        user_id=current_user.id,
        filename=raw_name,
        file_path=str(file_path),
        file_type=suffix,
        extracted_data={"addresses": extracted_data},
    )
    db.add(db_upload)
    try:
        db.commit()
        db.refresh(db_upload)
    except Exception as exc:
        db.rollback()
        logger.exception("DB commit failed for upload %s: %s", safe_name, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not record upload",
        )

    return UploadResponse.model_validate(db_upload)


@router.post("/optimize", response_model=OptimizeRouteResponse)
@limiter.limit("30/minute")
async def optimize_route(
    request: Request,
    req: OptimizeRouteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings=Depends(get_settings),
):
    if len(req.waypoints) > settings.max_waypoints:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Too many waypoints (max {settings.max_waypoints})",
        )

    _check_plan_access(current_user, len(req.waypoints), db)

    geo = GeocodingService(settings.google_maps_api_key)

    # Run blocking geocoding calls in a threadpool so the event loop stays free.
    start_coords = await asyncio.to_thread(geo.geocode, req.start_address) or (0.0, 0.0)
    end_coords = await asyncio.to_thread(geo.geocode, req.end_address) or (0.0, 0.0)

    waypoints: list[dict] = []
    for wp in req.waypoints:
        wp_dict = wp.model_dump()
        if wp_dict.get("latitude") is None or wp_dict.get("longitude") is None:
            coords = await asyncio.to_thread(geo.geocode, wp_dict["address"])
            if coords:
                wp_dict["latitude"], wp_dict["longitude"] = coords
        waypoints.append(wp_dict)

    # Split by priority: P1/P2/P3 fixed first, P0 optimized
    fixed = sorted([wp for wp in waypoints if wp.get("priority", 0) > 0],
                   key=lambda w: w["priority"])
    free = [wp for wp in waypoints if wp.get("priority", 0) == 0]

    if free:
        free_indices, free_dist = OrToolsService.optimize_tsp(free, start_coords, end_coords)
        optimized_free = [free[i] for i in free_indices]
    else:
        optimized_free = []
        free_dist = 0.0

    optimized_waypoints = fixed + optimized_free

    # Recalculate total distance over the full ordered sequence
    all_points = ([start_coords] +
                  [(wp["latitude"], wp["longitude"]) for wp in optimized_waypoints
                   if wp.get("latitude") and wp.get("longitude")] +
                  [end_coords])
    if len(all_points) > 1 and all(c and c != (0.0, 0.0) for c in [start_coords, end_coords]):
        distance = sum(
            OrToolsService.haversine(all_points[i][0], all_points[i][1],
                                     all_points[i+1][0], all_points[i+1][1])
            for i in range(len(all_points) - 1)
        )
    else:
        distance = free_dist

    capped = optimized_waypoints[: settings.max_waypoints]
    all_addresses = [req.start_address] + [wp["address"] for wp in capped] + [req.end_address]
    encoded = [quote(a, safe="") for a in all_addresses]
    maps_url = "https://www.google.com/maps/dir/" + "/".join(encoded)

    # distance is in km; minutes = distance / speed_kmh * 60
    speed_kmh = OrToolsService.get_speed_kmh(req.vehicle_type)
    duration_minutes = (distance / speed_kmh) * 60.0 if distance else 0.0
    cost = OrToolsService.estimate_cost(distance, req.vehicle_type)

    # Increment daily usage and auto-save route to history
    from datetime import datetime as _dt
    try:
        _increment_daily_usage(current_user.id, db)
        db_route = Route(
            user_id=current_user.id,
            name=f"Rota {_dt.now().strftime('%d/%m %H:%M')}",
            optimization_type=req.optimization_type,
            start_address=req.start_address,
            end_address=req.end_address,
            waypoints=[wp.model_dump() for wp in req.waypoints],
            optimized_waypoints=optimized_waypoints,
            google_maps_url=maps_url,
            total_distance_km=round(distance, 2),
            total_duration_minutes=round(duration_minutes, 2),
            cost_estimate=round(cost, 2),
        )
        db.add(db_route)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to save route / deduct credits for user %s: %s", current_user.email, exc)

    return OptimizeRouteResponse(
        optimized_waypoints=optimized_waypoints,
        google_maps_url=maps_url,
        total_distance_km=round(distance, 2),
        total_duration_minutes=round(duration_minutes, 2),
        cost_estimate=round(cost, 2),
    )


@router.get("/history", response_model=list[RouteResponse])
async def get_user_routes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    stmt = (
        select(Route)
        .where(Route.user_id == current_user.id)
        .order_by(Route.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = db.execute(stmt).scalars().all()
    return [RouteResponse.model_validate(r) for r in rows]


@router.post("/save", response_model=RouteResponse, status_code=status.HTTP_201_CREATED)
async def save_route(
    route: RouteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_route = Route(
        user_id=current_user.id,
        name=route.name,
        optimization_type=route.optimization_type,
        start_address=route.start_address,
        end_address=route.end_address,
        waypoints=[w.model_dump() for w in route.waypoints],
    )
    db.add(db_route)
    try:
        db.commit()
        db.refresh(db_route)
    except Exception as exc:
        db.rollback()
        logger.exception("DB commit failed saving route %s: %s", route.name, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save route",
        )

    return RouteResponse.model_validate(db_route)
