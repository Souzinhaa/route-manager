"""
Double-submit cookie CSRF protection.

Validates X-CSRF-Token header matches csrf_token cookie on state-changing
requests. Skips safe methods (GET/HEAD/OPTIONS), webhook endpoints (signed
separately), and login/register (no session yet).

Disable in tests with env CSRF_ENABLED=false.
"""
import hmac
import os

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

EXEMPT_PATHS = {
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
    "/api/webhook/asaas",
}


def _csrf_enabled() -> bool:
    return os.getenv("CSRF_ENABLED", "true").lower() not in ("false", "0", "no")


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not _csrf_enabled():
            return await call_next(request)

        if request.method not in UNSAFE_METHODS:
            return await call_next(request)

        path = request.url.path
        if path in EXEMPT_PATHS or path.startswith("/api/webhook/"):
            return await call_next(request)

        if not path.startswith("/api/"):
            return await call_next(request)

        cookie_token = request.cookies.get("csrf_token")
        header_token = request.headers.get("x-csrf-token")

        if not cookie_token or not header_token:
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF token missing"},
            )

        if not hmac.compare_digest(cookie_token, header_token):
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF token invalid"},
            )

        return await call_next(request)
