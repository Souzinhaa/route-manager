import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

print("[startup] importing config...", flush=True)
from app.config import get_settings

print("[startup] importing models...", flush=True)
from app.models.db import Base

print("[startup] importing deps...", flush=True)
from app.deps import _engine

print("[startup] importing health route...", flush=True)
from app.routes import health

# Heavy imports (ortools, tesseract, pdf2image) — wrap so /health survives even if these fail
HEAVY_ROUTES_OK = True
try:
    print("[startup] importing heavy routes (auth, routes)...", flush=True)
    from app.routes import auth, routes as routes_module
    print("[startup] heavy routes loaded.", flush=True)
except Exception as e:
    print(f"[startup] WARNING: heavy routes failed to import: {type(e).__name__}: {e}", flush=True)
    HEAVY_ROUTES_OK = False

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[startup] creating database tables...", flush=True)
    try:
        Base.metadata.create_all(bind=_engine)
        print("[startup] database tables ready.", flush=True)
    except Exception as e:
        print(f"[startup] ERROR creating tables: {type(e).__name__}: {e}", flush=True)
    yield
    print("[shutdown] bye.", flush=True)


app = FastAPI(title="Route Manager API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health route MUST register first so /{full_path:path} catch-all doesn't shadow it
app.include_router(health.router)

if HEAVY_ROUTES_OK:
    app.include_router(auth.router)
    app.include_router(routes_module.router)
else:
    print("[startup] heavy routes disabled — only /health is available", flush=True)

# Serve compiled SPA bundled into image at /app/static
STATIC_DIR = Path("/app/static")
ASSETS_DIR = STATIC_DIR / "assets"

if ASSETS_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    # API routes match above; this serves index.html for SPA routing.
    index = STATIC_DIR / "index.html"
    if index.is_file():
        return FileResponse(index)
    return {"message": "Route Manager API"}


print("[startup] FastAPI app ready.", flush=True)
sys.stdout.flush()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port, workers=settings.web_workers)
