from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.orm import sessionmaker, Session
from jose import JWTError, jwt
from sqlalchemy import select
from app.config import get_settings
from app.models.db import get_engine, get_session_local, User

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
    authorization: str = Header(None),
    db: Session = Depends(get_db),
    settings = Depends(get_settings)
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    token = authorization[7:]

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
