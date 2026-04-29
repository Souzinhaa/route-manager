from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from pathlib import Path
from urllib.parse import quote
from app.config import get_settings
from app.models.db import User, Route, Upload
from app.models.schemas import (
    RouteCreate, RouteResponse, UploadResponse,
    OptimizeRouteRequest, OptimizeRouteResponse
)
from app.services.nfe_parser import NFEParser
from app.services.geocoding import GeocodingService
from app.services.ortools_service import OrToolsService
from app.deps import get_db, get_current_user

router = APIRouter(prefix="/api/routes", tags=["routes"])


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings = Depends(get_settings)
):
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / file.filename
    with open(file_path, "wb") as f:
        f.write(await file.read())

    extracted_data = NFEParser.parse_file(str(file_path))

    db_upload = Upload(
        user_id=current_user.id,
        filename=file.filename,
        file_path=str(file_path),
        file_type=Path(file.filename).suffix.lower(),
        extracted_data={"addresses": extracted_data}
    )
    db.add(db_upload)
    db.commit()
    db.refresh(db_upload)

    return UploadResponse.model_validate(db_upload)


@router.post("/optimize", response_model=OptimizeRouteResponse)
async def optimize_route(
    req: OptimizeRouteRequest,
    current_user: User = Depends(get_current_user),
    settings = Depends(get_settings)
):
    geo_service = GeocodingService(settings.google_maps_api_key)

    start_coords = geo_service.geocode(req.start_address) or (0.0, 0.0)
    end_coords = geo_service.geocode(req.end_address) or (0.0, 0.0)

    waypoints = []
    for wp in req.waypoints:
        wp_dict = wp.model_dump()
        if not wp_dict.get("latitude") or not wp_dict.get("longitude"):
            coords = geo_service.geocode(wp_dict["address"])
            if coords:
                wp_dict["latitude"], wp_dict["longitude"] = coords
        waypoints.append(wp_dict)

    optimized_indices, distance = OrToolsService.optimize_tsp(waypoints, start_coords, end_coords)
    optimized_waypoints = [waypoints[i] for i in optimized_indices]

    all_addresses = [req.start_address] + [wp["address"] for wp in optimized_waypoints[:198]] + [req.end_address]
    encoded = [quote(a) for a in all_addresses]
    maps_url = "https://www.google.com/maps/dir/" + "/".join(encoded)

    duration_minutes = (distance / 60.0) * 60.0 if distance else 0.0
    cost = OrToolsService.estimate_cost(distance)

    return OptimizeRouteResponse(
        optimized_waypoints=optimized_waypoints,
        google_maps_url=maps_url,
        total_distance_km=round(distance, 2),
        total_duration_minutes=round(duration_minutes, 2),
        cost_estimate=round(cost, 2)
    )


@router.get("/history", response_model=list[RouteResponse])
async def get_user_routes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    stmt = select(Route).where(Route.user_id == current_user.id).order_by(Route.created_at.desc())
    routes = db.execute(stmt).scalars().all()

    return [RouteResponse.model_validate(r) for r in routes]


@router.post("/save", response_model=RouteResponse)
async def save_route(
    route: RouteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_route = Route(
        user_id=current_user.id,
        name=route.name,
        optimization_type=route.optimization_type,
        start_address=route.start_address,
        end_address=route.end_address,
        waypoints=[w.model_dump() for w in route.waypoints]
    )
    db.add(db_route)
    db.commit()
    db.refresh(db_route)

    return RouteResponse.model_validate(db_route)
