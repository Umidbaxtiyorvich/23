from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import User
from ..security import (create_access_token, create_email_token, create_refresh_token, decode_token,
                        get_current_user, hash_password, verify_password)
from ..serializers import ensure_user_rows, user_out
from ..services.common import send_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _strong(v: str) -> str:
    if len(v) < 8 or not any(c.isdigit() for c in v) or not any(c.isalpha() for c in v):
        raise ValueError("Parol kamida 8 belgi, harf va raqamdan iborat bo'lishi kerak")
    return v


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)
    full_name: str = Field(min_length=2, max_length=120)

    @field_validator("password")
    @classmethod
    def _pw(cls, v: str) -> str:
        return _strong(v)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class RefreshIn(BaseModel):
    refresh_token: str


class TokenIn(BaseModel):
    token: str


class EmailIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str = Field(max_length=128)

    @field_validator("password")
    @classmethod
    def _pw(cls, v: str) -> str:
        return _strong(v)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(max_length=128)
    new_password: str = Field(max_length=128)

    @field_validator("new_password")
    @classmethod
    def _pw(cls, v: str) -> str:
        return _strong(v)


def _tokens(user: User) -> dict:
    return {"access_token": create_access_token(user), "refresh_token": create_refresh_token(user),
            "token_type": "bearer", "expires_in": settings.access_token_minutes * 60, "user": user_out(user)}


def _send_verification(user: User) -> str:
    link = f"{settings.frontend_url}/verify-email?token={create_email_token(user, 'verify', hours=48)}"
    send_email(user.email, f"{settings.app_name}: emailingizni tasdiqlang",
               f"Salom, {user.full_name}!\n\nEmailingizni tasdiqlash uchun havolani oching:\n{link}\n\nHavola 48 soat amal qiladi.")
    return link


def _dev(link: str) -> dict:
    return {"dev_link": link} if settings.email_dev_return_links and not settings.is_production else {}


@router.post("/register", status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User).where(func.lower(User.email) == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Bu email bilan ro'yxatdan o'tilgan")
    user = User(email=email, password_hash=hash_password(body.password), full_name=body.full_name.strip(),
                is_active=True, is_verified=False, is_admin=False, token_version=0)
    db.add(user)
    db.flush()
    ensure_user_rows(db, user)
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    link = _send_verification(user)
    return {**_tokens(user), **_dev(link)}


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(func.lower(User.email) == body.email.lower()))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email yoki parol noto'g'ri")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Hisob bloklangan. Administrator bilan bog'laning")
    ensure_user_rows(db, user)
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    return _tokens(user)


@router.post("/refresh")
def refresh(body: RefreshIn, db: Session = Depends(get_db)):
    data = decode_token(body.refresh_token, "refresh")
    user = db.get(User, int(data["sub"]))
    if not user or not user.is_active or data.get("ver") != user.token_version:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessiya tugagan, qayta kiring")
    return _tokens(user)


@router.post("/logout")
def logout(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Barcha qurilmalardagi tokenlarni bekor qiladi."""
    user.token_version += 1
    db.commit()
    return {"ok": True}


@router.get("/me")
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_user_rows(db, user)
    db.commit()
    return user_out(user)


@router.post("/verify-email")
def verify_email(body: TokenIn, db: Session = Depends(get_db)):
    data = decode_token(body.token, "verify")
    user = db.get(User, int(data["sub"]))
    if not user:
        raise HTTPException(404, "Foydalanuvchi topilmadi")
    user.is_verified = True
    db.commit()
    return {"ok": True, "message": "Email tasdiqlandi"}


@router.post("/resend-verification")
def resend(user: User = Depends(get_current_user)):
    if user.is_verified:
        return {"ok": True, "message": "Email allaqachon tasdiqlangan"}
    link = _send_verification(user)
    return {"ok": True, "message": "Tasdiqlash xati yuborildi", **_dev(link)}


@router.post("/forgot-password")
def forgot(body: EmailIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(func.lower(User.email) == body.email.lower()))
    resp = {"ok": True, "message": "Agar bu email ro'yxatdan o'tgan bo'lsa, tiklash havolasi yuborildi"}
    if user and user.is_active:
        link = f"{settings.frontend_url}/reset-password?token={create_email_token(user, 'reset', hours=1)}"
        send_email(user.email, f"{settings.app_name}: parolni tiklash",
                   f"Parolni tiklash uchun havola (1 soat amal qiladi):\n{link}\n\nAgar siz so'ramagan bo'lsangiz, e'tibor bermang.")
        resp.update(_dev(link))
    return resp


@router.post("/reset-password")
def reset(body: ResetIn, db: Session = Depends(get_db)):
    data = decode_token(body.token, "reset")
    user = db.get(User, int(data["sub"]))
    if not user or data.get("fp") != user.password_hash[-12:]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Havola yaroqsiz yoki allaqachon ishlatilgan")
    user.password_hash = hash_password(body.password)
    user.token_version += 1
    user.is_verified = True  # email orqali kelgan — demak email egasi
    db.commit()
    return {"ok": True, "message": "Parol yangilandi. Endi yangi parol bilan kiring"}


@router.post("/change-password")
def change_password(body: ChangePasswordIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(400, "Joriy parol noto'g'ri")
    user.password_hash = hash_password(body.new_password)
    user.token_version += 1
    db.commit()
    return _tokens(user)
