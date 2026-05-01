from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional, Literal
from datetime import datetime


OptimizationType = Literal["tsp", "vrp"]


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


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
    address: str = Field(min_length=1, max_length=500)
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)


class RouteCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    optimization_type: OptimizationType = "tsp"
    start_address: str = Field(min_length=1, max_length=500)
    end_address: str = Field(min_length=1, max_length=500)
    waypoints: List[Waypoint] = Field(max_length=500)


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
    optimization_type: OptimizationType = "tsp"
    vehicle_type: Literal["moto", "leve", "pesado"] = "leve"
    start_address: str = Field(min_length=1, max_length=500)
    end_address: str = Field(min_length=1, max_length=500)
    waypoints: List[Waypoint] = Field(max_length=500)

    @field_validator("waypoints")
    @classmethod
    def waypoints_not_empty(cls, v: List[Waypoint]) -> List[Waypoint]:
        if not v:
            raise ValueError("waypoints must contain at least one entry")
        return v


class OptimizeRouteResponse(BaseModel):
    optimized_waypoints: List[dict]
    google_maps_url: str
    total_distance_km: float
    total_duration_minutes: float
    cost_estimate: float
