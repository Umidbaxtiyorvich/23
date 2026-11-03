"""Individual o'quv rejasini tuzish (qoidalar + ixtiyoriy AI xulosa)."""
from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Profile, StudyPlan, StudyPlanTask, Test, User
from . import evaluators
from .common import skill_bands

TEMPLATES = {
    "listening": [("Listening mashqi: to'liq bo'lim", "Audio tinglab savollarga javob bering, keyin xatolarni tahlil qiling.", "/tests?skill=listening"),
                  ("Listening: gap-filling ko'nikmasi", "Raqamlar, ismlar va sanalarni aniq yozishni mashq qiling.", "/tests?skill=listening")],
    "reading": [("Reading passage + savollar", "Bitta matnni 20 daqiqada ishlang: skimming → scanning.", "/tests?skill=reading"),
                ("Reading: True / False / Not Given", "Kalit so'zlarni matndan topib, parafrazlarni solishtiring.", "/tests?skill=reading")],
    "writing": [("Writing Task 2 essay", "40 daqiqada 250+ so'zli essay yozing va AI feedback oling.", "/writing?task=task2"),
                ("Writing Task 1 hisobot", "20 daqiqada grafikni 150+ so'z bilan tasvirlang.", "/writing?task=task1")],
    "speaking": [("Speaking: Preppy bilan Part 1", "Ovozli rejimda 10 ta savolga javob bering.", "/tutor?mode=speaking"),
                 ("Speaking mock (Part 1–3)", "AI examiner bilan to'liq speaking testi.", "/speaking")],
    "vocabulary": [("Vocabulary: SRS takrorlash", "Bugungi flashcardlarni takrorlang va yangi so'zlar qo'shing.", "/vocabulary")],
    "grammar": [("Grammar challenge", "Grammatika o'yinida 10 ta savolga javob bering.", "/games/grammar")],
}
SKILLS = ("listening", "reading", "writing", "speaking")


