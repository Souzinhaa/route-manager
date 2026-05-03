from datetime import date

from fastapi import Depends, HTTPException, Header, Request, status
from sqlalchemy.orm import sessionmaker, Session
from jose import JWTError, jwt
from sqlalchemy import select
from app.config import get_settings
from app.models.db import get_engine, get_session_local, DailyUsage, User

_settings = get_settings()
_engine = get_engine(_settings)
SessionLocal = get_session_local(_engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    request: Request,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
    settings=Depends(get_settings),
) -> User:
    # Prefer httpOnly cookie; fall back to Authorization header for API clients.
    token: str | None = request.cookies.get("access_token")
    if not token:
        if authorization and authorization.startswith("Bearer "):
            token = authorization[7:]

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    stmt = select(User).where(User.email == email)
    user = db.execute(stmt).scalars().first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user


def get_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def get_routes_used_today(user_id: int, db: Session) -> int:
    today = date.today()
    usage = db.execute(
        select(DailyUsage).where(DailyUsage.user_id == user_id, DailyUsage.date == today)
    ).scalars().first()
    return usage.routes_used if usage else 0
