"""Writing / Speaking baholash, Preppy tutor va tavsiyalar.

Har bir funksiya avval AI'dan foydalanadi. AI mavjud bo'lmasa (kalit yo'q) yoki xato bersa,
oddiy matn tahliliga asoslangan DEMO baholash qaytariladi va `is_demo=True` bilan belgilanadi.
"""
from __future__ import annotations

import json
import logging
import random
import re
from typing import Any

from sqlalchemy.orm import Session

from . import ai
from .scoring import round_band, word_count

log = logging.getLogger("evaluators")

DISCLAIMER = ("Bu taxminiy AI baholash, rasmiy IELTS natijasi emas. Rasmiy ballni faqat "
              "IELTS imtihon markazlari beradi.")

LINKERS = ["however", "moreover", "furthermore", "in addition", "therefore", "consequently", "on the other hand",
           "for example", "for instance", "in conclusion", "to sum up", "firstly", "secondly", "finally", "although",
           "whereas", "while", "despite", "as a result", "in contrast", "overall", "nevertheless", "similarly"]
ACADEMIC = ["significant", "considerable", "substantial", "approximately", "crucial", "beneficial", "detrimental",
            "inevitable", "phenomenon", "perspective", "contribute", "enhance", "diminish", "fluctuate", "predominantly",
            "proportion", "subsequently", "facilitate", "sustainable", "widespread", "notably", "acknowledge"]
COMMON_ERRORS = [
    (r"\bpeople is\b", "people are", "‘people’ — ko'plik, shuning uchun ‘are’ ishlatiladi."),
    (r"\bhe have\b", "he has", "3-shaxs birlikda ‘has’."),
    (r"\bshe have\b", "she has", "3-shaxs birlikda ‘has’."),
    (r"\bit have\b", "it has", "3-shaxs birlikda ‘has’."),
    (r"\bthere is many\b", "there are many", "Ko'plik ot bilan ‘there are’."),
    (r"\bmore better\b", "better", "‘better’ allaqachon qiyosiy daraja."),
    (r"\bin the other hand\b", "on the other hand", "To'g'ri ibora: ‘on the other hand’."),
    (r"\bdiscuss about\b", "discuss", "‘discuss’ dan keyin ‘about’ kerak emas."),
    (r"\bdepend of\b", "depend on", "To'g'ri predlog: ‘depend on’."),
    (r"\bi\b", "I", "‘I’ har doim katta harf bilan yoziladi."),
    (r"\bmuch people\b", "many people", "Sanaladigan otlar bilan ‘many’."),
    (r"\badvices\b", "advice", "‘advice’ sanalmaydigan ot."),
    (r"\binformations\b", "information", "‘information’ sanalmaydigan ot."),
    (r"\bdidn't went\b", "didn't go", "‘didn't’ dan keyin fe'lning 1-shakli."),
]
WEAK_WORDS = {"good": "beneficial / advantageous", "bad": "detrimental / harmful", "big": "substantial / considerable",
              "very": "extremely / remarkably", "thing": "aspect / factor", "a lot of": "a significant number of",
              "get": "obtain / acquire", "show": "illustrate / demonstrate", "think": "believe / argue"}


def _sentences(text: str) -> list[str]:
    return [s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s]


def _text_metrics(text: str) -> dict[str, Any]:
    words = re.findall(r"[A-Za-z']+", text.lower())
    n = len(words) or 1
    sents = _sentences(text)
    lower = text.lower()
    linkers = [l for l in LINKERS if l in lower]
    academic = [w for w in ACADEMIC if re.search(rf"\b{w}", lower)]
    long_words = sum(1 for w in words if len(w) >= 8)
    errors = []
    for pat, fix, why in COMMON_ERRORS:
        flags = 0 if pat == r"\bi\b" else re.I
        for m in re.finditer(pat, text, flags):
            errors.append({"original": m.group(0), "correction": fix, "explanation": why})
    return {
        "words": len(words),
        "unique_ratio": len(set(words)) / n,
        "avg_sentence": len(words) / max(1, len(sents)),
        "sentences": len(sents),
        "paragraphs": len([p for p in text.split("\n") if p.strip()]),
        "linkers": linkers,
        "academic": academic,
        "long_ratio": long_words / n,
        "errors": errors[:10],
        "weak": [(w, s) for w, s in WEAK_WORDS.items() if re.search(rf"\b{w}\b", lower)],
    }


