from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AIFeedback, Test, TestAnswer, TestAttempt, TestQuestion, User, WritingSubmission
from ..security import get_current_user
from ..services import evaluators
from ..services.common import check_ai_quota, check_test_quota, is_premium, record
from ..services.scoring import check_answer, raw_to_band, round_band, word_count

router = APIRouter(prefix="/api/tests", tags=["tests"])
listening_router = APIRouter(prefix="/api/listening", tags=["listening"])
reading_router = APIRouter(prefix="/api/reading", tags=["reading"])

OBJECTIVE = {"mcq", "tfng", "ynng", "matching_headings", "gap_fill", "short_answer"}


def question_out(q: TestQuestion, reveal: bool = False) -> dict:
    d = {"id": q.id, "section": q.section, "order": q.order, "qtype": q.qtype, "prompt": q.prompt,
         "options": q.options, "word_limit": q.word_limit, "points": q.points,
         "extra": {k: v for k, v in (q.extra or {}).items() if k != "explanation" or reveal}}
    if reveal:
        d["answer"] = q.answer
    return d


def test_summary(db: Session, t: Test, user: User) -> dict:
    stats = db.execute(select(func.count(TestAttempt.id), func.max(TestAttempt.band)).where(
        TestAttempt.user_id == user.id, TestAttempt.test_id == t.id, TestAttempt.status == "submitted")).one()
    return {"id": t.id, "title": t.title, "skill": t.skill, "exam_type": t.exam_type, "description": t.description,
            "duration_min": t.duration_min, "difficulty": t.difficulty, "is_premium": t.is_premium,
            "locked": t.is_premium and not is_premium(user) and not user.is_admin,
            "questions": len(t.questions), "attempts": stats[0], "best_band": stats[1]}


def list_tests(db: Session, user: User, skill: str | None) -> list[dict]:
    q = select(Test).where(Test.is_published.is_(True))
    if skill:
        q = q.where(Test.skill == skill)
    return [test_summary(db, t, user) for t in db.scalars(q.order_by(Test.skill, Test.is_premium, Test.id))]


