"""Oddiy in-memory sliding-window rate limiter (bitta server jarayoni uchun).
Ko'p serverli muhitda Redis asosidagi limiterga almashtiring."""
from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .config import settings


class RateLimiter:
    def __init__(self) -> None:
        self.hits: dict[str, deque[float]] = defaultdict(deque)
        self.lock = Lock()

    def allow(self, key: str, limit: int, window: float = 60.0) -> tuple[bool, int]:
        now = time.monotonic()
        with self.lock:
            q = self.hits[key]
            while q and now - q[0] > window:
                q.popleft()
            if len(q) >= limit:
                return False, int(window - (now - q[0])) + 1
            q.append(now)
            return True, 0

    def reset(self) -> None:
        with self.lock:
            self.hits.clear()


limiter = RateLimiter()


def _group(path: str) -> tuple[str, int] | None:
    if path.startswith("/api/auth/") and not path.endswith("/me") and not path.endswith("/refresh"):
        return "auth", settings.rate_limit_auth_per_min
    if path.startswith("/api/ai/") or path.endswith("/evaluate") or path.endswith("/transcribe"):
        return "ai", settings.rate_limit_ai_per_min
    if path.startswith("/api/"):
        return "global", settings.rate_limit_global_per_min
    return None


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        g = _group(request.url.path) if request.method != "OPTIONS" else None
        if g:
            ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "?")
            ok, retry = limiter.allow(f"{g[0]}:{ip}", g[1])
            if not ok:
                return JSONResponse({"detail": "Juda ko'p so'rov. Birozdan so'ng qayta urinib ko'ring."},
                                    status_code=429, headers={"Retry-After": str(retry)})
        return await call_next(request)
