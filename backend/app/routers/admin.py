from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import (AIFeedback, AppSetting, ErrorLog, SpeakingSession, Test, TestAttempt, TestQuestion, User,
                      UserStatistics, Vocabulary, WritingSubmission)
from ..security import require_admin
from ..serializers import ensure_user_rows, user_out
from ..services import ai
from ..services.common import ensure_subscription, is_premium
from .tests import question_out

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])

QTypes = Literal["mcq", "tfng", "ynng", "matching_headings", "gap_fill", "short_answer", "writing_task", "speaking_prompt"]


@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    week = datetime.now(timezone.utc) - timedelta(days=7)
    users = db.scalar(select(func.count(User.id))) or 0
    premium = sum(1 for u in db.scalars(select(User)) if is_premium(u))
    signups = db.execute(select(func.date(User.created_at), func.count(User.id)).where(User.created_at >= week - timedelta(days=23))
                         .group_by(func.date(User.created_at)).order_by(func.date(User.created_at))).all()
    activity = db.execute(select(UserStatistics.date, func.sum(UserStatistics.study_minutes), func.sum(UserStatistics.ai_requests),
                                 func.count(UserStatistics.user_id.distinct()))
                          .where(UserStatistics.date >= date.today() - timedelta(days=13))
                          .group_by(UserStatistics.date).order_by(UserStatistics.date)).all()
    return {
        "users": users, "premium_users": premium,
        "active_7d": db.scalar(select(func.count(User.id)).where(User.last_login_at >= week)) or 0,
        "tests": db.scalar(select(func.count(Test.id))) or 0,
        "attempts": db.scalar(select(func.count(TestAttempt.id)).where(TestAttempt.status == "submitted")) or 0,
        "writing": db.scalar(select(func.count(WritingSubmission.id))) or 0,
        "speaking": db.scalar(select(func.count(SpeakingSession.id))) or 0,
        "ai_feedback": db.scalar(select(func.count(AIFeedback.id))) or 0,
        "ai_feedback_demo": db.scalar(select(func.count(AIFeedback.id)).where(AIFeedback.is_demo.is_(True))) or 0,
        "vocabulary": db.scalar(select(func.count(Vocabulary.id))) or 0,
        "errors_24h": db.scalar(select(func.count(ErrorLog.id)).where(ErrorLog.created_at >= datetime.now(timezone.utc) - timedelta(days=1))) or 0,
        "signups": [{"date": str(d), "count": c} for d, c in signups],
        "activity": [{"date": d.isoformat(), "minutes": int(m or 0), "ai_requests": int(a or 0), "active_users": u} for d, m, a, u in activity],
    }


# ------------------------------------------------------------------ users
@router.get("/users")
def users(search: str = Query("", max_length=100), page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
          db: Session = Depends(get_db)):
    q = select(User)
    if search:
        like = f"%{search.lower()}%"
        q = q.where(or_(func.lower(User.email).like(like), func.lower(User.full_name).like(like)))
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    rows = db.scalars(q.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size)).all()
    out = []
    for u in rows:
        ensure_user_rows(db, u)
        d = user_out(u)
        d["last_login_at"] = u.last_login_at.isoformat() if u.last_login_at else None
        d["attempts"] = db.scalar(select(func.count(TestAttempt.id)).where(TestAttempt.user_id == u.id)) or 0
        out.append(d)
    db.commit()
    return {"total": total, "items": out}


class UserPatch(BaseModel):
    is_active: bool | None = None
    is_admin: bool | None = None
    is_verified: bool | None = None
    premium_days: int | None = Field(default=None, ge=0, le=3650)  # 0 — premiumni olib tashlash


