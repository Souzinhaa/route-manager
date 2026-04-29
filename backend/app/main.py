from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.models.db import Base
from app.deps import _engine
from app.routes import health, auth, routes

settings = get_settings()

Base.metadata.create_all(bind=_engine)

app = FastAPI(title="Route Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(routes.router)


@app.get("/")
async def root():
    return {"message": "Route Manager API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port, workers=settings.web_workers)
