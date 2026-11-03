"""Bazani boshlang'ich (demo) ma'lumotlar bilan to'ldirish. Takroriy ishga tushirish xavfsiz (idempotent).

Ishga tushirish:  python -m app.seed
"""
from __future__ import annotations

import logging
import random
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import settings
from .db import SessionLocal
from .models import (AIFeedback, SpeakingSession, Test, TestAnswer, TestAttempt, TestQuestion, User, UserStatistics,
                     Vocabulary, VocabularyProgress, WritingSubmission)
from .security import hash_password
from .seed_data import ALL_TESTS, VOCAB
from .serializers import ensure_user_rows
from .services import evaluators, planner
from .services.scoring import check_answer, raw_to_band

log = logging.getLogger("seed")

DEMO_USERS = [
    {"email": "demo@ielts-ai-master.example.com", "password": "Demo12345!", "full_name": "Aziza Karimova", "premium": False},
    {"email": "premium@ielts-ai-master.example.com", "password": "Demo12345!", "full_name": "Sardor Tursunov", "premium": True},
]

SAMPLE_ESSAY = """Nowadays more and more companies allow their staff to work from home. Some people think this is better for employees, while others believe it has more disadvantages. In this essay I will discuss both views and give my opinion.

On the one hand, working from home has clear benefits. Firstly, employees save a lot of time because they do not need to commute. For example, in Tashkent many people spend more than one hour in traffic every day. Secondly, people can organise their day more flexibly, which is beneficial for parents with young children.

On the other hand, there are some disadvantages. Many workers feel lonely because they do not see their colleagues. In addition, it is sometimes difficult to separate work and private life, so people work longer hours. Moreover, not everyone has a quiet place at home to concentrate.

In conclusion, although working from home has some drawbacks, I believe the advantages are more significant, especially when companies give employees the right equipment and support."""


def seed_tests(db: Session) -> None:
    for spec in ALL_TESTS:
        if db.scalar(select(Test).where(Test.title == spec["title"])):
            continue
        t = Test(title=spec["title"], skill=spec["skill"], exam_type=spec["exam_type"], description=spec["description"],
                 duration_min=spec["duration_min"], difficulty=spec["difficulty"], is_premium=spec["is_premium"],
                 is_published=True, content=spec["content"])
        for i, q in enumerate(spec["questions"]):
            section, qtype, prompt, options, answer, wl = q[:6]
            extra = q[6] if len(q) > 6 else {}
            if options == "HEADINGS":
                options = list(spec["headings"])
            t.questions.append(TestQuestion(section=section, order=i + 1, qtype=qtype, prompt=prompt, options=options,
                                            answer=answer, word_limit=wl, points=1, extra=extra))
        db.add(t)
    db.commit()


def seed_vocab(db: Session) -> None:
    existing = set(db.scalars(select(Vocabulary.word)).all())
    for word, uz, definition, example, pos, ipa, topic, level in VOCAB:
        if word not in existing:
            db.add(Vocabulary(word=word, translation_uz=uz, definition=definition, example=example, part_of_speech=pos,
                              ipa=ipa, topic=topic, level=level))
    db.commit()


def _user(db: Session, email: str, password: str, name: str, admin: bool = False) -> tuple[User, bool]:
    u = db.scalar(select(User).where(func.lower(User.email) == email.lower()))
    if u:
        return u, False
    u = User(email=email.lower(), password_hash=hash_password(password), full_name=name, is_active=True,
             is_verified=True, is_admin=admin, token_version=0)
    db.add(u)
    db.flush()
    ensure_user_rows(db, u)
    return u, True


def _fake_attempt(db: Session, user: User, test: Test, accuracy: float, when: datetime, rnd: random.Random) -> None:
    a = TestAttempt(user_id=user.id, test_id=test.id, mode="practice", status="submitted", started_at=when,
                    submitted_at=when + timedelta(minutes=test.duration_min - 3), time_spent_sec=(test.duration_min - 3) * 60,
                    raw_score=0, max_score=0)
    db.add(a)
    db.flush()
    correct = total = 0
    for q in test.questions:
        ok = rnd.random() < accuracy
        resp = q.answer[0] if ok else ("NOT GIVEN" if q.qtype == "tfng" else (q.options[-1].split(".")[0] if q.options else "unknown"))
        is_ok = check_answer(q.qtype, resp, q.answer)
        db.add(TestAnswer(attempt_id=a.id, question_id=q.id, response=resp, is_correct=is_ok))
        correct += int(is_ok)
        total += 1
    a.raw_score, a.max_score = correct, total
    a.band = raw_to_band(test.skill, correct, total, test.exam_type)


