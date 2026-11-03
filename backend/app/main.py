"""IELTS AI MASTER — FastAPI ilovasi.

Swagger:  http://localhost:8000/docs     ReDoc: http://localhost:8000/redoc
"""
from __future__ import annotations

import logging
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import settings
from .db import SessionLocal
from .models import ErrorLog
from .ratelimit import RateLimitMiddleware
from .routers import admin, auth, insights, plan, practice, profile, tests, vocab_games

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("app")


def log_error(level: str, request: Request | None, message: str, details: str = "", source: str = "api") -> None:
    try:
        with SessionLocal() as db:
            db.add(ErrorLog(level=level, source=source, method=request.method if request else "",
                            path=str(request.url.path)[:300] if request else "", message=message[:2000], details=details[:20000]))
            db.commit()
    except Exception:  # log yozishda xato ilovani to'xtatmasin
        log.exception("Error log yozilmadi")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.jwt_secret.startswith("change-me") and settings.is_production:
        raise RuntimeError("Production muhitida JWT_SECRET ni o'zgartiring!")
    from . import seed  # testlar, lug'at va admin har doim; demo foydalanuvchilar SEED_DEMO_DATA=true bo'lsa
    try:
        seed.run()
    except Exception as e:  # migratsiya qilinmagan bo'lsa
        log.error("Seed bajarilmadi (alembic upgrade head qildingizmi?): %s", e)
    yield


app = FastAPI(
    title=f"{settings.app_name} API",
    version="1.0.0",
    description="AI asosidagi IELTS tayyorlov platformasi API'si. Avtorizatsiya: `POST /api/auth/login` dan olingan "
                "`access_token` ni **Authorize** tugmasi orqali `Bearer` sifatida kiriting.",
    lifespan=lifespan,
)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    return response


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    errors = []
    for e in exc.errors():
        loc = ".".join(str(x) for x in e.get("loc", []) if x != "body")
        msg = str(e.get("msg", "")).replace("Value error, ", "")
        errors.append(f"{loc}: {msg}" if loc else msg)
    return JSONResponse({"detail": "; ".join(errors) or "Ma'lumotlar noto'g'ri", "errors": exc.errors() if settings.debug else None},
                        status_code=422)


@app.exception_handler(StarletteHTTPException)
async def http_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code >= 500:
        log_error("error", request, str(exc.detail))
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code, headers=getattr(exc, "headers", None))


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    log.exception("Kutilmagan xato: %s %s", request.method, request.url.path)
    log_error("error", request, f"{exc.__class__.__name__}: {exc}", traceback.format_exc())
    return JSONResponse({"detail": "Serverda kutilmagan xatolik yuz berdi. Administratorlar xabardor qilindi."}, status_code=500)


for r in (auth.router, profile.router, insights.public_router, insights.dashboard_router, plan.router, tests.router,
          tests.listening_router, tests.reading_router, practice.writing_router, practice.speaking_router, practice.ai_router,
          vocab_games.vocab_router, vocab_games.games_router, insights.stats_router, insights.sub_router, admin.router):
    app.include_router(r)


@app.get("/", include_in_schema=False)
def root():
    return {"name": settings.app_name, "docs": "/docs", "health": "/api/health"}
