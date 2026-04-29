from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy import select
import os
from pathlib import Path
from app.config import get_settings
from app.models.db import User, Route, Upload, RouteOptimizationType
from app.models.schemas import (
    RouteCreate, RouteResponse, UploadResponse,
    OptimizeRouteRequest, OptimizeRouteResponse
)
from app.services.nfe_parser import NFEParser
from app.services.geocoding import GeocodingService
from app.services.ortools_service import OrToolsService

router = APIRouter(prefix="/api/routes", tags=["routes"])


def get_current_user(authorization: str = None, db: Session = None) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization[7:]
    from app.routes.auth import jwt, get_settings as get_sett
    settings = get_sett()

    try:
        from jose import JWTError
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401)
    except JWTError:
        raise HTTPException(status_code=401)

    stmt = select(User).where(User.email == email)
    user = db.execute(stmt).scalars().first()
    if not user:
        raise HTTPException(status_code=401)

    return user


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    authorization: str = None,
    db: Session = None,
    settings = Depends(get_settings)
):
    user = get_current_user(authorization, db)

    # Save file
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / file.filename
    with open(file_path, "wb") as f:
        f.write(await file.read())

    # Parse file
    extracted_data = NFEParser.parse_file(str(file_path))

    # Save to DB
    db_upload = Upload(
        user_id=user.id,
        filename=file.filename,
        file_path=str(file_path),
        file_type=Path(file.filename).suffix.lower(),
        extracted_data={"addresses": extracted_data}
    )
    db.add(db_upload)
    db.commit()
    db.refresh(db_upload)

    return UploadResponse.from_orm(db_upload)


@router.post("/optimize", response_model=OptimizeRouteResponse)
async def optimize_route(
    req: OptimizeRouteRequest,
    authorization: str = None,
    db: Session = None,
    settings = Depends(get_settings)
):
    user = get_current_user(authorization, db)

    geo_service = GeocodingService(settings.google_maps_api_key)
    ortools_service = OrToolsService()

    # Geocode start/end
    start_coords = geo_service.geocode(req.start_address) or (0, 0)
    end_coords = geo_service.geocode(req.end_address) or (0, 0)

    # Geocode waypoints if missing coords
    waypoints = []
    for wp in req.waypoints:
        if not wp.latitude or not wp.longitude:
            coords = geo_service.geocode(wp.address)
            if coords:
                wp.latitude, wp.longitude = coords
        waypoints.append(wp.dict())

    # Optimize
    if req.optimization_type == "tsp":
        optimized_indices, distance = ortools_service.optimize_tsp(waypoints, start_coords, end_coords)
        optimized_waypoints = [waypoints[i] for i in optimized_indices]
    else:
        # VRP: same as TSP for now
        optimized_indices, distance = ortools_service.optimize_tsp(waypoints, start_coords, end_coords)
        optimized_waypoints = [waypoints[i] for i in optimized_indices]

    # Build Google Maps URL (limit 200 waypoints)
    all_waypoints = [req.start_address] + [wp["address"] for wp in optimized_waypoints[:199]] + [req.end_address]
    waypoint_params = "|".join(all_waypoints[1:-1])  # Exclude start/end
    maps_url = f"https://www.google.com/maps/dir/{all_waypoints[0]}/{all_waypoints[-1]}"
    if waypoint_params:
        maps_url += f"/{waypoint_params}"

    # Calculate cost
    duration_minutes = (distance / 60) * 60  # Simple estimate
    cost = OrToolsService.estimate_cost(distance)

    return OptimizeRouteResponse(
        optimized_waypoints=optimized_waypoints,
        google_maps_url=maps_url,
        total_distance_km=distance,
        total_duration_minutes=duration_minutes,
        cost_estimate=cost
    )


@router.get("/history", response_model=list[RouteResponse])
async def get_user_routes(
    authorization: str = None,
    db: Session = None
):
    user = get_current_user(authorization, db)

    stmt = select(Route).where(Route.user_id == user.id).order_by(Route.created_at.desc())
    routes = db.execute(stmt).scalars().all()

    return [RouteResponse.from_orm(r) for r in routes]


@router.post("/save", response_model=RouteResponse)
async def save_route(
    route: RouteCreate,
    authorization: str = None,
    db: Session = None
):
    user = get_current_user(authorization, db)

    db_route = Route(
        user_id=user.id,
        name=route.name,
        optimization_type=route.optimization_type,
        start_address=route.start_address,
        end_address=route.end_address,
        waypoints=[w.dict() for w in route.waypoints]
    )
    db.add(db_route)
    db.commit()
    db.refresh(db_route)

    return RouteResponse.from_orm(db_route)