def seed_demo_history(db: Session, user: User, premium: bool) -> None:
    rnd = random.Random(user.id)
    p = user.profile
    p.exam_type, p.current_level, p.target_band = "academic", "B2", 7.0
    p.exam_date = date.today() + timedelta(days=54)
    p.daily_minutes, p.weak_skills, p.onboarded = 60, ["writing", "speaking"], True
    if premium:
        sub = user.subscription
        sub.plan, sub.status, sub.provider = "premium", "active", "test"
        sub.started_at = datetime.now(timezone.utc) - timedelta(days=10)
        sub.expires_at = datetime.now(timezone.utc) + timedelta(days=355)
    now = datetime.now(timezone.utc)
    for i in range(28):
        d = date.today() - timedelta(days=27 - i)
        if rnd.random() < 0.8:
            db.add(UserStatistics(user_id=user.id, date=d, study_minutes=rnd.randint(20, 90), tests_completed=0,
                                  ai_requests=rnd.randint(0, 5), words_reviewed=rnd.randint(0, 20), games_played=rnd.randint(0, 2),
                                  game_points=rnd.randint(0, 80), tasks_completed=rnd.randint(1, 3)))
    tests = {t.title: t for t in db.scalars(select(Test))}
    plan = [("Listening Practice 1", 0.55, 24), ("Reading Practice 1", 0.5, 20), ("Listening Practice 1", 0.7, 9),
            ("Reading Practice 1", 0.68, 5), ("Reading Practice 3", 0.8, 3)]
    for prefix, acc, days_ago in plan:
        t = next(v for k, v in tests.items() if k.startswith(prefix))
        _fake_attempt(db, user, t, acc, now - timedelta(days=days_ago), rnd)
    for days_ago, essay in ((15, SAMPLE_ESSAY.split("\n\n")[0] + "\n\n" + SAMPLE_ESSAY.split("\n\n")[3]), (4, SAMPLE_ESSAY)):
        fb = evaluators._demo_writing("task2", essay)
        sub = WritingSubmission(user_id=user.id, task_type="task2", prompt="Working from home: discuss both views.",
                                essay=essay, word_count=len(essay.split()), time_spent_sec=2400, band=fb["band"],
                                created_at=now - timedelta(days=days_ago))
        db.add(sub)
        db.flush()
        db.add(AIFeedback(user_id=user.id, target_type="writing", target_id=sub.id, provider="demo", model="heuristic-v1",
                          is_demo=True, band=fb["band"], criteria=fb["criteria"], feedback=fb, created_at=sub.created_at))
    transcript = [{"question": "What do you usually do in your free time?",
                   "answer": "In my free time I usually read books and play football with my friends. I think it is good for my health and it helps me relax after studying.",
                   "duration_sec": 25},
                  {"question": "How often do you use your mobile phone?",
                   "answer": "I use it very often, maybe five hours a day, because I study online and I also chat with my family.",
                   "duration_sec": 20}]
    fb = evaluators._demo_speaking(transcript)
    s = SpeakingSession(user_id=user.id, part="1", transcript=transcript, duration_sec=45, band=fb["band"],
                        created_at=now - timedelta(days=6))
    db.add(s)
    db.flush()
    db.add(AIFeedback(user_id=user.id, target_type="speaking", target_id=s.id, provider="demo", model="heuristic-v1",
                      is_demo=True, band=fb["band"], criteria=fb["criteria"], feedback=fb, created_at=s.created_at))
    for v in db.scalars(select(Vocabulary).order_by(Vocabulary.id).limit(18)):
        reps = rnd.randint(0, 4)
        db.add(VocabularyProgress(user_id=user.id, vocab_id=v.id, ease=2.5, interval_days=[0, 1, 3, 8, 21][reps], repetitions=reps,
                                  due_date=date.today() - timedelta(days=rnd.randint(0, 2)) if reps < 3 else date.today() + timedelta(days=reps * 3),
                                  correct_count=reps, wrong_count=rnd.randint(0, 2), learned=reps == 4))
    db.commit()
    planner.build_plan(db, user, use_ai=False)
    # o'tgan kunlardagi ba'zi vazifalarni bajarilgan deb belgilash
    for t in planner_tasks(db, user):
        if rnd.random() < 0.4 and t.date <= date.today():
            t.completed, t.completed_at = True, now
    db.commit()


def planner_tasks(db: Session, user: User):
    from .models import StudyPlan
    plan = db.scalar(select(StudyPlan).where(StudyPlan.user_id == user.id, StudyPlan.is_active.is_(True)))
    return plan.tasks if plan else []


def run() -> None:
    db = SessionLocal()
    try:
        seed_tests(db)
        seed_vocab(db)
        _user(db, settings.admin_email, settings.admin_password, "Administrator", admin=True)
        db.commit()
        if settings.seed_demo_data:
            for d in DEMO_USERS:
                u, created = _user(db, d["email"], d["password"], d["full_name"])
                db.commit()
                if created:
                    seed_demo_history(db, u, d["premium"])
        log.info("Seed tayyor")
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
    print("✅ Seed bajarildi")
