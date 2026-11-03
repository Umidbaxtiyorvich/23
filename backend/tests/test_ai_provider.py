"""AI provayder yo'lini soxta (mock) HTTP javob bilan tekshirish — haqiqiy kalit kerak emas."""
import json

import httpx

from app.config import settings
from app.services import ai


class FakeResp:
    def __init__(self, payload, status=200):
        self._p, self.status_code = payload, status
        self.text = json.dumps(payload)

    def json(self):
        return self._p


def test_ai_writing_and_chat_via_provider(client, auth, monkeypatch):
    h, _ = auth
    monkeypatch.setattr(settings, "groq_api_key", "test-key")
    calls = []

    def fake_post(url, json=None, headers=None, timeout=None, **kw):
        calls.append((url, json, headers))
        assert headers["Authorization"] == "Bearer test-key"
        if json.get("response_format"):
            content = {"band": 6.5, "criteria": {k: {"band": 6.5, "comment": "ok"} for k in ("task", "coherence", "lexical", "grammar")},
                       "grammar_errors": [{"original": "people is", "correction": "people are", "explanation": "ko'plik"}],
                       "vocabulary_issues": [], "structure": {}, "strengths": ["a"], "improvements": ["b"],
                       "improved_essay": "Better essay", "summary": "Yaxshi"}
            return FakeResp({"choices": [{"message": {"content": __import__("json").dumps(content)}}]})
        return FakeResp({"choices": [{"message": {"content": "Hello! ✏️ Correction: people is → people are"}}]})

    monkeypatch.setattr(httpx, "post", fake_post)
    # admin oldingi testda gemini tanlagan bo'lishi mumkin — groq ga qaytaramiz
    from app.db import SessionLocal
    with SessionLocal() as db:
        ai.save_ai_settings(db, "groq", {})
    r = client.post("/api/ai/chat", json={"messages": [{"role": "user", "content": "people is nice"}]}, headers=h)
    assert r.status_code == 200 and r.json()["is_demo"] is False and r.json()["provider"] == "groq"
    essay = "Working from home is popular. " * 30
    r = client.post("/api/writing/evaluate", json={"task_type": "task2", "prompt": "Discuss working from home.", "essay": essay}, headers=h)
    fb = r.json()["feedback"]
    assert fb["is_demo"] is False and fb["band"] == 6.5 and fb["provider"] == "groq"
    assert calls[0][0].startswith("https://api.groq.com/openai/v1/chat/completions")


def test_ai_error_falls_back_to_demo(client, auth, monkeypatch):
    h, _ = auth
    monkeypatch.setattr(settings, "groq_api_key", "bad-key")
    monkeypatch.setattr(httpx, "post", lambda *a, **k: FakeResp({"error": "invalid key"}, 401))
    r = client.post("/api/ai/chat", json={"messages": [{"role": "user", "content": "Hi there"}]}, headers=h)
    assert r.status_code == 200 and r.json()["is_demo"] is True and "kaliti" in r.json()["demo_reason"]
