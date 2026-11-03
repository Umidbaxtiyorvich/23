"""Dashboard, statistika, obuna (test to'lov) va ommaviy konfiguratsiya."""
from __future__ import annotations

import secrets
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import (AppSetting, GameResult, SpeakingSession, Test, TestAnswer, TestAttempt, TestQuestion, User,
                      UserStatistics, VocabularyProgress, WritingSubmission)
from ..security import get_current_user
from ..serializers import ensure_user_rows, user_out
from ..services import ai, evaluators, planner
from ..services.common import SKILLS, ensure_subscription, estimated_overall, is_premium, record, skill_bands
from .plan import active_plan, task_out

dashboard_router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
stats_router = APIRouter(prefix="/api/statistics", tags=["statistics"])
sub_router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])
public_router = APIRouter(prefix="/api", tags=["public"])


def app_name(db: Session) -> str:
    row = db.get(AppSetting, "branding")
    return (row.value or {}).get("app_name") if row and (row.value or {}).get("app_name") else settings.app_name


@public_router.get("/config")
def public_config(db: Session = Depends(get_db)):
    return {"app_name": app_name(db), "ai_available": ai.is_available(db),
            "free_ai_daily_limit": settings.free_ai_daily_limit, "free_tests_daily_limit": settings.free_tests_daily_limit,
            "environment": settings.environment,
            "demo_accounts": settings.seed_demo_data and not settings.is_production}


@public_router.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(select(1))
    return {"ok": True, "time": datetime.now(timezone.utc).isoformat()}


def _streak(db: Session, user_id: int) -> int:
    days = set(db.scalars(select(UserStatistics.date).where(UserStatistics.user_id == user_id,
                                                            UserStatistics.study_minutes > 0)).all())
    d, n = date.today(), 0
    if d not in days:
        d -= timedelta(days=1)
    while d in days:
        n += 1
        d -= timedelta(days=1)
    return n


def _recent(db: Session, user: User, limit: int = 5) -> list[dict]:
    items = []
    for a in db.scalars(select(TestAttempt).where(TestAttempt.user_id == user.id, TestAttempt.status == "submitted")
                        .order_by(TestAttempt.submitted_at.desc()).limit(limit)):
        items.append({"kind": "test", "id": a.id, "title": a.test.title, "skill": a.test.skill, "band": a.band,
                      "score": f"{a.raw_score:g}/{a.max_score:g}" if a.max_score else None, "date": a.submitted_at.isoformat(),
                      "link": f"/results/{a.id}"})
    for w in db.scalars(select(WritingSubmission).where(WritingSubmission.user_id == user.id, WritingSubmission.attempt_id.is_(None))
                        .order_by(WritingSubmission.created_at.desc()).limit(limit)):
        items.append({"kind": "writing", "id": w.id, "title": f"Writing {w.task_type.upper()}", "skill": "writing", "band": w.band,
                      "score": f"{w.word_count} so'z", "date": w.created_at.isoformat(), "link": f"/writing/{w.id}"})
    for s in db.scalars(select(SpeakingSession).where(SpeakingSession.user_id == user.id)
                        .order_by(SpeakingSession.created_at.desc()).limit(limit)):
        items.append({"kind": "speaking", "id": s.id, "title": f"Speaking ({s.part})", "skill": "speaking", "band": s.band,
                      "score": f"{len(s.transcript)} savol", "date": s.created_at.isoformat(), "link": f"/speaking/{s.id}"})
    return sorted(items, key=lambda x: x["date"], reverse=True)[:limit]


