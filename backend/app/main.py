import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
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
from app.config import get_settings, validate_production_settings  # noqa: E402

logger.info("[startup] importing models...")
from app.models.db import Base  # noqa: E402

logger.info("[startup] importing deps...")
from app.deps import _engine  # noqa: E402

logger.info("[startup] importing health route...")
from app.routes import health  # noqa: E402

HEAVY_ROUTES_OK = True
try:
    logger.info("[startup] importing heavy routes (auth, routes, billing, webhook)...")
    from app.routes import auth, routes as routes_module, billing, webhook, admin, users, public, partner  # noqa: E402
    logger.info("[startup] heavy routes loaded.")
except Exception as exc:  # pragma: no cover
    logger.exception("[startup] heavy routes failed to import: %s", exc)
    HEAVY_ROUTES_OK = False

settings = get_settings()

# ── Rate limiter ───────────────────────────────────────────────────────────────
from app.limiter import limiter  # noqa: E402


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if settings.cookie_secure:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://maps.googleapis.com https://maps.gstatic.com https://viacep.com.br; "
            "frame-ancestors 'none';"
        )
        return response


async def _run_monthly_payouts():
    """APScheduler job: run payouts on the configured day each month."""
    from datetime import datetime
    from sqlalchemy.orm import Session
    from app.deps import SessionLocal as _SessionLocal
    from app.models.db import Partner, PayoutConfig
    from sqlalchemy import select

    db: Session = _SessionLocal()
    try:
        cfg = db.execute(select(PayoutConfig).where(PayoutConfig.id == 1)).scalars().first()
        if not cfg or not cfg.auto_enabled:
            return
        now = datetime.utcnow()
        current_month = now.strftime("%Y-%m")
        if cfg.last_run_month == current_month:
            return
        if now.day != cfg.payout_day:
            return

        logger.info("[payout] Running monthly auto-payouts for %s", current_month)
        from app.config import get_settings as _get_settings
        _settings = _get_settings()
        from app.routes.admin import _execute_partner_payout
        import asyncio

        _BATCH = 50
        offset = 0
        total_processed = 0
        while True:
            partners = db.execute(
                select(Partner)
                .where(Partner.is_active == True, Partner.pix_key.isnot(None))
                .limit(_BATCH)
                .offset(offset)
            ).scalars().all()
            if not partners:
                break
            for partner in partners:
                await _execute_partner_payout(partner, db, _settings)
            total_processed += len(partners)
            offset += _BATCH

        cfg.last_run_month = current_month
        db.commit()
        logger.info("[payout] Monthly payouts done — %d partners processed.", total_processed)
    except Exception as exc:
        logger.exception("[payout] Monthly payout job failed: %s", exc)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_production_settings(settings)
    logger.info("[startup] creating database tables...")
    try:
        Base.metadata.create_all(bind=_engine)
        logger.info("[startup] database tables ready.")
    except Exception as exc:
        logger.exception("[startup] ERROR creating tables: %s", exc)

    logger.info("[startup] running migrations...")
    try:
        from app.migrations import run_migrations
        run_migrations(_engine)
    except Exception as exc:
        logger.exception("[startup] ERROR running migrations: %s", exc)

    logger.info("[startup] starting payout scheduler...")
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        scheduler = AsyncIOScheduler()
        scheduler.add_job(_run_monthly_payouts, "cron", hour=9, minute=0)
        scheduler.start()
        logger.info("[startup] Payout scheduler started (checks daily at 09:00 UTC).")
    except Exception as exc:
        logger.exception("[startup] Payout scheduler failed to start: %s", exc)

    yield
    logger.info("[shutdown] bye.")


app = FastAPI(title="Route Manager API", lifespan=lifespan)

# Wire rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

from app.middleware.csrf import CSRFMiddleware  # noqa: E402

# Middleware order matters: last add_middleware = outermost = runs first on request.
# SecurityHeaders → CSRF → CORS (outermost) ensures all responses get CORS headers,
# including 403s from CSRFMiddleware, so the browser sees the real error not a fake CORS error.
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CSRFMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)

cors_origins = settings.cors_origins_list
allow_credentials = "*" not in cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*", "Authorization", "Content-Type", "X-CSRF-Token"],
    expose_headers=["*"],
    max_age=3600,
)
logger.info("[startup] CORS origins: %s (credentials=%s)", cors_origins, allow_credentials)

app.include_router(health.router)

if HEAVY_ROUTES_OK:
    app.include_router(auth.router)
    app.include_router(routes_module.router)
    app.include_router(public.router)
    app.include_router(billing.router)
    app.include_router(webhook.router)
    app.include_router(admin.router)
    app.include_router(users.router)
    app.include_router(partner.router)
else:
    logger.warning("[startup] heavy routes disabled — only /health is available")

STATIC_DIR = Path("/app/static")
ASSETS_DIR = STATIC_DIR / "assets"

try:
    if ASSETS_DIR.is_dir():
        app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
        logger.info("[startup] Static files mounted from %s", ASSETS_DIR)
except Exception as exc:
    logger.warning("[startup] Could not mount static files: %s", exc)


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