# ------------------------------------------------------------------ WRITING
WRITING_SYSTEM = """You are a certified senior IELTS Writing examiner. Assess the candidate's response strictly
using the official public IELTS Writing band descriptors (Task Achievement/Response, Coherence and Cohesion,
Lexical Resource, Grammatical Range and Accuracy). Be accurate and honest; do not inflate scores.
Bands are 0-9 in 0.5 steps. Penalise under-length responses (Task 1 < 150 words, Task 2 < 250 words).
{lang}
Return JSON with exactly these keys:
{{"band": number, "criteria": {{"task": {{"band": number, "comment": string}}, "coherence": {{"band": number, "comment": string}},
"lexical": {{"band": number, "comment": string}}, "grammar": {{"band": number, "comment": string}}}},
"grammar_errors": [{{"original": string, "correction": string, "explanation": string}}],
"vocabulary_issues": [{{"original": string, "suggestion": string, "explanation": string}}],
"structure": {{"introduction": string, "body": string, "conclusion": string, "overall": string}},
"strengths": [string], "improvements": [string], "improved_essay": string, "summary": string}}
List up to 8 grammar errors and up to 6 vocabulary issues quoted exactly from the essay.
The improved_essay must be a full rewritten version at roughly band 8, keeping the candidate's ideas."""


def _lang_note(explain_uz: bool) -> str:
    return ("Write all comments, explanations, strengths, improvements and summary in Uzbek (Latin script); "
            "keep quoted English text, corrections and the improved essay in English."
            if explain_uz else "Write all feedback in clear English.")


def evaluate_writing(db: Session, task_type: str, prompt: str, essay: str, explain_uz: bool = True) -> dict[str, Any]:
    wc = word_count(essay)
    try:
        data, cfg = ai.chat_json(
            db,
            WRITING_SYSTEM.format(lang=_lang_note(explain_uz)),
            f"Task type: IELTS Writing {task_type.upper()}\nWord count: {wc}\n\nTASK PROMPT:\n{prompt}\n\nCANDIDATE RESPONSE:\n{essay}",
            max_tokens=3500,
        )
        result = _normalize_writing(data)
        result.update(provider=cfg.name, model=cfg.model, is_demo=False)
    except (ai.AIUnavailable, ai.AIError) as e:
        log.info("Writing demo rejimi: %s", e)
        result = _demo_writing(task_type, essay)
        result["demo_reason"] = str(e)
    result["word_count"] = wc
    result["disclaimer"] = DISCLAIMER
    return result


def _band(v: Any, default: float = 5.0) -> float:
    try:
        return round_band(float(v))
    except (TypeError, ValueError):
        return default


def _normalize_writing(d: dict[str, Any]) -> dict[str, Any]:
    crit = d.get("criteria") or {}
    criteria = {}
    for k in ("task", "coherence", "lexical", "grammar"):
        c = crit.get(k) or {}
        criteria[k] = {"band": _band(c.get("band")), "comment": str(c.get("comment", ""))}
    band = _band(d.get("band"), round_band(sum(c["band"] for c in criteria.values()) / 4))
    return {
        "band": band,
        "criteria": criteria,
        "grammar_errors": [e for e in (d.get("grammar_errors") or []) if isinstance(e, dict)][:10],
        "vocabulary_issues": [e for e in (d.get("vocabulary_issues") or []) if isinstance(e, dict)][:8],
        "structure": d.get("structure") if isinstance(d.get("structure"), dict) else {},
        "strengths": [str(x) for x in (d.get("strengths") or [])][:6],
        "improvements": [str(x) for x in (d.get("improvements") or [])][:8],
        "improved_essay": str(d.get("improved_essay", "")),
        "summary": str(d.get("summary", "")),
    }


