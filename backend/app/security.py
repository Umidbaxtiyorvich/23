"""Parol hashlash, JWT tokenlar va himoyalangan endpointlar uchun dependency'lar."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import User

bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], hashed.encode())
    except ValueError:
        return False


def _encode(payload: dict[str, Any], expires: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {**payload, "iat": now, "exp": now + expires}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str, purpose: str) -> dict[str, Any]:
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token muddati tugagan")
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token yaroqsiz")
    if data.get("purpose") != purpose:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token turi noto'g'ri")
    return data


def create_access_token(user: User) -> str:
    return _encode({"sub": str(user.id), "purpose": "access", "ver": user.token_version},
                   timedelta(minutes=settings.access_token_minutes))


def create_refresh_token(user: User) -> str:
    return _encode({"sub": str(user.id), "purpose": "refresh", "ver": user.token_version},
                   timedelta(days=settings.refresh_token_days))


def create_email_token(user: User, purpose: str, hours: int = 24) -> str:
    # parol hash'ining bir qismi — parol almashgach tiklash havolasi qayta ishlamaydi (bir martalik)
    return _encode({"sub": str(user.id), "purpose": purpose, "fp": user.password_hash[-12:]}, timedelta(hours=hours))


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not creds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Avtorizatsiya talab qilinadi",
                            headers={"WWW-Authenticate": "Bearer"})
    data = decode_token(creds.credentials, "access")
    user = db.get(User, int(data["sub"]))
    if not user or not user.is_active or data.get("ver") != user.token_version:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessiya yaroqsiz, qayta kiring")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Faqat administratorlar uchun")
    return user
