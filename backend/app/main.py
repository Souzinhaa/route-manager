from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

# Serve compiled SPA bundled into image at /app/static
STATIC_DIR = Path("/app/static")
ASSETS_DIR = STATIC_DIR / "assets"

if ASSETS_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    # API routes already matched above; this serves index.html for SPA routing.
    index = STATIC_DIR / "index.html"
    if index.is_file():
        return FileResponse(index)
    return {"message": "Route Manager API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port, workers=settings.web_workers)