def _demo_writing(task_type: str, essay: str) -> dict[str, Any]:
    m = _text_metrics(essay)
    min_words = 150 if task_type == "task1" else 250
    length = min(1.0, m["words"] / min_words)
    task = 3.5 + 3.5 * length + (0.5 if m["paragraphs"] >= (3 if task_type == "task1" else 4) else 0)
    coh = 4.0 + min(2.5, len(m["linkers"]) * 0.4) + (0.5 if m["paragraphs"] >= 3 else -0.5)
    lex = 4.0 + min(1.5, m["unique_ratio"] * 2.5) + min(1.5, len(m["academic"]) * 0.3) + min(0.5, m["long_ratio"] * 3)
    gra = 6.5 - min(3.0, len(m["errors"]) * 0.5) + (0.5 if 12 <= m["avg_sentence"] <= 25 else 0)
    if m["words"] < 50:
        task, coh, lex, gra = (min(x, 3.5) for x in (task, coh, lex, gra))
    criteria = {
        "task": {"band": round_band(task), "comment": f"{m['words']} so'z yozilgan (kamida {min_words} kerak). "
                 + ("Hajm yetarli." if length >= 1 else "Hajm yetarli emas — ball pasayadi.")},
        "coherence": {"band": round_band(coh), "comment": f"{m['paragraphs']} ta paragraf, {len(m['linkers'])} ta bog'lovchi ibora: "
                      + (", ".join(m["linkers"][:6]) or "deyarli yo'q")},
        "lexical": {"band": round_band(lex), "comment": f"So'z xilma-xilligi {int(m['unique_ratio'] * 100)}%. Akademik so'zlar: "
                    + (", ".join(m["academic"][:6]) or "kam")},
        "grammar": {"band": round_band(gra), "comment": f"O'rtacha gap uzunligi {m['avg_sentence']:.0f} so'z. "
                    f"Topilgan tipik xatolar: {len(m['errors'])}."},
    }
    band = round_band(sum(c["band"] for c in criteria.values()) / 4)
    improvements = []
    if length < 1:
        improvements.append(f"Kamida {min_words} so'z yozing.")
    if len(m["linkers"]) < 4:
        improvements.append("‘However’, ‘Moreover’, ‘As a result’ kabi bog'lovchilarni ko'proq ishlating.")
    if m["paragraphs"] < 4 and task_type == "task2":
        improvements.append("Kirish, 2 ta asosiy paragraf va xulosadan iborat 4 paragrafli tuzilma qiling.")
    if len(m["academic"]) < 3:
        improvements.append("Akademik so'zlardan foydalaning: significant, contribute, beneficial…")
    improvements.append("To'liq AI tahlili uchun administrator AI API kalitini sozlashi kerak.")
    return {
        "band": band,
        "criteria": criteria,
        "grammar_errors": m["errors"],
        "vocabulary_issues": [{"original": w, "suggestion": s, "explanation": "Kuchliroq, akademik muqobil."} for w, s in m["weak"]][:6],
        "structure": {
            "introduction": "Birinchi paragraf mavzuni qayta ifodalashi va pozitsiyani bildirishi kerak.",
            "body": f"Matnda {max(0, m['paragraphs'] - 2)} ta asosiy paragraf aniqlandi.",
            "conclusion": "Xulosa asosiy fikrlarni qisqacha takrorlashi kerak." if m["paragraphs"] >= 3 else "Xulosa paragrafi aniqlanmadi.",
            "overall": "Demo tahlil: tuzilma paragraf soniga qarab baholandi.",
        },
        "strengths": [s for s in [
            "Hajm talabga javob beradi." if length >= 1 else "",
            "Bog'lovchi iboralar ishlatilgan." if len(m["linkers"]) >= 3 else "",
            "Akademik lug'at mavjud." if len(m["academic"]) >= 2 else "",
        ] if s] or ["Javob yozilgan — bu yaxshi boshlanish!"],
        "improvements": improvements,
        "improved_essay": "",
        "summary": f"Demo rejim: taxminiy band {band}. Bu baholash oddiy matn tahliliga asoslangan; AI ulanganda batafsil tahlil va yaxshilangan essay namunasi chiqadi.",
        "provider": "demo", "model": "heuristic-v1", "is_demo": True,
    }


