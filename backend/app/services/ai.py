"""AI provayder qatlami.

Groq, OpenAI va Gemini — uchalasi ham OpenAI-mos `/chat/completions` API'ni qo'llaydi,
shuning uchun bitta HTTP klient bilan ishlaymiz. Provayder admin paneldan almashtiriladi
(app_settings jadvali), API kalitlari esa FAQAT backend .env faylida turadi.
Kalit bo'lmasa `AIUnavailable` ko'tariladi va chaqiruvchi demo (heuristik) rejimga o'tadi.
"""
from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass
from typing import Any

import httpx
from sqlalchemy.orm import Session

from ..config import settings
from ..models import AppSetting

log = logging.getLogger("ai")

PROVIDERS: dict[str, dict[str, str]] = {
    "groq": {"label": "Groq", "base_url": "https://api.groq.com/openai/v1"},
    "openai": {"label": "OpenAI", "base_url": "https://api.openai.com/v1"},
    "gemini": {"label": "Google Gemini", "base_url": "https://generativelanguage.googleapis.com/v1beta/openai"},
}


class AIUnavailable(Exception):
    """AI ishlatib bo'lmaydi (kalit yo'q yoki provayder o'chirilgan)."""


class AIError(Exception):
    """Provayder xato qaytardi."""


@dataclass
class ProviderConfig:
    name: str
    model: str
    api_key: str
    base_url: str
    stt_model: str | None

    @property
    def label(self) -> str:
        return PROVIDERS.get(self.name, {}).get("label", self.name)


def _env_key(name: str) -> str:
    return {"groq": settings.groq_api_key, "openai": settings.openai_api_key, "gemini": settings.gemini_api_key}.get(name, "")


def _env_model(name: str) -> str:
    return {"groq": settings.groq_model, "openai": settings.openai_model, "gemini": settings.gemini_model}.get(name, "")


def get_ai_settings(db: Session) -> dict[str, Any]:
    row = db.get(AppSetting, "ai")
    value = dict(row.value) if row else {}
    value.setdefault("provider", settings.ai_provider)
    value.setdefault("models", {})
    return value


def save_ai_settings(db: Session, provider: str, models: dict[str, str]) -> dict[str, Any]:
    row = db.get(AppSetting, "ai")
    value = {"provider": provider, "models": {k: v for k, v in models.items() if v}}
    if row:
        row.value = value
    else:
        db.add(AppSetting(key="ai", value=value))
    db.commit()
    return value


def provider_config(db: Session, provider: str | None = None) -> ProviderConfig:
    cfg = get_ai_settings(db)
    name = (provider or cfg["provider"] or "none").lower()
    if name not in PROVIDERS:
        raise AIUnavailable("AI provayder o'chirilgan")
    key = _env_key(name)
    if not key:
        raise AIUnavailable(f"{PROVIDERS[name]['label']} API kaliti sozlanmagan")
    model = cfg["models"].get(name) or _env_model(name)
    stt = {"groq": settings.groq_stt_model, "openai": settings.openai_stt_model}.get(name)
    return ProviderConfig(name, model, key, PROVIDERS[name]["base_url"], stt)


def providers_status(db: Session) -> list[dict[str, Any]]:
    cfg = get_ai_settings(db)
    out = []
    for name, meta in PROVIDERS.items():
        out.append({
            "name": name,
            "label": meta["label"],
            "configured": bool(_env_key(name)),
            "active": cfg["provider"] == name,
            "model": cfg["models"].get(name) or _env_model(name),
            "supports_stt": name in ("groq", "openai"),
        })
    return out


def is_available(db: Session) -> bool:
    try:
        provider_config(db)
        return True
    except AIUnavailable:
        return False


def chat(db: Session, messages: list[dict[str, str]], *, json_mode: bool = False,
         temperature: float = 0.6, max_tokens: int = 1500, provider: str | None = None) -> tuple[str, ProviderConfig]:
    cfg = provider_config(db, provider)
    body: dict[str, Any] = {
        "model": cfg.model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    try:
        r = httpx.post(f"{cfg.base_url}/chat/completions", json=body, timeout=settings.ai_timeout_seconds,
                       headers={"Authorization": f"Bearer {cfg.api_key}"})
    except httpx.HTTPError as e:
        raise AIError(f"{cfg.label} bilan bog'lanib bo'lmadi: {e.__class__.__name__}") from e
    if r.status_code >= 400:
        msg = r.text[:300]
        log.warning("AI %s xato %s: %s", cfg.name, r.status_code, msg)
        if r.status_code in (401, 403):
            raise AIError(f"{cfg.label} API kaliti noto'g'ri yoki ruxsat yo'q")
        if r.status_code == 429:
            raise AIError(f"{cfg.label} limiti tugadi, keyinroq urinib ko'ring")
        raise AIError(f"{cfg.label} xatosi ({r.status_code})")
    try:
        text = r.json()["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, ValueError) as e:
        raise AIError("AI javobini o'qib bo'lmadi") from e
    return text, cfg


def parse_json(text: str) -> dict[str, Any]:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                pass
    raise AIError("AI JSON formatida javob bermadi")


def chat_json(db: Session, system: str, user: str, *, max_tokens: int = 2500) -> tuple[dict[str, Any], ProviderConfig]:
    messages = [{"role": "system", "content": system + "\nRespond ONLY with a valid JSON object."},
                {"role": "user", "content": user}]
    try:
        text, cfg = chat(db, messages, json_mode=True, temperature=0.3, max_tokens=max_tokens)
    except AIError:
        # ba'zi modellar response_format ni qo'llamaydi — oddiy so'rov bilan qayta urinamiz
        text, cfg = chat(db, messages, json_mode=False, temperature=0.3, max_tokens=max_tokens)
    return parse_json(text), cfg


def transcribe(db: Session, audio: bytes, filename: str, content_type: str) -> tuple[str, ProviderConfig]:
    """Groq yoki OpenAI Whisper orqali nutqni matnga aylantirish."""
    cfg = get_ai_settings(db)
    order = [cfg["provider"], "groq", "openai"]
    last: Exception = AIUnavailable("STT uchun Groq yoki OpenAI kaliti kerak")
    for name in dict.fromkeys(order):
        if name not in ("groq", "openai"):
            continue
        try:
            pc = provider_config(db, name)
        except AIUnavailable as e:
            last = e
            continue
        try:
            r = httpx.post(f"{pc.base_url}/audio/transcriptions", timeout=settings.ai_timeout_seconds,
                           headers={"Authorization": f"Bearer {pc.api_key}"},
                           data={"model": pc.stt_model or "", "language": "en", "response_format": "json"},
                           files={"file": (filename, audio, content_type)})
        except httpx.HTTPError as e:
            last = AIError(f"STT ulanish xatosi: {e.__class__.__name__}")
            continue
        if r.status_code >= 400:
            last = AIError(f"STT xatosi ({r.status_code})")
            continue
        return (r.json().get("text") or "").strip(), pc
    if isinstance(last, AIUnavailable):
        raise last
    raise AIError(str(last))


def ping(db: Session, provider: str) -> dict[str, Any]:
    t0 = time.monotonic()
    try:
        text, cfg = chat(db, [{"role": "user", "content": "Reply with the single word: OK"}],
                         max_tokens=5, temperature=0, provider=provider)
        return {"ok": True, "provider": provider, "model": cfg.model, "latency_ms": int((time.monotonic() - t0) * 1000),
                "reply": text.strip()[:40]}
    except (AIUnavailable, AIError) as e:
        return {"ok": False, "provider": provider, "error": str(e), "latency_ms": int((time.monotonic() - t0) * 1000)}
