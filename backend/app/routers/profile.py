from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..security import get_current_user
from ..serializers import ensure_user_rows, user_out
from ..services import ai, planner

router = APIRouter(prefix="/api/profile", tags=["profile"])

Skill = Literal["listening", "reading", "writing", "speaking"]
Level = Literal["A1", "A2", "B1", "B2", "C1", "C2"]


class OnboardingIn(BaseModel):
    exam_type: Literal["academic", "general"]
    current_level: Level
    target_band: float = Field(ge=4.0, le=9.0)
    exam_date: date | None = None
    daily_minutes: int = Field(ge=10, le=480)
    weak_skills: list[Skill] = Field(default_factory=list, max_length=4)

    @field_validator("target_band")
    @classmethod
    def half_steps(cls, v: float) -> float:
        return round(v * 2) / 2

    @field_validator("exam_date")
    @classmethod
    def future(cls, v: date | None) -> date | None:
        if v and v < date.today():
            raise ValueError("Imtihon sanasi o'tmishda bo'lishi mumkin emas")
        return v


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    exam_type: Literal["academic", "general"] | None = None
    current_level: Level | None = None
    target_band: float | None = Field(default=None, ge=4.0, le=9.0)
    exam_date: date | None = None
    clear_exam_date: bool = False
    daily_minutes: int | None = Field(default=None, ge=10, le=480)
    weak_skills: list[Skill] | None = Field(default=None, max_length=4)
    country: str | None = Field(default=None, max_length=60)
    bio: str | None = Field(default=None, max_length=1000)


class SettingsUpdate(BaseModel):
    explain_in_uzbek: bool | None = None
    tts_enabled: bool | None = None
    tts_rate: float | None = Field(default=None, ge=0.5, le=1.5)
    email_notifications: bool | None = None
    theme: Literal["light", "dark", "system"] | None = None


@router.get("")
def get_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_user_rows(db, user)
    db.commit()
    return user_out(user)


@router.post("/onboarding")
def onboarding(body: OnboardingIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_user_rows(db, user)
    p = user.profile
    for k, v in body.model_dump().items():
        setattr(p, k, v)
    p.onboarded = True
    db.commit()
    plan = planner.build_plan(db, user, use_ai=ai.is_available(db))
    return {"user": user_out(user), "plan_id": plan.id}


@router.put("")
def update_profile(body: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_user_rows(db, user)
    data = body.model_dump(exclude_unset=True)
    if "full_name" in data and data["full_name"]:
        user.full_name = data.pop("full_name").strip()
    data.pop("full_name", None)
    if data.pop("clear_exam_date", False):
        user.profile.exam_date = None
    if data.get("exam_date") and data["exam_date"] < date.today():
        raise HTTPException(422, "Imtihon sanasi o'tmishda bo'lishi mumkin emas")
    if "target_band" in data and data["target_band"] is not None:
        data["target_band"] = round(data["target_band"] * 2) / 2
    for k, v in data.items():
        if v is not None:
            setattr(user.profile, k, v)
    db.commit()
    return user_out(user)


@router.put("/settings")
def update_settings(body: SettingsUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_user_rows(db, user)
    for k, v in body.model_dump(exclude_unset=True).items():
        if v is not None:
            setattr(user.settings, k, v)
    db.commit()
    return user_out(user)