# ------------------------------------------------------------------ SPEAKING
SPEAKING_SYSTEM = """You are a certified IELTS Speaking examiner. You receive a transcript (from speech-to-text) of a
candidate's answers. Assess using the official public IELTS Speaking band descriptors: Fluency and Coherence,
Lexical Resource, Grammatical Range and Accuracy, Pronunciation. Pronunciation can only be estimated from the
transcript (recognition errors, filler words, very short answers) — say so in the comment. Bands 0-9 in 0.5 steps.
Be honest and do not inflate. {lang}
Return JSON: {{"band": number, "criteria": {{"fluency": {{"band": number, "comment": string}},
"lexical": {{"band": number, "comment": string}}, "grammar": {{"band": number, "comment": string}},
"pronunciation": {{"band": number, "comment": string}}}},
"grammar_errors": [{{"original": string, "correction": string, "explanation": string}}],
"vocabulary": {{"good": [string], "suggestions": [{{"original": string, "suggestion": string}}]}},
"improved_answers": [{{"question": string, "sample": string}}],
"tips": [string], "summary": string}}
Give an improved band-8 sample for up to 3 of the questions."""


def evaluate_speaking(db: Session, transcript: list[dict[str, Any]], explain_uz: bool = True) -> dict[str, Any]:
    text = "\n".join(f"Q: {t.get('question', '')}\nA: {t.get('answer', '')}" for t in transcript)
    try:
        data, cfg = ai.chat_json(db, SPEAKING_SYSTEM.format(lang=_lang_note(explain_uz)), text, max_tokens=2500)
        crit = data.get("criteria") or {}
        criteria = {k: {"band": _band((crit.get(k) or {}).get("band")), "comment": str((crit.get(k) or {}).get("comment", ""))}
                    for k in ("fluency", "lexical", "grammar", "pronunciation")}
        result = {
            "band": _band(data.get("band"), round_band(sum(c["band"] for c in criteria.values()) / 4)),
            "criteria": criteria,
            "grammar_errors": [e for e in (data.get("grammar_errors") or []) if isinstance(e, dict)][:8],
            "vocabulary": data.get("vocabulary") if isinstance(data.get("vocabulary"), dict) else {"good": [], "suggestions": []},
            "improved_answers": [e for e in (data.get("improved_answers") or []) if isinstance(e, dict)][:3],
            "tips": [str(x) for x in (data.get("tips") or [])][:6],
            "summary": str(data.get("summary", "")),
            "provider": cfg.name, "model": cfg.model, "is_demo": False,
        }
    except (ai.AIUnavailable, ai.AIError) as e:
        result = _demo_speaking(transcript)
        result["demo_reason"] = str(e)
    result["disclaimer"] = DISCLAIMER
    return result


def _demo_speaking(transcript: list[dict[str, Any]]) -> dict[str, Any]:
    answers = " ".join(str(t.get("answer", "")) for t in transcript)
    m = _text_metrics(answers)
    per_answer = m["words"] / max(1, len(transcript))
    fillers = len(re.findall(r"\b(um+|uh+|er+|like|you know)\b", answers.lower()))
    flu = 3.5 + min(3.0, per_answer / 15) + min(1.0, len(m["linkers"]) * 0.3) - min(1.0, fillers * 0.15)
    lex = 4.0 + min(1.5, m["unique_ratio"] * 2.2) + min(1.5, len(m["academic"]) * 0.4)
    gra = 6.5 - min(3.0, len(m["errors"]) * 0.5) + (0.5 if m["avg_sentence"] > 10 else 0)
    pro = (flu + gra) / 2
    if m["words"] < 15:
        flu, lex, gra, pro = 2.5, 3.0, 3.0, 3.0
    criteria = {
        "fluency": {"band": round_band(flu), "comment": f"Har bir javob o'rtacha {per_answer:.0f} so'z. "
                    + ("Javoblarni kengaytiring (sabab + misol)." if per_answer < 30 else "Javoblar yetarlicha uzun.")},
        "lexical": {"band": round_band(lex), "comment": "So'z xilma-xilligi: " + f"{int(m['unique_ratio'] * 100)}%."},
        "grammar": {"band": round_band(gra), "comment": f"Topilgan tipik xatolar: {len(m['errors'])}."},
        "pronunciation": {"band": round_band(pro), "comment": "Demo rejimda talaffuz faqat transkript asosida taxminan baholanadi."},
    }
    return {
        "band": round_band(sum(c["band"] for c in criteria.values()) / 4),
        "criteria": criteria,
        "grammar_errors": m["errors"],
        "vocabulary": {"good": m["academic"][:6], "suggestions": [{"original": w, "suggestion": s} for w, s in m["weak"]][:5]},
        "improved_answers": [],
        "tips": ["Har javobda: fikr → sabab → misol tuzilmasidan foydalaning.",
                 "Part 2 da 2 daqiqa to'xtamasdan gapirishni mashq qiling.",
                 "To'liq AI tahlili uchun AI API kalitini sozlang."],
        "summary": "Demo rejim: oddiy matn tahliliga asoslangan taxminiy baho.",
        "provider": "demo", "model": "heuristic-v1", "is_demo": True,
    }


