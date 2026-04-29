from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_active: bool
    credits: float
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class Waypoint(BaseModel):
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class RouteCreate(BaseModel):
    name: str
    optimization_type: str
    start_address: str
    end_address: str
    waypoints: List[Waypoint]


class RouteResponse(BaseModel):
    id: int
    name: str
    optimization_type: str
    start_address: str
    end_address: str
    waypoints: List[dict]
    optimized_waypoints: Optional[List[dict]] = None
    google_maps_url: Optional[str] = None
    total_distance_km: Optional[float] = None
    total_duration_minutes: Optional[float] = None
    cost_estimate: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UploadResponse(BaseModel):
    id: int
    filename: str
    file_type: str
    extracted_data: dict
    created_at: datetime

    class Config:
        from_attributes = True


class OptimizeRouteRequest(BaseModel):
    optimization_type: str
    start_address: str
    end_address: str
    waypoints: List[Waypoint]


class OptimizeRouteResponse(BaseModel):
    optimized_waypoints: List[dict]
    google_maps_url: str
    total_distance_km: float
    total_duration_minutes: float
    cost_estimate: float