@dashboard_router.get("")
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_user_rows(db, user)
    p = user.profile
    bands = skill_bands(db, user)
    overall, baseline = estimated_overall(p, bands)
    plan = active_plan(db, user)
    if plan:
        planner.extend_if_needed(db, plan, user)
    elif p.onboarded:
        plan = planner.build_plan(db, user, use_ai=False)
    today_tasks = [task_out(t) for t in plan.tasks if t.date == date.today()] if plan else []
    week_start = date.today() - timedelta(days=6)
    rows = db.scalars(select(UserStatistics).where(UserStatistics.user_id == user.id, UserStatistics.date >= week_start)).all()
    by_day = {r.date: r for r in rows}
    week = [{"date": (week_start + timedelta(days=i)).isoformat(),
             "minutes": by_day[week_start + timedelta(days=i)].study_minutes if week_start + timedelta(days=i) in by_day else 0}
            for i in range(7)]
    total_minutes = db.scalar(select(func.coalesce(func.sum(UserStatistics.study_minutes), 0)).where(UserStatistics.user_id == user.id))
    # tavsiya: eng zaif ko'nikma bo'yicha hali ishlanmagan testlar
    weakest = sorted(SKILLS, key=lambda s: (bands[s] if bands[s] is not None else -1 if s in (p.weak_skills or []) else 99))
    recommended = []
    for s in weakest[:3]:
        if s in ("listening", "reading"):
            done = select(TestAttempt.test_id).where(TestAttempt.user_id == user.id, TestAttempt.status == "submitted")
            t = db.scalar(select(Test).where(Test.skill == s, Test.is_published.is_(True), Test.id.not_in(done))
                          .order_by(Test.is_premium, Test.id)) or db.scalar(select(Test).where(Test.skill == s).order_by(Test.id))
            if t:
                recommended.append({"skill": s, "title": t.title, "description": f"{t.duration_min} daqiqa · {len(t.questions)} savol",
                                    "link": f"/tests/{t.id}", "locked": t.is_premium and not is_premium(user)})
        elif s == "writing":
            recommended.append({"skill": s, "title": "Writing Task 2 + AI feedback", "description": "Essay yozing va band score oling",
                                "link": "/writing?task=task2", "locked": False})
        else:
            recommended.append({"skill": s, "title": "Preppy bilan Speaking", "description": "AI examiner savollariga ovozli javob bering",
                                "link": "/tutor?mode=speaking", "locked": False})
    due = db.scalar(select(func.count(VocabularyProgress.id)).where(VocabularyProgress.user_id == user.id,
                    VocabularyProgress.due_date <= date.today(), VocabularyProgress.learned.is_(False))) or 0
    target = p.target_band
    start_band = 3.0
    progress_pct = int(max(0, min(100, (overall - start_band) / max(0.5, target - start_band) * 100)))
    db.commit()
    return {
        "user": user_out(user),
        "target_band": target,
        "estimated_band": overall,
        "estimated_from_level": baseline,
        "bands": bands,
        "days_left": (p.exam_date - date.today()).days if p.exam_date else None,
        "exam_date": p.exam_date.isoformat() if p.exam_date else None,
        "today_tasks": today_tasks,
        "plan_progress": round(100 * sum(t.completed for t in plan.tasks) / len(plan.tasks)) if plan and plan.tasks else 0,
        "streak": _streak(db, user.id),
        "minutes_today": by_day[date.today()].study_minutes if date.today() in by_day else 0,
        "minutes_week": sum(d["minutes"] for d in week),
        "minutes_total": int(total_minutes or 0),
        "week": week,
        "overall_progress": progress_pct,
        "recent": _recent(db, user),
        "recommended": recommended,
        "words_due": due,
        "ai_available": ai.is_available(db),
    }


# ============================================================ STATISTICS
class ActivityIn(BaseModel):
    minutes: int = Field(ge=1, le=5)


