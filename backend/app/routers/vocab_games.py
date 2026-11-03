"""Vocabulary (SRS) va o'yinlar."""
from __future__ import annotations

import random
import re
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import GameResult, User, Vocabulary, VocabularyProgress
from ..security import get_current_user
from ..seed_data import GRAMMAR_ITEMS, SPEAKING_SENTENCES
from ..services.common import record

vocab_router = APIRouter(prefix="/api/vocabulary", tags=["vocabulary"])
games_router = APIRouter(prefix="/api/games", tags=["games"])

NEW_PER_SESSION = 10


def vocab_out(v: Vocabulary, p: VocabularyProgress | None = None) -> dict:
    return {"id": v.id, "word": v.word, "translation_uz": v.translation_uz, "definition": v.definition, "example": v.example,
            "part_of_speech": v.part_of_speech, "ipa": v.ipa, "topic": v.topic, "level": v.level,
            "progress": None if not p else {"due_date": p.due_date.isoformat(), "interval_days": p.interval_days,
                                            "repetitions": p.repetitions, "learned": p.learned, "ease": round(p.ease, 2),
                                            "correct": p.correct_count, "wrong": p.wrong_count}}


def _progress_map(db: Session, user: User, ids: list[int]) -> dict[int, VocabularyProgress]:
    if not ids:
        return {}
    rows = db.scalars(select(VocabularyProgress).where(VocabularyProgress.user_id == user.id,
                                                       VocabularyProgress.vocab_id.in_(ids))).all()
    return {r.vocab_id: r for r in rows}


