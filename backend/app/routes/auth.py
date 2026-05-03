import logging
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.deps import get_current_user, get_db, get_routes_used_today
from app.limiter import limiter
from app.models.db import User
from app.models.schemas import (
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)

TRIAL_DAYS = 3

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, settings, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def _set_auth_cookies(response: Response, token: str, settings) -> None:
    """Set httpOnly access_token + readable csrf_token cookie."""
    csrf_token = secrets.token_hex(32)
    max_age = settings.access_token_expire_minutes * 60
    samesite = "none" if settings.cookie_secure else "lax"
    shared = dict(max_age=max_age, samesite=samesite, secure=settings.cookie_secure, path="/")
    response.set_cookie(key="access_token", value=token, httponly=True, **shared)
    response.set_cookie(key="csrf_token", value=csrf_token, httponly=False, **shared)
    logger.info("[auth] cookies set: secure=%s samesite=%s max_age=%s", settings.cookie_secure, samesite, max_age)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, user: UserCreate, db: Session = Depends(get_db), settings=Depends(get_settings)):
    if not user.lgpd_consent:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Consentimento LGPD obrigatório para criar conta.",
        )

    existing_user = db.execute(select(User).where(User.email == user.email)).scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    existing_cpf = db.execute(select(User).where(User.cpf_cnpj == user.cpf_cnpj)).scalars().first()
    if existing_cpf:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CPF/CNPJ já cadastrado",
        )

    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else None)

    is_admin_bootstrap = bool(settings.admin_email and user.email == settings.admin_email)

    db_user = User(
        email=user.email,
        hashed_password=get_password_hash(user.password),
        full_name=user.full_name,
        cpf_cnpj=user.cpf_cnpj,
        credits=0.0,
        plan="tester",
        plan_status="trial",
        trial_expires_at=datetime.utcnow() + timedelta(days=TRIAL_DAYS),
        lgpd_consent_at=datetime.utcnow(),
        lgpd_consent_ip=client_ip,
        is_admin=is_admin_bootstrap,
    )
    db.add(db_user)
    try:
        db.commit()
        db.refresh(db_user)
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to create user %s: %s", user.email, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create user",
        )

    logger.info("User registered: %s", user.email)
    return UserResponse.model_validate(db_user)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    response: Response,
    user: UserLogin,
    db: Session = Depends(get_db),
    settings=Depends(get_settings),
):
    db_user = db.execute(select(User).where(User.email == user.email)).scalars().first()

    if db_user:
        valid = verify_password(user.password, db_user.hashed_password)
    else:
        verify_password(user.password, settings.bcrypt_dummy_hash)
        valid = False

    if not db_user or not valid:
        logger.info("Login failed for %s", user.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if settings.admin_email and db_user.email == settings.admin_email and not db_user.is_admin:
        db_user.is_admin = True
        try:
            db.commit()
            db.refresh(db_user)
        except Exception:
            db.rollback()

    access_token = create_access_token({"sub": user.email}, settings=settings)
    _set_auth_cookies(response, access_token, settings)

    logger.info("User logged in: %s", user.email)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(db_user),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("csrf_token", path="/")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    data = UserResponse.model_validate(current_user)
    data.routes_used_today = get_routes_used_today(current_user.id, db)
    return data
