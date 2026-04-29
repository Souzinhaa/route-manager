from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.config import get_settings
from app.models.db import Base, get_engine, get_session_local
from app.routes import health, auth, routes

settings = get_settings()
engine = get_engine(settings)
SessionLocal = get_session_local(engine)

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Route Manager API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Include routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(routes.router, dependencies=[Depends(get_db)])


@app.get("/")
async def root():
    return {"message": "Route Manager API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port, workers=settings.web_workers)
