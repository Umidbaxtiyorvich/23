from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import StudyPlan, StudyPlanTask, User
from ..security import get_current_user
from ..services import ai, planner
from ..services.common import check_ai_quota, is_premium, record

router = APIRouter(prefix="/api/study-plan", tags=["study-plan"])


def task_out(t: StudyPlanTask) -> dict:
    return {"id": t.id, "date": t.date.isoformat(), "skill": t.skill, "title": t.title, "description": t.description,
            "duration_min": t.duration_min, "link": t.link, "completed": t.completed,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None}


def active_plan(db: Session, user: User) -> StudyPlan | None:
    return db.scalar(select(StudyPlan).where(StudyPlan.user_id == user.id, StudyPlan.is_active.is_(True))
                     .order_by(StudyPlan.created_at.desc()))


def plan_out(plan: StudyPlan) -> dict:
    today = date.today()
    week_end = today + timedelta(days=6)
    tasks = plan.tasks
    done = [t for t in tasks if t.completed]
    past_or_today = [t for t in tasks if t.date <= today]
    by_day: dict[str, list] = {}
    for t in tasks:
        if today <= t.date <= week_end:
            by_day.setdefault(t.date.isoformat(), []).append(task_out(t))
    skills: dict[str, dict] = {}
    for t in tasks:
        s = skills.setdefault(t.skill, {"total": 0, "done": 0, "minutes": 0})
        s["total"] += 1
        s["done"] += int(t.completed)
        s["minutes"] += t.duration_min if t.completed else 0
    return {
        "id": plan.id, "title": plan.title, "summary": plan.summary, "phases": plan.phases, "source": plan.source,
        "weak_skills": plan.weak_skills, "start_date": plan.start_date.isoformat(), "end_date": plan.end_date.isoformat(),
        "created_at": plan.created_at.isoformat(),
        "today": [task_out(t) for t in tasks if t.date == today],
        "week": by_day,
        "overdue": [task_out(t) for t in tasks if t.date < today and not t.completed][-10:],
        "progress": {
            "total": len(tasks), "done": len(done),
            "percent": round(100 * len(done) / len(tasks)) if tasks else 0,
            "due_percent": round(100 * sum(t.completed for t in past_or_today) / len(past_or_today)) if past_or_today else 0,
            "by_skill": skills,
        },
    }


@router.get("")
def get_plan(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = active_plan(db, user)
    if not plan:
        if not user.profile or not user.profile.onboarded:
            return {"plan": None}
        plan = planner.build_plan(db, user, use_ai=False)
    planner.extend_if_needed(db, plan, user)
    return {"plan": plan_out(plan), "premium": is_premium(user)}


class GenerateIn(BaseModel):
    use_ai: bool = True


@router.post("/generate")
def regenerate(body: GenerateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.profile or not user.profile.onboarded:
        raise HTTPException(400, "Avval onboarding savollariga javob bering")
    use_ai = body.use_ai and ai.is_available(db)
    if use_ai:
        if not is_premium(user) and not user.is_admin:
            use_ai = False  # AI reja — Premium imkoniyati; Free uchun qoidaga asoslangan reja
        else:
            check_ai_quota(db, user)
            record(db, user.id, ai_requests=1)
    plan = planner.build_plan(db, user, use_ai=use_ai)
    return {"plan": plan_out(plan), "ai_used": plan.source == "ai"}


class TaskUpdate(BaseModel):
    completed: bool


@router.patch("/tasks/{task_id}")
def update_task(task_id: int, body: TaskUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.get(StudyPlanTask, task_id)
    if not task or task.plan.user_id != user.id:
        raise HTTPException(404, "Vazifa topilmadi")
    if body.completed and not task.completed:
        task.completed_at = datetime.now(timezone.utc)
        record(db, user.id, tasks_completed=1)
    if not body.completed:
        task.completed_at = None
    task.completed = body.completed
    db.commit()
    return task_out(task)
