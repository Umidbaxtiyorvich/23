"""Umumiy yordamchilar: statistika yozish, taxminiy ballar, premium cheklovlari, email."""
from __future__ import annotations

import logging
import smtplib
import ssl
from datetime import date, datetime, timezone
from email.message import EmailMessage

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import (Profile, SpeakingSession, Subscription, Test, TestAttempt, User, UserStatistics,
                      WritingSubmission)
from .scoring import LEVEL_BASELINE, overall_band, round_band

log = logging.getLogger("common")
SKILLS = ("listening", "reading", "writing", "speaking")


# ---------------- statistika
def today_stats(db: Session, user_id: int, day: date | None = None) -> UserStatistics:
    day = day or date.today()
    row = db.scalar(select(UserStatistics).where(UserStatistics.user_id == user_id, UserStatistics.date == day))
    if not row:
        row = UserStatistics(user_id=user_id, date=day, study_minutes=0, tests_completed=0, ai_requests=0,
                             words_reviewed=0, games_played=0, game_points=0, tasks_completed=0)
        db.add(row)
        db.flush()
    return row


def record(db: Session, user_id: int, **inc: int) -> None:
    row = today_stats(db, user_id)
    for k, v in inc.items():
        setattr(row, k, (getattr(row, k) or 0) + int(v))
    if "study_minutes" in inc:
        row.study_minutes = min(row.study_minutes, 24 * 60)


# ---------------- premium
def is_premium(user: User) -> bool:
    sub = user.subscription
    if not sub or sub.plan != "premium" or sub.status != "active":
        return False
    return sub.expires_at is None or sub.expires_at > datetime.now(timezone.utc)


def ensure_subscription(db: Session, user: User) -> Subscription:
    if not user.subscription:
        user.subscription = Subscription(plan="free", status="active", provider="none")
        db.flush()
    return user.subscription


def require_premium(user: User, feature: str) -> None:
    if not is_premium(user):
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED,
                            f"«{feature}» faqat Premium foydalanuvchilar uchun. Tariflar sahifasida Premiumga o'ting.")


def check_ai_quota(db: Session, user: User) -> None:
    """Free foydalanuvchi uchun kunlik AI so'rovlar limiti."""
    if is_premium(user) or user.is_admin:
        return
    used = today_stats(db, user.id).ai_requests
    if used >= settings.free_ai_daily_limit:
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED,
                            f"Bepul tarifda kuniga {settings.free_ai_daily_limit} ta AI so'rov mumkin. "
                            "Ertaga qayta urinib ko'ring yoki Premiumga o'ting.")


def check_test_quota(db: Session, user: User, test: Test) -> None:
    if is_premium(user) or user.is_admin:
        return
    if test.is_premium:
        require_premium(user, "Premium mock test")
    started_today = db.scalar(select(func.count(TestAttempt.id)).where(
        TestAttempt.user_id == user.id, func.date(TestAttempt.started_at) == date.today()))
    if (started_today or 0) >= settings.free_tests_daily_limit:
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED,
                            f"Bepul tarifda kuniga {settings.free_tests_daily_limit} ta test boshlash mumkin.")


# ---------------- taxminiy ballar
def skill_bands(db: Session, user: User, last_n: int = 3) -> dict[str, float | None]:
    out: dict[str, float | None] = {}
    for skill in ("listening", "reading"):
        rows = db.scalars(select(TestAttempt.band).join(Test).where(
            TestAttempt.user_id == user.id, TestAttempt.status == "submitted", Test.skill == skill,
            TestAttempt.band.is_not(None)).order_by(TestAttempt.submitted_at.desc()).limit(last_n)).all()
        out[skill] = round_band(sum(rows) / len(rows)) if rows else None
    w = db.scalars(select(WritingSubmission.band).where(WritingSubmission.user_id == user.id,
                   WritingSubmission.band.is_not(None)).order_by(WritingSubmission.created_at.desc()).limit(last_n)).all()
    out["writing"] = round_band(sum(w) / len(w)) if w else None
    s = db.scalars(select(SpeakingSession.band).where(SpeakingSession.user_id == user.id,
                   SpeakingSession.band.is_not(None)).order_by(SpeakingSession.created_at.desc()).limit(last_n)).all()
    out["speaking"] = round_band(sum(s) / len(s)) if s else None
    return out


def estimated_overall(profile: Profile | None, bands: dict[str, float | None]) -> tuple[float, bool]:
    """(ball, faqat_daraja_asosida_mi). Test natijalari bo'lmasa — darajadan taxmin."""
    ov = overall_band(list(bands.values()))
    if ov is not None:
        return ov, False
    return LEVEL_BASELINE.get(profile.current_level if profile else "B1", 5.0), True


# ---------------- email
def send_email(to: str, subject: str, body: str) -> bool:
    """SMTP sozlangan bo'lsa yuboradi; aks holda logga yozadi (dev rejim). True — haqiqatan yuborildi."""
    if not settings.smtp_host:
        log.warning("[DEV EMAIL] To: %s | %s\n%s", to, subject, body)
        return False
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as s:
            if settings.smtp_tls:
                s.starttls(context=ssl.create_default_context())
            if settings.smtp_user:
                s.login(settings.smtp_user, settings.smtp_password)
            s.send_message(msg)
        return True
    except (OSError, smtplib.SMTPException) as e:
        log.error("Email yuborilmadi: %s", e)
        return False