@vocab_router.get("")
def list_vocab(search: str = Query("", max_length=60), topic: str = Query("", max_length=50),
               level: str = Query("", max_length=4), status: Literal["all", "new", "learning", "learned"] = "all",
               page: int = Query(1, ge=1), size: int = Query(30, ge=1, le=100),
               user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = select(Vocabulary)
    if search:
        like = f"%{search.lower()}%"
        q = q.where(or_(func.lower(Vocabulary.word).like(like), func.lower(Vocabulary.translation_uz).like(like)))
    if topic:
        q = q.where(Vocabulary.topic == topic)
    if level:
        q = q.where(Vocabulary.level == level)
    if status != "all":
        sub = select(VocabularyProgress.vocab_id).where(VocabularyProgress.user_id == user.id)
        if status == "new":
            q = q.where(Vocabulary.id.not_in(sub))
        else:
            q = q.where(Vocabulary.id.in_(sub.where(VocabularyProgress.learned.is_(status == "learned"))))
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    rows = db.scalars(q.order_by(Vocabulary.word).offset((page - 1) * size).limit(size)).all()
    pm = _progress_map(db, user, [v.id for v in rows])
    return {"total": total, "page": page, "size": size, "items": [vocab_out(v, pm.get(v.id)) for v in rows]}


@vocab_router.get("/topics")
def topics(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.execute(select(Vocabulary.topic, func.count(Vocabulary.id)).group_by(Vocabulary.topic).order_by(Vocabulary.topic)).all()
    return [{"topic": t, "count": c} for t, c in rows]


@vocab_router.get("/stats")
def vocab_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total = db.scalar(select(func.count(Vocabulary.id))) or 0
    started = db.scalar(select(func.count(VocabularyProgress.id)).where(VocabularyProgress.user_id == user.id)) or 0
    learned = db.scalar(select(func.count(VocabularyProgress.id)).where(VocabularyProgress.user_id == user.id,
                                                                        VocabularyProgress.learned.is_(True))) or 0
    due = db.scalar(select(func.count(VocabularyProgress.id)).where(VocabularyProgress.user_id == user.id,
                                                                    VocabularyProgress.due_date <= date.today(),
                                                                    VocabularyProgress.learned.is_(False))) or 0
    return {"total": total, "started": started, "learned": learned, "learning": started - learned, "due": due,
            "new": total - started}


@vocab_router.get("/due")
def due_cards(limit: int = Query(20, ge=1, le=50), topic: str = Query("", max_length=50),
              user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Takrorlash navbati: muddati kelgan kartalar + yangi so'zlar."""
    dq = (select(VocabularyProgress).where(VocabularyProgress.user_id == user.id, VocabularyProgress.due_date <= date.today(),
                                           VocabularyProgress.learned.is_(False)).order_by(VocabularyProgress.due_date).limit(limit))
    due = db.scalars(dq).all()
    cards = [vocab_out(p.vocab, p) for p in due if not topic or p.vocab.topic == topic]
    if len(cards) < limit:
        seen = select(VocabularyProgress.vocab_id).where(VocabularyProgress.user_id == user.id)
        nq = select(Vocabulary).where(Vocabulary.id.not_in(seen))
        if topic:
            nq = nq.where(Vocabulary.topic == topic)
        level = user.profile.current_level if user.profile else "B1"
        new = db.scalars(nq.order_by((Vocabulary.level == level).desc(), Vocabulary.id)
                         .limit(min(NEW_PER_SESSION, limit - len(cards)))).all()
        cards += [{**vocab_out(v), "is_new": True} for v in new]
    return cards


class ReviewIn(BaseModel):
    grade: int = Field(ge=0, le=3)  # 0=bilmadim 1=qiyin 2=yaxshi 3=oson


def sm2(p: VocabularyProgress, grade: int) -> None:
    """SuperMemo-2 soddalashtirilgan varianti."""
    q = {0: 1, 1: 3, 2: 4, 3: 5}[grade]
    if q < 3:
        p.repetitions = 0
        p.interval_days = 0
        p.wrong_count += 1
    else:
        p.repetitions += 1
        p.correct_count += 1
        if p.repetitions == 1:
            p.interval_days = 1
        elif p.repetitions == 2:
            p.interval_days = 3 if grade < 3 else 4
        else:
            p.interval_days = round(p.interval_days * p.ease)
    p.ease = max(1.3, p.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
    p.due_date = date.today() + timedelta(days=p.interval_days)
    p.learned = p.interval_days >= 21
    p.last_reviewed_at = datetime.now(timezone.utc)


def _get_progress(db: Session, user: User, vid: int) -> VocabularyProgress:
    if not db.get(Vocabulary, vid):
        raise HTTPException(404, "So'z topilmadi")
    p = db.scalar(select(VocabularyProgress).where(VocabularyProgress.user_id == user.id, VocabularyProgress.vocab_id == vid))
    if not p:
        p = VocabularyProgress(user_id=user.id, vocab_id=vid, ease=2.5, interval_days=0, repetitions=0,
                               due_date=date.today(), correct_count=0, wrong_count=0, learned=False)
        db.add(p)
        db.flush()
    return p


@vocab_router.post("/{vid}/review")
def review(vid: int, body: ReviewIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = _get_progress(db, user, vid)
    sm2(p, body.grade)
    record(db, user.id, words_reviewed=1)
    db.commit()
    return vocab_out(p.vocab, p)


class LearnedIn(BaseModel):
    learned: bool


@vocab_router.post("/{vid}/learned")
def mark_learned(vid: int, body: LearnedIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = _get_progress(db, user, vid)
    p.learned = body.learned
    if body.learned:
        p.interval_days = max(p.interval_days, 21)
        p.due_date = date.today() + timedelta(days=30)
    else:
        p.due_date = date.today()
    db.commit()
    return vocab_out(p.vocab, p)


@vocab_router.get("/quiz")
def quiz(n: int = Query(10, ge=4, le=30), kind: Literal["meaning", "definition", "mixed"] = "mixed",
         topic: str = Query("", max_length=50), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = select(Vocabulary)
    if topic:
        q = q.where(Vocabulary.topic == topic)
    pool = db.scalars(q).all()
    all_words = pool if len(pool) >= 4 else db.scalars(select(Vocabulary)).all()
    if len(all_words) < 4:
        raise HTTPException(400, "Quiz uchun kamida 4 ta so'z kerak")
    rnd = random.Random()
    picks = rnd.sample(pool if len(pool) >= 4 else all_words, min(n, len(pool) if len(pool) >= 4 else len(all_words)))
    out = []
    for v in picks:
        k = kind if kind != "mixed" else rnd.choice(["meaning", "definition", "reverse"])
        distract = rnd.sample([w for w in all_words if w.id != v.id], 3)
        if k == "meaning":
            prompt, correct, opts = f"“{v.word}” so'zining ma'nosi?", v.translation_uz, [d.translation_uz for d in distract]
        elif k == "reverse":
            prompt, correct, opts = f"“{v.translation_uz}” inglizchada qanday?", v.word, [d.word for d in distract]
        else:
            prompt, correct, opts = f"Which word matches: “{v.definition}”", v.word, [d.word for d in distract]
        options = opts + [correct]
        rnd.shuffle(options)
        out.append({"vocab_id": v.id, "kind": k, "prompt": prompt, "options": options, "answer": correct, "word": v.word})
    return out


# ============================================================ GAMES
GAMES = {"vocab_quiz", "word_matching", "sentence_completion", "word_dash", "speaking_challenge", "grammar_challenge"}


@games_router.get("/grammar")
def grammar(n: int = Query(10, ge=3, le=len(GRAMMAR_ITEMS)), user: User = Depends(get_current_user)):
    items = random.sample(GRAMMAR_ITEMS, n)
    out = []
    for it in items:
        opts = list(it["options"])
        random.shuffle(opts)
        out.append({**it, "options": opts})
    return out


@games_router.get("/matching")
def matching(n: int = Query(6, ge=3, le=20), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    words = db.scalars(select(Vocabulary).order_by(func.random()).limit(n)).all()
    return [{"id": v.id, "word": v.word, "translation_uz": v.translation_uz} for v in words]


@games_router.get("/sentences")
def sentences(n: int = Query(8, ge=3, le=20), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    words = db.scalars(select(Vocabulary).where(Vocabulary.example != "").order_by(func.random()).limit(n * 3)).all()
    pool = db.scalars(select(Vocabulary.word)).all()
    out = []
    for v in words:
        pattern = re.compile(rf"\b{re.escape(v.word)}\w*", re.I)
        m = pattern.search(v.example)
        if not m:
            continue
        blanked = v.example[:m.start()] + "_____" + v.example[m.end():]
        options = random.sample([w for w in pool if w != v.word], 3) + [v.word]
        random.shuffle(options)
        out.append({"id": v.id, "sentence": blanked, "answer": v.word, "options": options, "translation_uz": v.translation_uz})
        if len(out) >= n:
            break
    return out


@games_router.get("/speaking")
def speaking_sentences(n: int = Query(5, ge=1, le=len(SPEAKING_SENTENCES)), user: User = Depends(get_current_user)):
    return random.sample(SPEAKING_SENTENCES, n)


class GameResultIn(BaseModel):
    game: str = Field(max_length=40)
    score: int = Field(ge=0, le=100000)
    max_score: int = Field(ge=0, le=100000)
    duration_sec: int = Field(default=0, ge=0, le=7200)


@games_router.post("/results")
def save_result(body: GameResultIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.game not in GAMES:
        raise HTTPException(422, "Noma'lum o'yin")
    if body.max_score and body.score > body.max_score:
        raise HTTPException(422, "Ball maksimaldan oshib ketdi")
    r = GameResult(user_id=user.id, game=body.game, score=body.score, max_score=body.max_score, duration_sec=body.duration_sec)
    db.add(r)
    record(db, user.id, games_played=1, game_points=body.score, study_minutes=max(1, body.duration_sec // 60))
    db.commit()
    return {"id": r.id, "ok": True}


@games_router.get("/results")
def results(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    best = db.execute(select(GameResult.game, func.max(GameResult.score), func.count(GameResult.id))
                      .where(GameResult.user_id == user.id).group_by(GameResult.game)).all()
    recent = db.scalars(select(GameResult).where(GameResult.user_id == user.id)
                        .order_by(GameResult.created_at.desc()).limit(15)).all()
    return {"best": {g: {"best": b, "played": c} for g, b, c in best},
            "recent": [{"game": r.game, "score": r.score, "max_score": r.max_score, "created_at": r.created_at.isoformat()}
                       for r in recent]}
