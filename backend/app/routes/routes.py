import asyncio
import logging
import re
import uuid
from pathlib import Path
from urllib.parse import quote

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.deps import get_current_user, get_db
from app.limiter import limiter
from app.models.db import Route, Upload, User
from app.models.schemas import (
    OptimizeRouteRequest,
    OptimizeRouteResponse,
    RouteCreate,
    RouteResponse,
    UploadResponse,
)
from app.services.geocoding import GeocodingService
from app.services.nfe_parser import NFEParser
from app.services.ortools_service import OrToolsService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/routes", tags=["routes"])

CREDIT_COST_OPTIMIZE = 1.0

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

    if current_user.credits < CREDIT_COST_OPTIMIZE:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient credits (need {CREDIT_COST_OPTIMIZE}, have {current_user.credits})",
        )

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

    optimized_indices, distance = OrToolsService.optimize_tsp(waypoints, start_coords, end_coords)
    optimized_waypoints = [waypoints[i] for i in optimized_indices]

    capped = optimized_waypoints[: settings.max_waypoints]
    all_addresses = [req.start_address] + [wp["address"] for wp in capped] + [req.end_address]
    encoded = [quote(a, safe="") for a in all_addresses]
    maps_url = "https://www.google.com/maps/dir/" + "/".join(encoded)

    # distance is in km; minutes = distance / avg_speed_kmh * 60
    duration_minutes = (distance / settings.avg_speed_kmh) * 60.0 if distance else 0.0
    cost = OrToolsService.estimate_cost(distance)

    # Deduct credits after successful optimization
    try:
        current_user.credits -= CREDIT_COST_OPTIMIZE
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to deduct credits for user %s: %s", current_user.email, exc)

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
