from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from .models import Profile, User, UserSettings
from .services.common import ensure_subscription, is_premium


def ensure_user_rows(db: Session, user: User) -> None:
    if not user.profile:
        user.profile = Profile(exam_type="academic", current_level="B1", target_band=6.5, daily_minutes=60,
                               weak_skills=[], onboarded=False, country="Uzbekistan", bio="")
    if not user.settings:
        user.settings = UserSettings(explain_in_uzbek=True, tts_enabled=True, tts_rate=1.0,
                                     email_notifications=True, theme="light")
    ensure_subscription(db, user)
    db.flush()


def profile_out(p: Profile) -> dict[str, Any]:
    return {
        "exam_type": p.exam_type, "current_level": p.current_level, "target_band": p.target_band,
        "exam_date": p.exam_date.isoformat() if p.exam_date else None, "daily_minutes": p.daily_minutes,
        "weak_skills": p.weak_skills or [], "onboarded": p.onboarded, "country": p.country, "bio": p.bio,
    }


def settings_out(s: UserSettings) -> dict[str, Any]:
    return {"explain_in_uzbek": s.explain_in_uzbek, "tts_enabled": s.tts_enabled, "tts_rate": s.tts_rate,
            "email_notifications": s.email_notifications, "theme": s.theme}


def user_out(user: User) -> dict[str, Any]:
    sub = user.subscription
    return {
        "id": user.id, "email": user.email, "full_name": user.full_name, "is_verified": user.is_verified,
        "is_admin": user.is_admin, "is_premium": is_premium(user), "plan": "premium" if is_premium(user) else "free",
        "subscription": {"plan": sub.plan, "status": sub.status, "provider": sub.provider,
                         "expires_at": sub.expires_at.isoformat() if sub and sub.expires_at else None} if sub else None,
        "created_at": user.created_at.isoformat(),
        "profile": profile_out(user.profile) if user.profile else None,
        "settings": settings_out(user.settings) if user.settings else None,
    }
