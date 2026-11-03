"""Ma'lumotlar bazasi jadvallari (PostgreSQL, SQLAlchemy 2)."""
from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # logout / parol almashganda refresh tokenlarni bekor qilish uchun
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    profile: Mapped[Profile | None] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    settings: Mapped[UserSettings | None] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    subscription: Mapped[Subscription | None] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    exam_type: Mapped[str] = mapped_column(String(20), default="academic", nullable=False)  # academic | general
    current_level: Mapped[str] = mapped_column(String(4), default="B1", nullable=False)  # A1..C2
    target_band: Mapped[float] = mapped_column(Float, default=6.5, nullable=False)
    exam_date: Mapped[date | None] = mapped_column(Date)
    daily_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    weak_skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    onboarded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    country: Mapped[str] = mapped_column(String(60), default="Uzbekistan", nullable=False)
    bio: Mapped[str] = mapped_column(Text, default="", nullable=False)

    user: Mapped[User] = relationship(back_populates="profile")


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    explain_in_uzbek: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    tts_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    tts_rate: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    theme: Mapped[str] = mapped_column(String(10), default="light", nullable=False)

    user: Mapped[User] = relationship(back_populates="settings")


class StudyPlan(TimestampMixin, Base):
    __tablename__ = "study_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    phases: Mapped[list] = mapped_column(JSON, default=list, nullable=False)  # imtihongacha bosqichlar
    weak_skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    source: Mapped[str] = mapped_column(String(20), default="rules", nullable=False)  # ai | rules
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    tasks: Mapped[list[StudyPlanTask]] = relationship(back_populates="plan", cascade="all, delete-orphan", order_by="StudyPlanTask.date")


class StudyPlanTask(Base):
    __tablename__ = "study_plan_tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("study_plans.id", ondelete="CASCADE"), index=True, nullable=False)
    date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    skill: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    duration_min: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    link: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    plan: Mapped[StudyPlan] = relationship(back_populates="tasks")