@router.get("")
def get_tests(skill: Literal["listening", "reading", "writing", "speaking"] | None = None,
              user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list_tests(db, user, skill)


@listening_router.get("")
def listening_tests(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list_tests(db, user, "listening")


@reading_router.get("")
def reading_tests(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list_tests(db, user, "reading")


@router.get("/attempts")
def attempts(limit: int = Query(20, le=100), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(TestAttempt).where(TestAttempt.user_id == user.id)
                      .order_by(TestAttempt.started_at.desc()).limit(limit)).all()
    return [attempt_brief(a) for a in rows]


def attempt_brief(a: TestAttempt) -> dict:
    return {"id": a.id, "test_id": a.test_id, "title": a.test.title, "skill": a.test.skill, "mode": a.mode,
            "status": a.status, "band": a.band, "raw_score": a.raw_score, "max_score": a.max_score,
            "started_at": a.started_at.isoformat(), "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
            "time_spent_sec": a.time_spent_sec}


def _get_test(db: Session, test_id: int, user: User) -> Test:
    t = db.get(Test, test_id)
    if not t or (not t.is_published and not user.is_admin):
        raise HTTPException(404, "Test topilmadi")
    return t


@router.get("/{test_id}")
def get_test(test_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = _get_test(db, test_id, user)
    return {**test_summary(db, t, user), "content": t.content, "items": [question_out(q) for q in t.questions]}


class StartIn(BaseModel):
    mode: Literal["practice", "exam"] = "practice"


def _owned_attempt(db: Session, attempt_id: int, user: User) -> TestAttempt:
    a = db.get(TestAttempt, attempt_id)
    if not a or a.user_id != user.id:
        raise HTTPException(404, "Urinish topilmadi")
    return a


def _attempt_state(a: TestAttempt) -> dict:
    elapsed = int((datetime.now(timezone.utc) - a.started_at).total_seconds())
    limit = a.test.duration_min * 60
    return {**attempt_brief(a), "time_limit_sec": limit, "elapsed_sec": elapsed,
            "remaining_sec": max(0, limit - elapsed) if a.mode == "exam" else None,
            "answers": {str(x.question_id): {"response": x.response, "flagged": x.flagged} for x in a.answers}}


@router.post("/{test_id}/start")
def start(test_id: int, body: StartIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = _get_test(db, test_id, user)
    existing = db.scalar(select(TestAttempt).where(TestAttempt.user_id == user.id, TestAttempt.test_id == t.id,
                                                   TestAttempt.status == "in_progress", TestAttempt.mode == body.mode))
    if existing:
        return _attempt_state(existing)
    check_test_quota(db, user, t)
    a = TestAttempt(user_id=user.id, test_id=t.id, mode=body.mode, status="in_progress",
                    started_at=datetime.now(timezone.utc), time_spent_sec=0, raw_score=0, max_score=0)
    db.add(a)
    db.commit()
    db.refresh(a)
    return _attempt_state(a)


class AnswerIn(BaseModel):
    question_id: int
    response: str = Field(default="", max_length=20000)
    flagged: bool = False


class SaveIn(BaseModel):
    answers: list[AnswerIn] = Field(default_factory=list, max_length=200)
    time_spent_sec: int | None = Field(default=None, ge=0, le=6 * 3600)


def _save(db: Session, a: TestAttempt, body: SaveIn) -> None:
    valid = {q.id for q in a.test.questions}
    existing = {x.question_id: x for x in a.answers}
    for ans in body.answers:
        if ans.question_id not in valid:
            raise HTTPException(422, f"Savol {ans.question_id} bu testga tegishli emas")
        row = existing.get(ans.question_id)
        if row:
            row.response, row.flagged = ans.response, ans.flagged
        else:
            row = TestAnswer(attempt_id=a.id, question_id=ans.question_id, response=ans.response, flagged=ans.flagged)
            db.add(row)
            a.answers.append(row)
    if body.time_spent_sec is not None:
        a.time_spent_sec = max(a.time_spent_sec, body.time_spent_sec)


@router.put("/attempts/{attempt_id}/answers")
def autosave(attempt_id: int, body: SaveIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = _owned_attempt(db, attempt_id, user)
    if a.status != "in_progress":
        raise HTTPException(409, "Test allaqachon yakunlangan")
    _save(db, a, body)
    db.commit()
    return {"ok": True, "saved_at": datetime.now(timezone.utc).isoformat(), "count": len(a.answers)}


@router.post("/attempts/{attempt_id}/submit")
def submit(attempt_id: int, body: SaveIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = _owned_attempt(db, attempt_id, user)
    if a.status != "in_progress":
        return result(attempt_id, user, db)
    _save(db, a, body)
    db.flush()
    t = a.test
    answers = {x.question_id: x for x in a.answers}
    correct = total = 0.0
    writing_bands: list[tuple[float, float]] = []
    writing_qs = [q for q in t.questions if q.qtype == "writing_task"]
    if writing_qs:
        check_ai_quota(db, user)
    explain_uz = user.settings.explain_in_uzbek if user.settings else True
    for q in t.questions:
        ans = answers.get(q.id)
        if q.qtype in OBJECTIVE:
            total += q.points
            ok = check_answer(q.qtype, ans.response if ans else "", q.answer)
            if ans:
                ans.is_correct = ok
            else:
                db.add(TestAnswer(attempt_id=a.id, question_id=q.id, response="", is_correct=False))
            correct += q.points if ok else 0
        elif q.qtype == "writing_task":
            essay = ans.response if ans else ""
            task_type = (q.extra or {}).get("task_type", "task2")
            weight = 2.0 if task_type == "task2" else 1.0
            if word_count(essay) < 20:
                writing_bands.append((1.0 if essay.strip() else 0.0, weight))
                continue
            fb = evaluators.evaluate_writing(db, task_type, q.prompt, essay, explain_uz)
            record(db, user.id, ai_requests=1)
            sub = WritingSubmission(user_id=user.id, attempt_id=a.id, question_id=q.id, task_type=task_type,
                                    prompt=q.prompt, essay=essay, word_count=word_count(essay),
                                    time_spent_sec=a.time_spent_sec, band=fb["band"])
            db.add(sub)
            db.flush()
            db.add(AIFeedback(user_id=user.id, target_type="writing", target_id=sub.id, provider=fb.get("provider", "demo"),
                              model=fb.get("model", ""), is_demo=fb.get("is_demo", False), band=fb["band"],
                              criteria=fb["criteria"], feedback=fb))
            writing_bands.append((fb["band"], weight))
    a.raw_score, a.max_score = correct, total
    if t.skill in ("listening", "reading") and total:
        a.band = raw_to_band(t.skill, correct, total, t.exam_type)
    elif writing_bands:
        a.band = round_band(sum(b * w for b, w in writing_bands) / sum(w for _, w in writing_bands))
    a.status = "submitted"
    a.submitted_at = datetime.now(timezone.utc)
    if not a.time_spent_sec:
        a.time_spent_sec = int((a.submitted_at - a.started_at).total_seconds())
    record(db, user.id, tests_completed=1, study_minutes=max(1, min(a.time_spent_sec, 4 * 3600) // 60))
    db.commit()
    return result(attempt_id, user, db)


@router.get("/attempts/{attempt_id}")
def result(attempt_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = _owned_attempt(db, attempt_id, user)
    t = a.test
    if a.status == "in_progress":
        return {**_attempt_state(a), "test": {"id": t.id, "title": t.title, "skill": t.skill}}
    answers = {x.question_id: x for x in a.answers}
    items = []
    by_type: dict[str, dict] = {}
    for q in t.questions:
        ans = answers.get(q.id)
        items.append({**question_out(q, reveal=True), "response": ans.response if ans else "",
                      "is_correct": ans.is_correct if ans else False})
        if q.qtype in OBJECTIVE:
            bt = by_type.setdefault(q.qtype, {"correct": 0, "total": 0})
            bt["total"] += 1
            bt["correct"] += int(bool(ans and ans.is_correct))
    subs = db.scalars(select(WritingSubmission).where(WritingSubmission.attempt_id == a.id)).all()
    writing = []
    for s in subs:
        fb = db.scalar(select(AIFeedback).where(AIFeedback.target_type == "writing", AIFeedback.target_id == s.id))
        writing.append({"submission_id": s.id, "question_id": s.question_id, "task_type": s.task_type, "band": s.band,
                        "word_count": s.word_count, "feedback": _gate_feedback(fb.feedback if fb else {}, user)})
    return {**attempt_brief(a), "test": {"id": t.id, "title": t.title, "skill": t.skill, "content": t.content},
            "items": items, "by_type": by_type, "writing": writing}


def _gate_feedback(fb: dict, user: User) -> dict:
    """Free foydalanuvchilarga kengaytirilgan feedbackning bir qismi yopiq."""
    if is_premium(user) or user.is_admin or not fb:
        return {**fb, "locked": []}
    out = dict(fb)
    locked = []
    if out.get("improved_essay"):
        out["improved_essay"] = ""
        locked.append("improved_essay")
    if len(out.get("grammar_errors", [])) > 3:
        out["grammar_errors"] = out["grammar_errors"][:3]
        locked.append("grammar_errors_full")
    out["locked"] = locked
    return out
