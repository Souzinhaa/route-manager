import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("app.main")

logger.info("[startup] importing config...")
from app.config import get_settings  # noqa: E402

logger.info("[startup] importing models...")
from app.models.db import Base  # noqa: E402

logger.info("[startup] importing deps...")
from app.deps import _engine  # noqa: E402

logger.info("[startup] importing health route...")
from app.routes import health  # noqa: E402

# Heavy imports (ortools, tesseract, pdf2image) — wrap so /health survives even if these fail.
HEAVY_ROUTES_OK = True
try:
    logger.info("[startup] importing heavy routes (auth, routes)...")
    from app.routes import auth, routes as routes_module  # noqa: E402
    logger.info("[startup] heavy routes loaded.")
except Exception as exc:  # pragma: no cover - defensive boot guard
    logger.exception("[startup] heavy routes failed to import: %s", exc)
    HEAVY_ROUTES_OK = False

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[startup] creating database tables...")
    try:
        Base.metadata.create_all(bind=_engine)
        logger.info("[startup] database tables ready.")
    except Exception as exc:
        logger.exception("[startup] ERROR creating tables: %s", exc)
    yield
    logger.info("[shutdown] bye.")


app = FastAPI(title="Route Manager API", lifespan=lifespan)

cors_origins = settings.cors_origins_list
allow_credentials = "*" not in cors_origins  # Browsers reject credentials with wildcard origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info("[startup] CORS origins: %s (credentials=%s)", cors_origins, allow_credentials)

# Health route MUST register first so /{full_path:path} catch-all doesn't shadow it.
app.include_router(health.router)

if HEAVY_ROUTES_OK:
    app.include_router(auth.router)
    app.include_router(routes_module.router)
else:
    logger.warning("[startup] heavy routes disabled — only /health is available")

# Serve compiled SPA bundled into image at /app/static
STATIC_DIR = Path("/app/static")
ASSETS_DIR = STATIC_DIR / "assets"

if ASSETS_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    index = STATIC_DIR / "index.html"
    if index.is_file():
        return FileResponse(index)
    return {"message": "Route Manager API"}


logger.info("[startup] FastAPI app ready.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port, workers=settings.web_workers)
