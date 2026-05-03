from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional, Literal
from datetime import datetime


OptimizationType = Literal["tsp", "vrp"]

PlanTypeStr = Literal["tester", "basic", "starter", "delivery", "premium", "enterprise"]
PlanStatusStr = Literal["trial", "active", "pending", "cancelled"]
BillingTypeStr = Literal["CREDIT_CARD", "PIX", "BOLETO"]


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    cpf_cnpj: str = Field(..., min_length=11, max_length=14, description="CPF (11 dígitos) ou CNPJ (14 dígitos)")
    lgpd_consent: bool = Field(..., description="Consentimento LGPD obrigatório")

    @field_validator("cpf_cnpj")
    @classmethod
    def validate_cpf_cnpj(cls, v: str) -> str:
        digits = "".join(c for c in v if c.isdigit())
        if len(digits) not in (11, 14):
            raise ValueError("CPF deve ter 11 dígitos ou CNPJ 14 dígitos")
        return digits


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_active: bool
    credits: float
    plan: str = "tester"
    plan_status: str = "trial"
    trial_expires_at: Optional[datetime] = None
    is_admin: bool = False
    routes_used_today: int = 0
    created_at: datetime
    cpf_cnpj: Optional[str] = None

    class Config:
        from_attributes = True


class AdminUserPatch(BaseModel):
    plan: Optional[PlanTypeStr] = None
    plan_status: Optional[PlanStatusStr] = None
    subscription_id: Optional[str] = None
    trial_expires_at: Optional[datetime] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class PlanInfo(BaseModel):
    key: str
    name: str
    routes_per_day: int
    max_waypoints: int
    price: float


class SubscribeRequest(BaseModel):
    plan: PlanTypeStr
    billing_type: BillingTypeStr = "PIX"
    cpf_cnpj: Optional[str] = None


class SubscriptionResponse(BaseModel):
    subscription_id: str
    plan: str
    plan_status: str
    payment_url: Optional[str] = None


class AsaasWebhookPayload(BaseModel):
    event: str
    payment: Optional[dict] = None
    subscription: Optional[dict] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class Waypoint(BaseModel):
    address: str = Field(min_length=1, max_length=500)
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    priority: int = Field(default=0, ge=0)


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