# ------------------------------------------------------------------ PREPPY TUTOR
TUTOR_MODES = {
    "chat": "Have a friendly, natural conversation in English to build fluency. Ask one follow-up question each turn.",
    "speaking": "Act as an IELTS Speaking examiner. Ask one IELTS-style question at a time (Part 1, then Part 2 cue card, then Part 3). "
                "After each answer give a short analysis: grammar mistakes, vocabulary upgrades, fluency notes and an estimated band, then ask the next question.",
    "grammar": "Act as a grammar coach. Explain grammar points clearly with examples and give the student a short exercise, then check it.",
    "vocabulary": "Act as a vocabulary coach for IELTS topics. Teach 4-5 useful words/collocations with examples, then quiz the student.",
    "writing": "Act as an IELTS writing coach. Help brainstorm ideas, structure essays and improve sentences the student writes.",
}


def tutor_system(mode: str, explain_uz: bool, level: str, target: float, name: str) -> str:
    lang = ("Speak mainly in English. When you explain mistakes, grammar or meanings, ALSO give a short explanation in Uzbek "
            "(Latin script), marked with 🇺🇿." if explain_uz else "Speak only in English.")
    return f"""You are Preppy, a warm, encouraging and expert IELTS tutor on the IELTS AI MASTER platform.
Student: {name or 'student'}, current level {level}, target IELTS band {target}.
Mode: {TUTOR_MODES.get(mode, TUTOR_MODES['chat'])}
{lang}
Rules: keep replies concise (under 180 words) and conversational. When the student writes English with mistakes,
start with a short "✏️ Correction:" line (wrong → right). Use **bold** for key words. Never claim to give an official IELTS score."""


DEMO_QUESTIONS = [
    "Let's talk about your hometown. What do you like most about it?",
    "Do you prefer studying in the morning or in the evening? Why?",
    "Describe a book you enjoyed reading. What was it about?",
    "How has technology changed the way people communicate?",
    "What kind of job would you like to have in the future?",
    "Do you think people should learn a foreign language at school? Why or why not?",
]


def tutor_reply(db: Session, history: list[dict[str, str]], mode: str, explain_uz: bool, level: str,
                target: float, name: str) -> dict[str, Any]:
    messages = [{"role": "system", "content": tutor_system(mode, explain_uz, level, target, name)}] + history[-20:]
    try:
        text, cfg = ai.chat(db, messages, max_tokens=600, temperature=0.7)
        return {"reply": text.strip(), "provider": cfg.name, "model": cfg.model, "is_demo": False}
    except (ai.AIUnavailable, ai.AIError) as e:
        return {"reply": _demo_tutor(history, explain_uz), "provider": "demo", "model": "rules-v1", "is_demo": True,
                "demo_reason": str(e)}