@stats_router.post("/activity")
def activity(body: ActivityIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record(db, user.id, study_minutes=body.minutes)
    db.commit()
    return {"ok": True}


def _band_history(db: Session, user: User, since: datetime) -> list[dict]:
    events = []
    for a in db.scalars(select(TestAttempt).where(TestAttempt.user_id == user.id, TestAttempt.status == "submitted",
                                                 TestAttempt.band.is_not(None), TestAttempt.submitted_at >= since)):
        if a.test.skill in ("listening", "reading"):
            events.append({"date": a.submitted_at.date().isoformat(), "skill": a.test.skill, "band": a.band})
    for w in db.scalars(select(WritingSubmission).where(WritingSubmission.user_id == user.id, WritingSubmission.band.is_not(None),
                                                       WritingSubmission.created_at >= since)):
        events.append({"date": w.created_at.date().isoformat(), "skill": "writing", "band": w.band})
    for s in db.scalars(select(SpeakingSession).where(SpeakingSession.user_id == user.id, SpeakingSession.band.is_not(None),
                                                     SpeakingSession.created_at >= since)):
        events.append({"date": s.created_at.date().isoformat(), "skill": "speaking", "band": s.band})
    events.sort(key=lambda e: e["date"])
    # kunlik nuqtalar: har ko'nikma uchun oxirgi ma'lum qiymat bilan
    series, last = [], {}
    for d in sorted({e["date"] for e in events}):
        for e in (x for x in events if x["date"] == d):
            last[e["skill"]] = e["band"]
        known = [v for v in last.values()]
        series.append({"date": d, **last, "overall": round(sum(known) / len(known) * 2) / 2 if known else None})
    return series


@stats_router.get("")
def statistics(days: int = Query(90, ge=7, le=365), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_user_rows(db, user)
    premium = is_premium(user) or user.is_admin
    since_d = date.today() - timedelta(days=days - 1)
    since = datetime.combine(since_d, datetime.min.time(), tzinfo=timezone.utc)
    bands = skill_bands(db, user)
    overall, baseline = estimated_overall(user.profile, bands)
    daily_rows = db.scalars(select(UserStatistics).where(UserStatistics.user_id == user.id, UserStatistics.date >= since_d)
                            .order_by(UserStatistics.date)).all()
    dmap = {r.date: r for r in daily_rows}
    daily = [{"date": (since_d + timedelta(days=i)).isoformat(),
              "minutes": dmap.get(since_d + timedelta(days=i)).study_minutes if dmap.get(since_d + timedelta(days=i)) else 0}
             for i in range(days)]
    history = _band_history(db, user, since)

    attempts = db.scalars(select(TestAttempt).where(TestAttempt.user_id == user.id, TestAttempt.status == "submitted")
                          .order_by(TestAttempt.submitted_at.desc()).limit(50 if premium else 5)).all()
    tests_history = [{"id": a.id, "title": a.test.title, "skill": a.test.skill, "band": a.band, "mode": a.mode,
                      "score": f"{a.raw_score:g}/{a.max_score:g}" if a.max_score else "—",
                      "date": a.submitted_at.isoformat(), "time_spent_sec": a.time_spent_sec} for a in attempts]

    totals = db.execute(select(func.coalesce(func.sum(UserStatistics.study_minutes), 0), func.coalesce(func.sum(UserStatistics.tests_completed), 0),
                               func.coalesce(func.sum(UserStatistics.words_reviewed), 0), func.coalesce(func.sum(UserStatistics.games_played), 0),
                               func.coalesce(func.sum(UserStatistics.ai_requests), 0))
                        .where(UserStatistics.user_id == user.id)).one()
    result = {
        "premium": premium,
        "overall_band": overall, "estimated_from_level": baseline, "target_band": user.profile.target_band, "bands": bands,
        "totals": {"study_minutes": int(totals[0]), "tests_completed": int(totals[1]), "words_reviewed": int(totals[2]),
                   "games_played": int(totals[3]), "ai_requests": int(totals[4])},
        "daily_minutes": daily[-7:] if not premium else daily,
        "band_history": history,
        "tests_history": tests_history,
        "skill_history": {s: [{"date": h["date"], "band": h[s]} for h in history if h.get(s) is not None] for s in SKILLS},
    }
    if not premium:
        result.update(weekly=None, monthly=None, weak_areas=None, recommendations=evaluators.rule_recommendations(
            {"bands": bands, "target_band": user.profile.target_band, "weak_skills": user.profile.weak_skills})[:2],
            recommendations_ai=False, detailed_locked=True)
        return result

    weekly = []
    for w in range(7, -1, -1):
        start = date.today() - timedelta(days=date.today().weekday()) - timedelta(weeks=w)
        end = start + timedelta(days=6)
        rows = [r for r in db.scalars(select(UserStatistics).where(UserStatistics.user_id == user.id,
                                                                   UserStatistics.date.between(start, end)))]
        wb = [h.get("overall") for h in history if start.isoformat() <= h["date"] <= end.isoformat() and h.get("overall")]
        weekly.append({"week": start.isoformat(), "minutes": sum(r.study_minutes for r in rows),
                       "tests": sum(r.tests_completed for r in rows), "band": wb[-1] if wb else None})
    monthly = []
    for m in range(5, -1, -1):
        y, mo = date.today().year, date.today().month - m
        while mo <= 0:
            mo += 12
            y -= 1
        first = date(y, mo, 1)
        nxt = date(y + (mo == 12), mo % 12 + 1, 1)
        rows = db.scalars(select(UserStatistics).where(UserStatistics.user_id == user.id, UserStatistics.date >= first,
                                                       UserStatistics.date < nxt)).all()
        monthly.append({"month": first.strftime("%Y-%m"), "minutes": sum(r.study_minutes for r in rows),
                        "tests": sum(r.tests_completed for r in rows), "words": sum(r.words_reviewed for r in rows)})
    acc = _qtype_accuracy(db, user)
    weak = sorted(acc, key=lambda x: x["accuracy"])
    games = db.execute(select(GameResult.game, func.count(GameResult.id), func.max(GameResult.score))
                       .where(GameResult.user_id == user.id).group_by(GameResult.game)).all()
    recs, recs_ai = evaluators.recommendations(db, {"bands": bands, "target_band": user.profile.target_band,
                                                   "weak_skills": user.profile.weak_skills, "question_type_accuracy": weak[:4],
                                                   "study_minutes_last_week": sum(d["minutes"] for d in daily[-7:])})
    result.update(weekly=weekly, monthly=monthly, weak_areas=weak, games=[{"game": g, "played": c, "best": b} for g, c, b in games],
                  recommendations=recs, recommendations_ai=recs_ai, detailed_locked=False)
    return result


QTYPE_UZ = {"mcq": "Multiple choice", "tfng": "True / False / Not Given", "ynng": "Yes / No / Not Given",
            "matching_headings": "Matching headings", "gap_fill": "Gap filling", "short_answer": "Short answer"}


def _qtype_accuracy(db: Session, user: User) -> list[dict]:
    rows = db.execute(select(TestQuestion.qtype, Test.skill, TestAnswer.is_correct)
                      .join(TestAnswer, TestAnswer.question_id == TestQuestion.id)
                      .join(TestAttempt, TestAttempt.id == TestAnswer.attempt_id)
                      .join(Test, Test.id == TestQuestion.test_id)
                      .where(TestAttempt.user_id == user.id, TestAnswer.is_correct.is_not(None))).all()
    agg: dict[tuple[str, str], list[int]] = {}
    for qtype, skill, ok in rows:
        a = agg.setdefault((skill, qtype), [0, 0])
        a[0] += int(bool(ok))
        a[1] += 1
    return [{"skill": s, "qtype": q, "label": f"{s.title()}: {QTYPE_UZ.get(q, q)}", "correct": c, "total": t,
             "accuracy": round(100 * c / t)} for (s, q), (c, t) in agg.items()]


# ============================================================ SUBSCRIPTIONS (TEST REJIM)
PLANS = {
    "premium_monthly": {"name": "Premium — 1 oy", "amount": 79000, "currency": "UZS", "days": 30},
    "premium_yearly": {"name": "Premium — 12 oy", "amount": 599000, "currency": "UZS", "days": 365},
}
TEST_CARDS = {"4242424242424242": "success", "4000000000000002": "declined"}


@sub_router.get("/plans")
def plans():
    return {"test_mode": True, "plans": [{"id": k, **v} for k, v in PLANS.items()],
            "free_limits": {"ai_daily": settings.free_ai_daily_limit, "tests_daily": settings.free_tests_daily_limit},
            "test_cards": [{"number": "4242 4242 4242 4242", "result": "Muvaffaqiyatli"},
                           {"number": "4000 0000 0000 0002", "result": "Rad etiladi"}]}


@sub_router.get("/me")
def my_sub(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_subscription(db, user)
    db.commit()
    return user_out(user)["subscription"] | {"is_premium": is_premium(user)}


class CheckoutIn(BaseModel):
    plan: Literal["premium_monthly", "premium_yearly"]
    card_number: str = Field(min_length=12, max_length=23)


@sub_router.post("/checkout")
def checkout(body: CheckoutIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """TEST rejimidagi to'lov: haqiqiy pul yechilmaydi. Haqiqiy to'lov uchun Payme/Click/Stripe integratsiyasi kerak."""
    if settings.is_production:
        raise HTTPException(503, "Test to'lovlar production muhitida o'chirilgan. To'lov provayderini ulang.")
    card = "".join(c for c in body.card_number if c.isdigit())
    outcome = TEST_CARDS.get(card)
    if outcome is None:
        raise HTTPException(422, "Test rejimida faqat test kartalari qabul qilinadi (4242 4242 4242 4242)")
    if outcome == "declined":
        raise HTTPException(402, "To'lov rad etildi (test karta)")
    sub = ensure_subscription(db, user)
    plan = PLANS[body.plan]
    now = datetime.now(timezone.utc)
    base = sub.expires_at if sub.expires_at and sub.expires_at > now and sub.plan == "premium" else now
    sub.plan, sub.status, sub.provider = "premium", "active", "test"
    sub.amount, sub.currency = plan["amount"], plan["currency"]
    sub.started_at = sub.started_at if sub.plan == "premium" and sub.started_at else now
    sub.expires_at = base + timedelta(days=plan["days"])
    sub.external_id = "test_" + secrets.token_hex(8)
    db.commit()
    return {"ok": True, "message": "Premium faollashtirildi (test to'lov)", "transaction_id": sub.external_id, "user": user_out(user)}


@sub_router.post("/cancel")
def cancel(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = ensure_subscription(db, user)
    sub.plan, sub.status, sub.expires_at = "free", "active", None
    db.commit()
    return {"ok": True, "user": user_out(user)}
