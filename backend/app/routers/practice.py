"""Writing, Speaking va AI (Preppy tutor) endpointlari."""
from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AIFeedback, SpeakingSession, Test, TestQuestion, User, WritingSubmission
from ..security import get_current_user
from ..services import ai, evaluators
from ..services.common import check_ai_quota, is_premium, record, today_stats
from ..services.scoring import word_count
from .tests import _gate_feedback

writing_router = APIRouter(prefix="/api/writing", tags=["writing"])
speaking_router = APIRouter(prefix="/api/speaking", tags=["speaking"])
ai_router = APIRouter(prefix="/api/ai", tags=["ai"])


def _explain(user: User) -> bool:
    return user.settings.explain_in_uzbek if user.settings else True


def _save_feedback(db: Session, user: User, target_type: str, target_id: int | None, fb: dict) -> AIFeedback:
    row = AIFeedback(user_id=user.id, target_type=target_type, target_id=target_id, provider=fb.get("provider", "demo"),
                     model=fb.get("model", ""), is_demo=fb.get("is_demo", False), band=fb.get("band"),
                     criteria=fb.get("criteria", {}), feedback=fb)
    db.add(row)
    return row


# ============================================================ WRITING
@writing_router.get("/tasks")
def writing_tasks(task_type: Literal["task1", "task2"] | None = None, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    rows = db.scalars(select(TestQuestion).join(Test).where(Test.skill == "writing", Test.is_published.is_(True),
                                                            TestQuestion.qtype == "writing_task")
                      .order_by(TestQuestion.id)).all()
    out = []
    for q in rows:
        tt = (q.extra or {}).get("task_type", "task2")
        if task_type and tt != task_type:
            continue
        out.append({"id": q.id, "test_id": q.test_id, "task_type": tt, "prompt": q.prompt, "extra": q.extra,
                    "exam_type": q.test.exam_type, "locked": q.test.is_premium and not is_premium(user) and not user.is_admin})
    return out


class WritingIn(BaseModel):
    task_type: Literal["task1", "task2"]
    prompt: str = Field(min_length=10, max_length=4000)
    essay: str = Field(min_length=1, max_length=20000)
    question_id: int | None = None
    time_spent_sec: int = Field(default=0, ge=0, le=4 * 3600)


@writing_router.post("/evaluate")
def evaluate(body: WritingIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    wc = word_count(body.essay)
    if wc < 20:
        raise HTTPException(422, "Baholash uchun kamida 20 so'z yozing")
    check_ai_quota(db, user)
    fb = evaluators.evaluate_writing(db, body.task_type, body.prompt, body.essay, _explain(user))
    sub = WritingSubmission(user_id=user.id, question_id=body.question_id, task_type=body.task_type, prompt=body.prompt,
                            essay=body.essay, word_count=wc, time_spent_sec=body.time_spent_sec, band=fb["band"])
    db.add(sub)
    db.flush()
    _save_feedback(db, user, "writing", sub.id, fb)
    record(db, user.id, ai_requests=1, study_minutes=max(1, body.time_spent_sec // 60))
    db.commit()
    return {"submission_id": sub.id, "feedback": _gate_feedback(fb, user)}


@writing_router.get("/submissions")
def submissions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(WritingSubmission).where(WritingSubmission.user_id == user.id)
                      .order_by(WritingSubmission.created_at.desc()).limit(50)).all()
    return [{"id": s.id, "task_type": s.task_type, "prompt": s.prompt[:160], "word_count": s.word_count, "band": s.band,
             "created_at": s.created_at.isoformat()} for s in rows]


@writing_router.get("/submissions/{sid}")
def submission(sid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.get(WritingSubmission, sid)
    if not s or s.user_id != user.id:
        raise HTTPException(404, "Topilmadi")
    fb = db.scalar(select(AIFeedback).where(AIFeedback.target_type == "writing", AIFeedback.target_id == s.id))
    return {"id": s.id, "task_type": s.task_type, "prompt": s.prompt, "essay": s.essay, "word_count": s.word_count,
            "band": s.band, "created_at": s.created_at.isoformat(), "feedback": _gate_feedback(fb.feedback if fb else {}, user)}


# ============================================================ SPEAKING
@speaking_router.get("/tests")
def speaking_tests(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    out = []
    for t in db.scalars(select(Test).where(Test.skill == "speaking", Test.is_published.is_(True)).order_by(Test.is_premium, Test.id)):
        out.append({"id": t.id, "title": t.title, "description": t.description, "is_premium": t.is_premium,
                    "locked": t.is_premium and not is_premium(user) and not user.is_admin,
                    "parts": [{"id": q.id, "part": (q.extra or {}).get("part", 1), "prompt": q.prompt,
                               "options": q.options, "extra": q.extra} for q in t.questions]})
    return out


@speaking_router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    data = await audio.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(413, "Audio fayl 15 MB dan katta")
    if not data:
        raise HTTPException(422, "Audio bo'sh")
    check_ai_quota(db, user)
    try:
        text, cfg = ai.transcribe(db, data, audio.filename or "answer.webm", audio.content_type or "audio/webm")
    except ai.AIUnavailable as e:
        raise HTTPException(503, f"Server STT mavjud emas: {e}. Brauzer nutq tanish funksiyasidan foydalaning.")
    except ai.AIError as e:
        raise HTTPException(502, str(e))
    record(db, user.id, ai_requests=1)
    db.commit()
    return {"text": text, "provider": cfg.name}


class Turn(BaseModel):
    question: str = Field(max_length=2000)
    answer: str = Field(default="", max_length=8000)
    duration_sec: int = Field(default=0, ge=0, le=900)


class SpeakingIn(BaseModel):
    test_id: int | None = None
    part: Literal["1", "2", "3", "full", "practice"] = "full"
    transcript: list[Turn] = Field(min_length=1, max_length=40)


@speaking_router.post("/evaluate")
def evaluate_speaking(body: SpeakingIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not any(t.answer.strip() for t in body.transcript):
        raise HTTPException(422, "Javoblar bo'sh — avval savollarga javob bering")
    if body.test_id:
        t = db.get(Test, body.test_id)
        if not t or t.skill != "speaking":
            raise HTTPException(404, "Speaking test topilmadi")
        if t.is_premium and not is_premium(user) and not user.is_admin:
            raise HTTPException(402, "Bu Speaking mock test faqat Premium uchun")
    if not is_premium(user) and not user.is_admin:
        used = db.scalar(select(func.count(SpeakingSession.id)).where(
            SpeakingSession.user_id == user.id, func.date(SpeakingSession.created_at) == date.today())) or 0
        if used >= 1:
            raise HTTPException(402, "Bepul tarifda kuniga 1 ta AI Speaking baholash. Cheksiz AI Speaking — Premiumda.")
    check_ai_quota(db, user)
    transcript = [t.model_dump() for t in body.transcript]
    fb = evaluators.evaluate_speaking(db, transcript, _explain(user))
    duration = sum(t.duration_sec for t in body.transcript)
    s = SpeakingSession(user_id=user.id, test_id=body.test_id, part=body.part, transcript=transcript,
                        duration_sec=duration, band=fb["band"])
    db.add(s)
    db.flush()
    _save_feedback(db, user, "speaking", s.id, fb)
    record(db, user.id, ai_requests=1, study_minutes=max(1, duration // 60))
    db.commit()
    return {"session_id": s.id, "feedback": fb}


@speaking_router.get("/sessions")
def sessions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(SpeakingSession).where(SpeakingSession.user_id == user.id)
                      .order_by(SpeakingSession.created_at.desc()).limit(50)).all()
    return [{"id": s.id, "part": s.part, "band": s.band, "questions": len(s.transcript), "duration_sec": s.duration_sec,
             "created_at": s.created_at.isoformat()} for s in rows]


@speaking_router.get("/sessions/{sid}")
def session(sid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.get(SpeakingSession, sid)
    if not s or s.user_id != user.id:
        raise HTTPException(404, "Topilmadi")
    fb = db.scalar(select(AIFeedback).where(AIFeedback.target_type == "speaking", AIFeedback.target_id == s.id))
    return {"id": s.id, "part": s.part, "band": s.band, "transcript": s.transcript, "duration_sec": s.duration_sec,
            "created_at": s.created_at.isoformat(), "feedback": fb.feedback if fb else {}}


# ============================================================ AI / PREPPY
@ai_router.get("/status")
def ai_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        cfg = ai.provider_config(db)
        info = {"available": True, "provider": cfg.name, "label": cfg.label, "model": cfg.model,
                "server_stt": bool(cfg.stt_model) or any(p["configured"] and p["supports_stt"] for p in ai.providers_status(db))}
    except ai.AIUnavailable as e:
        info = {"available": False, "provider": "demo", "label": "Demo rejim", "model": "", "reason": str(e),
                "server_stt": any(p["configured"] and p["supports_stt"] for p in ai.providers_status(db))}
    used = today_stats(db, user.id).ai_requests
    db.commit()
    from ..config import settings
    limit = None if (is_premium(user) or user.is_admin) else settings.free_ai_daily_limit
    return {**info, "used_today": used, "daily_limit": limit}


class ChatMsg(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=6000)


class ChatIn(BaseModel):
    messages: list[ChatMsg] = Field(min_length=1, max_length=60)
    mode: Literal["chat", "speaking", "grammar", "vocabulary", "writing"] = "chat"
    explain_in_uzbek: bool | None = None


@ai_router.post("/chat")
def chat(body: ChatIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.messages[-1].role != "user":
        raise HTTPException(422, "Oxirgi xabar foydalanuvchidan bo'lishi kerak")
    check_ai_quota(db, user)
    p = user.profile
    explain = body.explain_in_uzbek if body.explain_in_uzbek is not None else _explain(user)
    res = evaluators.tutor_reply(db, [m.model_dump() for m in body.messages], body.mode, explain,
                                 p.current_level if p else "B1", p.target_band if p else 6.5, user.full_name)
    record(db, user.id, ai_requests=1, study_minutes=1)
    db.commit()
    return res


class FeedbackIn(BaseModel):
    target_type: Literal["writing", "speaking"]
    text: str = Field(min_length=1, max_length=20000)
    prompt: str = Field(default="General IELTS practice", max_length=4000)
    task_type: Literal["task1", "task2"] = "task2"


@ai_router.post("/feedback")
def quick_feedback(body: FeedbackIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Saqlanmaydigan tezkor feedback (masalan, tutor ichida bitta javobni tekshirish)."""
    check_ai_quota(db, user)
    if body.target_type == "writing":
        fb = evaluators.evaluate_writing(db, body.task_type, body.prompt, body.text, _explain(user))
        fb = _gate_feedback(fb, user)
    else:
        fb = evaluators.evaluate_speaking(db, [{"question": body.prompt, "answer": body.text}], _explain(user))
    record(db, user.id, ai_requests=1)
    db.commit()
    return fb


@ai_router.get("/feedback")
def feedback_history(target_type: str | None = Query(None, max_length=20), user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    q = select(AIFeedback).where(AIFeedback.user_id == user.id)
    if target_type:
        q = q.where(AIFeedback.target_type == target_type)
    rows = db.scalars(q.order_by(AIFeedback.created_at.desc()).limit(30)).all()
    return [{"id": f.id, "target_type": f.target_type, "target_id": f.target_id, "band": f.band, "provider": f.provider,
             "is_demo": f.is_demo, "created_at": f.created_at.isoformat(), "summary": (f.feedback or {}).get("summary", "")}
            for f in rows]