def _demo_tutor(history: list[dict[str, str]], explain_uz: bool) -> str:
    last = next((m["content"] for m in reversed(history) if m["role"] == "user"), "")
    m = _text_metrics(last)
    parts = []
    if m["errors"]:
        e = m["errors"][0]
        parts.append(f"✏️ Correction: {e['original']} → **{e['correction']}**" + (f"\n🇺🇿 {e['explanation']}" if explain_uz else ""))
    if m["words"] < 6:
        parts.append("Try to answer in at least two full sentences — give a reason and an example.")
    elif m["words"] >= 25:
        parts.append("Great, that's a well-developed answer! 👏")
    else:
        parts.append("Nice answer! You could extend it with *because…* and *for example…*.")
    if m["weak"]:
        w, s = m["weak"][0]
        parts.append(f"Vocabulary tip: instead of **{w}**, try **{s}**.")
    random.seed(len(history))
    parts.append(random.choice(DEMO_QUESTIONS))
    parts.append("\n_(Demo rejim: AI kaliti sozlanmagan, javoblar oddiy qoidalar asosida.)_")
    return "\n\n".join(parts)


# ------------------------------------------------------------------ STUDY PLAN / TAVSIYALAR
def plan_advice(db: Session, profile_summary: dict[str, Any]) -> dict[str, Any] | None:
    """AI'dan reja uchun qisqa xulosa va bosqichlar olish. AI bo'lmasa None."""
    try:
        data, _ = ai.chat_json(
            db,
            "You are an expert IELTS study planner. Write in Uzbek (Latin script). Return JSON: "
            '{"summary": string (3-4 sentences, personal), "phases": [{"title": string, "weeks": string, "focus": string}], '
            '"weekly_focus": [string]} with 3-4 phases.',
            json.dumps(profile_summary, ensure_ascii=False, default=str),
            max_tokens=1200,
        )
        return data
    except (ai.AIUnavailable, ai.AIError):
        return None


def recommendations(db: Session, summary: dict[str, Any]) -> tuple[list[str], bool]:
    try:
        data, _ = ai.chat_json(
            db,
            "You are an IELTS coach. Based on the student's statistics give 4 short, concrete, actionable recommendations "
            'in Uzbek (Latin script). Return JSON: {"recommendations": [string]}',
            json.dumps(summary, ensure_ascii=False, default=str),
            max_tokens=600,
        )
        recs = [str(r) for r in data.get("recommendations", [])][:5]
        if recs:
            return recs, True
    except (ai.AIUnavailable, ai.AIError):
        pass
    return rule_recommendations(summary), False


SKILL_UZ = {"listening": "Listening", "reading": "Reading", "writing": "Writing", "speaking": "Speaking"}
TIPS = {
    "listening": "Listening: har kuni 20 daqiqa podkast tinglang va gap-filling mashqlarini bajaring.",
    "reading": "Reading: True/False/Not Given savollarida kalit so'zlarni matndan izlashni mashq qiling.",
    "writing": "Writing: haftasiga kamida 2 ta Task 2 essay yozib, AI feedback oling.",
    "speaking": "Speaking: Preppy bilan har kuni 10 daqiqa ovozli suhbat qiling.",
}


def rule_recommendations(summary: dict[str, Any]) -> list[str]:
    bands = summary.get("bands", {}) or {}
    target = summary.get("target_band") or 6.5
    known = {k: v for k, v in bands.items() if v is not None}
    order = sorted(known, key=lambda k: known[k]) if known else list(summary.get("weak_skills") or ["writing", "speaking"])
    recs = [TIPS[s] for s in order if s in TIPS][:2]
    for s in ("listening", "reading", "writing", "speaking"):
        if s not in known:
            recs.append(f"{SKILL_UZ[s]} bo'yicha hali test topshirmagansiz — darajangizni aniqlash uchun bitta test ishlang.")
            break
    gap = [k for k, v in known.items() if v < target]
    if gap:
        recs.append(f"Maqsad ({target}) ga yetish uchun eng ko'p e'tibor: {', '.join(SKILL_UZ[g] for g in gap[:2])}.")
    recs.append("So'z boyligi: har kuni 10 ta so'zni flashcard orqali takrorlang (SRS).")
    return recs[:5]