def _weeks_left(profile: Profile) -> int:
    if profile.exam_date:
        days = (profile.exam_date - date.today()).days
        return max(1, min(52, (days + 6) // 7))
    return 8


def default_phases(weeks: int) -> list[dict]:
    a = max(1, round(weeks * 0.4))
    b = max(1, round(weeks * 0.35))
    c = max(1, weeks - a - b)
    phases = [
        {"title": "1-bosqich: Poydevor", "weeks": f"1–{a}-haftalar", "focus": "Grammatika, lug'at va har bir bo'lim formatini o'rganish."},
        {"title": "2-bosqich: Ko'nikmalarni oshirish", "weeks": f"{a + 1}–{a + b}-haftalar", "focus": "Zaif bo'limlarga ko'proq vaqt, savol turlari bo'yicha strategiyalar."},
        {"title": "3-bosqich: Mock testlar", "weeks": f"{a + b + 1}–{a + b + c}-haftalar", "focus": "Haftada 1–2 ta to'liq mock test, vaqtni boshqarish."},
    ]
    return phases if weeks >= 3 else phases[-1:]


def _weights(profile: Profile, bands: dict[str, float | None]) -> dict[str, float]:
    w = {s: 1.0 for s in SKILLS}
    for s in profile.weak_skills or []:
        if s in w:
            w[s] += 1.5
    for s, b in bands.items():
        if b is None:
            w[s] += 0.5
        elif b < profile.target_band:
            w[s] += min(2.0, (profile.target_band - b))
    return w


def generate_tasks(db: Session, plan: StudyPlan, profile: Profile, bands: dict[str, float | None],
                   start: date, days: int = 7) -> None:
    weights = _weights(profile, bands)
    debt = {s: 0.0 for s in SKILLS}
    minutes = max(15, profile.daily_minutes)
    weeks_left = _weeks_left(profile)
    mock_phase = weeks_left <= max(2, round(weeks_left * 0.25)) or weeks_left <= 3
    free_tests = {s: db.scalars(select(Test.id).where(Test.skill == s, Test.is_published.is_(True))
                                .order_by(Test.is_premium, Test.id)).all() for s in SKILLS}
    for i in range(days):
        day = start + timedelta(days=i)
        if profile.exam_date and day > profile.exam_date:
            break
        # vaznga qarab navbat: eng ko'p "qarzdor" ko'nikmalar
        for s in SKILLS:
            debt[s] += weights[s]
        if mock_phase and day.weekday() == 5:
            db.add(StudyPlanTask(plan_id=plan.id, date=day, skill="mock", title="To'liq mock imtihon (Exam mode)",
                                 description="Listening → Reading → Writing ketma-ket, haqiqiy vaqt bilan.",
                                 duration_min=max(minutes, 150), link="/exam"))
            continue
        n_skills = 1 if minutes < 30 else (2 if minutes < 75 else 3)
        chosen = sorted(SKILLS, key=lambda s: -debt[s])[:n_skills]
        vocab_min = 10 if minutes >= 30 else 5
        per = max(10, (minutes - vocab_min) // n_skills)
        for k, s in enumerate(chosen):
            debt[s] = 0
            tpl = TEMPLATES[s][(day.toordinal() + k) % len(TEMPLATES[s])]
            link = tpl[2]
            if s in ("listening", "reading") and free_tests[s]:
                link = f"/tests/{free_tests[s][(day.toordinal() + k) % len(free_tests[s])]}"
            db.add(StudyPlanTask(plan_id=plan.id, date=day, skill=s, title=tpl[0], description=tpl[1],
                                 duration_min=per, link=link))
        extra = TEMPLATES["grammar"][0] if day.weekday() in (2, 6) else TEMPLATES["vocabulary"][0]
        db.add(StudyPlanTask(plan_id=plan.id, date=day, skill="grammar" if extra is TEMPLATES["grammar"][0] else "vocabulary",
                             title=extra[0], description=extra[1], duration_min=vocab_min, link=extra[2]))


def build_plan(db: Session, user: User, use_ai: bool = True) -> StudyPlan:
    profile = user.profile
    bands = skill_bands(db, user)
    weak = [s for s in SKILLS if s in (profile.weak_skills or [])]
    weak += [s for s, b in sorted(((s, b) for s, b in bands.items() if b is not None), key=lambda x: x[1])
             if b < profile.target_band and s not in weak]
    weeks = _weeks_left(profile)
    end = profile.exam_date or (date.today() + timedelta(weeks=weeks))

    for old in db.scalars(select(StudyPlan).where(StudyPlan.user_id == user.id, StudyPlan.is_active.is_(True))):
        old.is_active = False

    summary = (f"Maqsad: IELTS {profile.exam_type.title()} — {profile.target_band} band. "
               f"Imtihongacha taxminan {weeks} hafta, kuniga {profile.daily_minutes} daqiqa. "
               + (f"Asosiy e'tibor: {', '.join(s.title() for s in weak[:2])}." if weak else "Barcha bo'limlarga teng e'tibor."))
    phases = default_phases(weeks)
    source = "rules"
    if use_ai:
        advice = evaluators.plan_advice(db, {
            "exam_type": profile.exam_type, "level": profile.current_level, "target_band": profile.target_band,
            "exam_date": profile.exam_date, "weeks_left": weeks, "daily_minutes": profile.daily_minutes,
            "weak_skills": weak, "current_bands": bands,
        })
        if advice and advice.get("summary"):
            summary = str(advice["summary"])
            if isinstance(advice.get("phases"), list) and advice["phases"]:
                phases = [{"title": str(p.get("title", "")), "weeks": str(p.get("weeks", "")), "focus": str(p.get("focus", ""))}
                          for p in advice["phases"] if isinstance(p, dict)][:5]
            source = "ai"

    plan = StudyPlan(user_id=user.id, title=f"IELTS {profile.target_band} rejasi", start_date=date.today(), end_date=end,
                     summary=summary, phases=phases, weak_skills=weak, source=source, is_active=True)
    db.add(plan)
    db.flush()
    generate_tasks(db, plan, profile, bands, date.today())
    db.commit()
    db.refresh(plan)
    return plan


def extend_if_needed(db: Session, plan: StudyPlan, user: User) -> None:
    """Rejada keyingi 7 kun uchun vazifalar bo'lmasa — qo'shib boradi (rolling plan)."""
    last = max((t.date for t in plan.tasks), default=date.today() - timedelta(days=1))
    horizon = date.today() + timedelta(days=6)
    if last < horizon and (not user.profile.exam_date or last < user.profile.exam_date):
        generate_tasks(db, plan, user.profile, skill_bands(db, user), max(last + timedelta(days=1), date.today()),
                       days=(horizon - max(last, date.today() - timedelta(days=1))).days)
        db.commit()
        db.refresh(plan)