class Test(TimestampMixin, Base):
    __tablename__ = "tests"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    skill: Mapped[str] = mapped_column(String(20), index=True, nullable=False)  # listening|reading|writing|speaking
    exam_type: Mapped[str] = mapped_column(String(20), default="academic", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    duration_min: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # bo'limlar: [{title, text|audio_script|audio_url, instructions, chart}]
    content: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    questions: Mapped[list[TestQuestion]] = relationship(
        back_populates="test", cascade="all, delete-orphan", order_by=lambda: [TestQuestion.section, TestQuestion.order]
    )


class TestQuestion(Base):
    __tablename__ = "test_questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    test_id: Mapped[int] = mapped_column(ForeignKey("tests.id", ondelete="CASCADE"), index=True, nullable=False)
    section: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # mcq | tfng | ynng | matching_headings | gap_fill | short_answer | writing_task | speaking_prompt
    qtype: Mapped[str] = mapped_column(String(30), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    answer: Mapped[list] = mapped_column(JSON, default=list, nullable=False)  # qabul qilinadigan javoblar
    word_limit: Mapped[int | None] = mapped_column(Integer)
    points: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    extra: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    test: Mapped[Test] = relationship(back_populates="questions")


class TestAttempt(Base):
    __tablename__ = "test_attempts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    test_id: Mapped[int] = mapped_column(ForeignKey("tests.id", ondelete="CASCADE"), index=True, nullable=False)
    mode: Mapped[str] = mapped_column(String(20), default="practice", nullable=False)  # practice | exam
    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    time_spent_sec: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    raw_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    max_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    band: Mapped[float | None] = mapped_column(Float)

    test: Mapped[Test] = relationship()
    answers: Mapped[list[TestAnswer]] = relationship(back_populates="attempt", cascade="all, delete-orphan")


class TestAnswer(Base):
    __tablename__ = "test_answers"
    __table_args__ = (UniqueConstraint("attempt_id", "question_id", name="uq_answer_attempt_question"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    attempt_id: Mapped[int] = mapped_column(ForeignKey("test_attempts.id", ondelete="CASCADE"), index=True, nullable=False)
    question_id: Mapped[int] = mapped_column(ForeignKey("test_questions.id", ondelete="CASCADE"), nullable=False)
    response: Mapped[str] = mapped_column(Text, default="", nullable=False)
    is_correct: Mapped[bool | None] = mapped_column(Boolean)
    flagged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    attempt: Mapped[TestAttempt] = relationship(back_populates="answers")
    question: Mapped[TestQuestion] = relationship()


class WritingSubmission(TimestampMixin, Base):
    __tablename__ = "writing_submissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    attempt_id: Mapped[int | None] = mapped_column(ForeignKey("test_attempts.id", ondelete="SET NULL"))
    question_id: Mapped[int | None] = mapped_column(ForeignKey("test_questions.id", ondelete="SET NULL"))
    task_type: Mapped[str] = mapped_column(String(10), nullable=False)  # task1 | task2
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    essay: Mapped[str] = mapped_column(Text, nullable=False)
    word_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    time_spent_sec: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    band: Mapped[float | None] = mapped_column(Float)


class SpeakingSession(TimestampMixin, Base):
    __tablename__ = "speaking_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    test_id: Mapped[int | None] = mapped_column(ForeignKey("tests.id", ondelete="SET NULL"))
    part: Mapped[str] = mapped_column(String(10), default="full", nullable=False)  # 1|2|3|full|practice
    transcript: Mapped[list] = mapped_column(JSON, default=list, nullable=False)  # [{question, answer, duration_sec}]
    duration_sec: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    band: Mapped[float | None] = mapped_column(Float)


class AIFeedback(TimestampMixin, Base):
    __tablename__ = "ai_feedback"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    target_type: Mapped[str] = mapped_column(String(20), nullable=False)  # writing | speaking | tutor
    target_id: Mapped[int | None] = mapped_column(Integer, index=True)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)
    model: Mapped[str] = mapped_column(String(80), default="", nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    band: Mapped[float | None] = mapped_column(Float)
    criteria: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    feedback: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class Vocabulary(TimestampMixin, Base):
    __tablename__ = "vocabulary"

    id: Mapped[int] = mapped_column(primary_key=True)
    word: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    translation_uz: Mapped[str] = mapped_column(String(200), nullable=False)
    definition: Mapped[str] = mapped_column(Text, default="", nullable=False)
    example: Mapped[str] = mapped_column(Text, default="", nullable=False)
    part_of_speech: Mapped[str] = mapped_column(String(20), default="", nullable=False)
    ipa: Mapped[str] = mapped_column(String(80), default="", nullable=False)
    topic: Mapped[str] = mapped_column(String(50), default="general", index=True, nullable=False)
    level: Mapped[str] = mapped_column(String(4), default="B2", nullable=False)


class VocabularyProgress(Base):
    __tablename__ = "vocabulary_progress"
    __table_args__ = (UniqueConstraint("user_id", "vocab_id", name="uq_vocab_progress"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    vocab_id: Mapped[int] = mapped_column(ForeignKey("vocabulary.id", ondelete="CASCADE"), nullable=False)
    ease: Mapped[float] = mapped_column(Float, default=2.5, nullable=False)
    interval_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    repetitions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    correct_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    wrong_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    learned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    vocab: Mapped[Vocabulary] = relationship()


class UserStatistics(Base):
    """Kunlik faollik qatorlari (har foydalanuvchi uchun har kun bitta)."""

    __tablename__ = "user_statistics"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_user_stats_day"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    study_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tests_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ai_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    words_reviewed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    games_played: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    game_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tasks_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class Subscription(TimestampMixin, Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    plan: Mapped[str] = mapped_column(String(20), default="free", nullable=False)  # free | premium
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    provider: Mapped[str] = mapped_column(String(20), default="none", nullable=False)  # none | test | payme | click | stripe
    external_id: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    amount: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    currency: Mapped[str] = mapped_column(String(5), default="UZS", nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="subscription")


class GameResult(TimestampMixin, Base):
    __tablename__ = "game_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    game: Mapped[str] = mapped_column(String(40), nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duration_sec: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class AppSetting(Base):
    """Admin paneldan o'zgartiriladigan sozlamalar (AI provayder, sayt nomi ...). Kalitlar bu yerda saqlanmaydi."""

    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class ErrorLog(TimestampMixin, Base):
    __tablename__ = "error_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    level: Mapped[str] = mapped_column(String(10), default="error", nullable=False)
    source: Mapped[str] = mapped_column(String(40), default="api", nullable=False)
    method: Mapped[str] = mapped_column(String(10), default="", nullable=False)
    path: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    message: Mapped[str] = mapped_column(Text, default="", nullable=False)
    details: Mapped[str] = mapped_column(Text, default="", nullable=False)
    user_id: Mapped[int | None] = mapped_column(Integer)
