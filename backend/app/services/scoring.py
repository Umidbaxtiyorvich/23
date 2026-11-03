"""IELTS ballarini hisoblash: xom ball → band, umumiy band yaxlitlash, javob tekshirish."""
from __future__ import annotations

import re

# 40 ta savol uchun taxminiy konversiya jadvallari (rasmiy jadvallarga yaqin, ochiq manbalardagi o'rtacha qiymatlar)
LISTENING = [(39, 9.0), (37, 8.5), (35, 8.0), (32, 7.5), (30, 7.0), (26, 6.5), (23, 6.0), (18, 5.5), (16, 5.0),
             (13, 4.5), (10, 4.0), (8, 3.5), (6, 3.0), (4, 2.5), (2, 2.0), (1, 1.0)]
READING_ACADEMIC = [(39, 9.0), (37, 8.5), (35, 8.0), (33, 7.5), (30, 7.0), (27, 6.5), (23, 6.0), (19, 5.5), (15, 5.0),
                    (13, 4.5), (10, 4.0), (8, 3.5), (6, 3.0), (4, 2.5), (2, 2.0), (1, 1.0)]
READING_GENERAL = [(40, 9.0), (39, 8.5), (37, 8.0), (36, 7.5), (34, 7.0), (32, 6.5), (30, 6.0), (27, 5.5), (23, 5.0),
                   (19, 4.5), (15, 4.0), (12, 3.5), (9, 3.0), (6, 2.5), (3, 2.0), (1, 1.0)]

LEVEL_BASELINE = {"A1": 3.0, "A2": 4.0, "B1": 5.0, "B2": 6.0, "C1": 7.0, "C2": 8.0}


def round_band(x: float) -> float:
    """IELTS qoidasi: .25 → .5 ga, .75 → keyingi butunga yaxlitlanadi."""
    x = max(0.0, min(9.0, x))
    whole = int(x)
    frac = x - whole
    if frac < 0.25:
        return float(whole)
    if frac < 0.75:
        return whole + 0.5
    return float(whole + 1)


def raw_to_band(skill: str, correct: float, total: float, exam_type: str = "academic") -> float:
    if total <= 0:
        return 0.0
    scaled = correct * 40.0 / total
    table = LISTENING if skill == "listening" else (READING_GENERAL if exam_type == "general" else READING_ACADEMIC)
    for threshold, band in table:
        if scaled >= threshold - 1e-9:
            return band
    return 0.0


def overall_band(bands: list[float | None]) -> float | None:
    vals = [b for b in bands if b is not None]
    if not vals:
        return None
    return round_band(sum(vals) / len(vals))


_norm_re = re.compile(r"[^a-z0-9 ]+")


def normalize(s: str) -> str:
    s = s.lower().strip()
    s = _norm_re.sub(" ", s)
    s = re.sub(r"\b(a|an|the)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def check_answer(qtype: str, response: str, accepted: list[str]) -> bool:
    if response is None or not str(response).strip():
        return False
    r = str(response).strip()
    if qtype in ("mcq", "tfng", "ynng", "matching_headings"):
        return any(r.lower() == str(a).lower() for a in accepted)
    nr = normalize(r)
    return any(nr == normalize(str(a)) for a in accepted)


def word_count(text: str) -> int:
    return len(re.findall(r"[A-Za-z0-9'’-]+", text or ""))