@router.patch("/users/{uid}")
def patch_user(uid: int, body: UserPatch, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    u = db.get(User, uid)
    if not u:
        raise HTTPException(404, "Foydalanuvchi topilmadi")
    if u.id == admin.id and (body.is_admin is False or body.is_active is False):
        raise HTTPException(400, "O'zingizni admin huquqidan yoki faollikdan mahrum qila olmaysiz")
    for k in ("is_active", "is_admin", "is_verified"):
        v = getattr(body, k)
        if v is not None:
            setattr(u, k, v)
    if body.is_active is False:
        u.token_version += 1
    if body.premium_days is not None:
        sub = ensure_subscription(db, u)
        if body.premium_days == 0:
            sub.plan, sub.expires_at, sub.provider = "free", None, "none"
        else:
            sub.plan, sub.status, sub.provider = "premium", "active", "admin"
            sub.started_at = datetime.now(timezone.utc)
            sub.expires_at = datetime.now(timezone.utc) + timedelta(days=body.premium_days)
    db.commit()
    return user_out(u)


# ------------------------------------------------------------------ tests & questions
class QuestionIn(BaseModel):
    section: int = Field(default=0, ge=0, le=10)
    order: int = Field(default=0, ge=0, le=500)
    qtype: QTypes
    prompt: str = Field(min_length=1, max_length=10000)
    options: list[str] = Field(default_factory=list, max_length=20)
    answer: list[str] = Field(default_factory=list, max_length=10)
    word_limit: int | None = Field(default=None, ge=1, le=10)
    points: int = Field(default=1, ge=0, le=10)
    extra: dict[str, Any] = Field(default_factory=dict)


class TestIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    skill: Literal["listening", "reading", "writing", "speaking"]
    exam_type: Literal["academic", "general"] = "academic"
    description: str = Field(default="", max_length=2000)
    duration_min: int = Field(default=30, ge=1, le=240)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    is_premium: bool = False
    is_published: bool = True
    content: dict[str, Any] = Field(default_factory=dict)
    questions: list[QuestionIn] | None = None


def admin_test_out(t: Test) -> dict:
    return {"id": t.id, "title": t.title, "skill": t.skill, "exam_type": t.exam_type, "description": t.description,
            "duration_min": t.duration_min, "difficulty": t.difficulty, "is_premium": t.is_premium,
            "is_published": t.is_published, "content": t.content, "created_at": t.created_at.isoformat(),
            "questions": [question_out(q, reveal=True) for q in t.questions]}


@router.get("/tests")
def tests(db: Session = Depends(get_db)):
    return [{**admin_test_out(t), "questions": len(t.questions)} for t in db.scalars(select(Test).order_by(Test.skill, Test.id))]


@router.get("/tests/{tid}")
def get_test(tid: int, db: Session = Depends(get_db)):
    t = db.get(Test, tid)
    if not t:
        raise HTTPException(404, "Test topilmadi")
    return admin_test_out(t)


def _validate_q(q: QuestionIn) -> None:
    if q.qtype in ("mcq", "matching_headings") and len(q.options) < 2:
        raise HTTPException(422, f"«{q.prompt[:30]}» savoli uchun kamida 2 ta variant kerak")
    if q.qtype not in ("writing_task", "speaking_prompt") and not q.answer:
        raise HTTPException(422, f"«{q.prompt[:30]}» savoli uchun to'g'ri javob kiritilmagan")


@router.post("/tests", status_code=201)
def create_test(body: TestIn, db: Session = Depends(get_db)):
    data = body.model_dump(exclude={"questions"})
    t = Test(**data)
    for i, q in enumerate(body.questions or []):
        _validate_q(q)
        t.questions.append(TestQuestion(**{**q.model_dump(), "order": q.order or i + 1}))
    db.add(t)
    db.commit()
    return admin_test_out(t)


@router.put("/tests/{tid}")
def update_test(tid: int, body: TestIn, db: Session = Depends(get_db)):
    t = db.get(Test, tid)
    if not t:
        raise HTTPException(404, "Test topilmadi")
    for k, v in body.model_dump(exclude={"questions"}).items():
        setattr(t, k, v)
    if body.questions is not None:
        if db.scalar(select(func.count(TestAttempt.id)).where(TestAttempt.test_id == t.id)):
            raise HTTPException(409, "Bu testda urinishlar bor — savollarni alohida tahrirlang")
        t.questions.clear()
        db.flush()
        for i, q in enumerate(body.questions):
            _validate_q(q)
            t.questions.append(TestQuestion(**{**q.model_dump(), "order": q.order or i + 1}))
    db.commit()
    return admin_test_out(t)


@router.delete("/tests/{tid}")
def delete_test(tid: int, db: Session = Depends(get_db)):
    t = db.get(Test, tid)
    if not t:
        raise HTTPException(404, "Test topilmadi")
    db.delete(t)
    db.commit()
    return {"ok": True}


@router.post("/tests/{tid}/questions", status_code=201)
def add_question(tid: int, body: QuestionIn, db: Session = Depends(get_db)):
    t = db.get(Test, tid)
    if not t:
        raise HTTPException(404, "Test topilmadi")
    _validate_q(body)
    q = TestQuestion(test_id=t.id, **{**body.model_dump(), "order": body.order or len(t.questions) + 1})
    db.add(q)
    db.commit()
    return question_out(q, reveal=True)


@router.put("/questions/{qid}")
def update_question(qid: int, body: QuestionIn, db: Session = Depends(get_db)):
    q = db.get(TestQuestion, qid)
    if not q:
        raise HTTPException(404, "Savol topilmadi")
    _validate_q(body)
    for k, v in body.model_dump().items():
        setattr(q, k, v)
    db.commit()
    return question_out(q, reveal=True)


@router.delete("/questions/{qid}")
def delete_question(qid: int, db: Session = Depends(get_db)):
    q = db.get(TestQuestion, qid)
    if not q:
        raise HTTPException(404, "Savol topilmadi")
    db.delete(q)
    db.commit()
    return {"ok": True}


# ------------------------------------------------------------------ vocabulary
class VocabIn(BaseModel):
    word: str = Field(min_length=1, max_length=100)
    translation_uz: str = Field(min_length=1, max_length=200)
    definition: str = Field(default="", max_length=1000)
    example: str = Field(default="", max_length=1000)
    part_of_speech: str = Field(default="", max_length=20)
    ipa: str = Field(default="", max_length=80)
    topic: str = Field(default="general", max_length=50)
    level: Literal["A1", "A2", "B1", "B2", "C1", "C2"] = "B2"


def _vocab(v: Vocabulary) -> dict:
    return {c: getattr(v, c) for c in ("id", "word", "translation_uz", "definition", "example", "part_of_speech", "ipa", "topic", "level")}


@router.get("/vocabulary")
def vocab_list(search: str = Query("", max_length=60), page: int = Query(1, ge=1), size: int = Query(50, le=200),
               db: Session = Depends(get_db)):
    q = select(Vocabulary)
    if search:
        q = q.where(func.lower(Vocabulary.word).like(f"%{search.lower()}%"))
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    return {"total": total, "items": [_vocab(v) for v in db.scalars(q.order_by(Vocabulary.word).offset((page - 1) * size).limit(size))]}


@router.post("/vocabulary", status_code=201)
def vocab_create(body: VocabIn, db: Session = Depends(get_db)):
    if db.scalar(select(Vocabulary).where(func.lower(Vocabulary.word) == body.word.lower().strip())):
        raise HTTPException(409, "Bu so'z allaqachon mavjud")
    v = Vocabulary(**{**body.model_dump(), "word": body.word.strip()})
    db.add(v)
    db.commit()
    return _vocab(v)


@router.put("/vocabulary/{vid}")
def vocab_update(vid: int, body: VocabIn, db: Session = Depends(get_db)):
    v = db.get(Vocabulary, vid)
    if not v:
        raise HTTPException(404, "So'z topilmadi")
    for k, val in body.model_dump().items():
        setattr(v, k, val)
    db.commit()
    return _vocab(v)


@router.delete("/vocabulary/{vid}")
def vocab_delete(vid: int, db: Session = Depends(get_db)):
    v = db.get(Vocabulary, vid)
    if not v:
        raise HTTPException(404, "So'z topilmadi")
    db.delete(v)
    db.commit()
    return {"ok": True}


# ------------------------------------------------------------------ AI & branding
@router.get("/ai")
def ai_settings(db: Session = Depends(get_db)):
    cfg = ai.get_ai_settings(db)
    return {"provider": cfg["provider"], "models": cfg["models"], "providers": ai.providers_status(db),
            "note": "API kalitlari faqat backend .env faylida saqlanadi (GROQ_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY)."}


class AISettingsIn(BaseModel):
    provider: Literal["groq", "openai", "gemini", "none"]
    models: dict[str, str] = Field(default_factory=dict)


@router.put("/ai")
def ai_update(body: AISettingsIn, db: Session = Depends(get_db)):
    models = {k: v.strip()[:80] for k, v in body.models.items() if k in ai.PROVIDERS}
    ai.save_ai_settings(db, body.provider, models)
    return ai_settings(db)


class PingIn(BaseModel):
    provider: Literal["groq", "openai", "gemini"]


@router.post("/ai/test")
def ai_test(body: PingIn, db: Session = Depends(get_db)):
    return ai.ping(db, body.provider)


class BrandingIn(BaseModel):
    app_name: str = Field(min_length=2, max_length=60)


@router.put("/branding")
def branding(body: BrandingIn, db: Session = Depends(get_db)):
    row = db.get(AppSetting, "branding")
    if row:
        row.value = {"app_name": body.app_name.strip()}
    else:
        db.add(AppSetting(key="branding", value={"app_name": body.app_name.strip()}))
    db.commit()
    return {"app_name": body.app_name.strip()}


# ------------------------------------------------------------------ logs
@router.get("/logs")
def logs(level: str = Query("", max_length=10), limit: int = Query(100, le=500), db: Session = Depends(get_db)):
    q = select(ErrorLog)
    if level:
        q = q.where(ErrorLog.level == level)
    return [{"id": e.id, "created_at": e.created_at.isoformat(), "level": e.level, "source": e.source, "method": e.method,
             "path": e.path, "message": e.message, "details": e.details[:4000], "user_id": e.user_id}
            for e in db.scalars(q.order_by(ErrorLog.created_at.desc()).limit(limit))]


@router.delete("/logs")
def clear_logs(db: Session = Depends(get_db)):
    db.execute(delete(ErrorLog))
    db.commit()
    return {"ok": True}
