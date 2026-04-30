import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

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

HEAVY_ROUTES_OK = True
try:
    logger.info("[startup] importing heavy routes (auth, routes)...")
    from app.routes import auth, routes as routes_module  # noqa: E402
    logger.info("[startup] heavy routes loaded.")
except Exception as exc:  # pragma: no cover
    logger.exception("[startup] heavy routes failed to import: %s", exc)
    HEAVY_ROUTES_OK = False

settings = get_settings()

# ── Rate limiter ───────────────────────────────────────────────────────────────
from app.limiter import limiter  # noqa: E402


# ── CSRF middleware ────────────────────────────────────────────────────────────
# Double-submit cookie pattern: login sets csrf_token (non-httpOnly) cookie;
# all state-changing requests must echo it as X-CSRF-Token header.
# Auth endpoints are exempt (login/register don't yet have a token).
_CSRF_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
_CSRF_EXEMPT_PATHS = {"/api/auth/login", "/api/auth/register", "/api/auth/logout", "/health"}


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        import os
        if os.getenv("CSRF_ENABLED", "true").lower() != "false":
            if request.method not in _CSRF_SAFE_METHODS and request.url.path not in _CSRF_EXEMPT_PATHS:
                csrf_cookie = request.cookies.get("csrf_token")
                csrf_header = request.headers.get("X-CSRF-Token")
                if not csrf_cookie or csrf_cookie != csrf_header:
                    return JSONResponse(status_code=403, content={"detail": "CSRF validation failed"})
        return await call_next(request)


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

# Wire rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

cors_origins = settings.cors_origins_list
allow_credentials = "*" not in cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*", "X-CSRF-Token"],
    expose_headers=["X-CSRF-Token"],
)
logger.info("[startup] CORS origins: %s (credentials=%s)", cors_origins, allow_credentials)

# CSRF must come after CORS (CORS sets headers, CSRF reads request headers/cookies)
app.add_middleware(CSRFMiddleware)

app.include_router(health.router)

if HEAVY_ROUTES_OK:
    app.include_router(auth.router)
    app.include_router(routes_module.router)
else:
    logger.warning("[startup] heavy routes disabled — only /health is available")

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
