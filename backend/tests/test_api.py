from datetime import date, timedelta

from .conftest import register


def test_health_and_config(client):
    assert client.get("/api/health").json()["ok"] is True
    cfg = client.get("/api/config").json()
    assert cfg["app_name"] and cfg["ai_available"] is False
    assert client.get("/openapi.json").status_code == 200


def test_auth_flow(client):
    data = register(client, "flow@test.uz")
    assert "dev_link" in data and data["user"]["is_verified"] is False
    token = data["dev_link"].split("token=")[1]
    assert client.post("/api/auth/verify-email", json={"token": token}).status_code == 200
    # noto'g'ri parol
    assert client.post("/api/auth/login", json={"email": "flow@test.uz", "password": "wrong1234"}).status_code == 401
    r = client.post("/api/auth/login", json={"email": "FLOW@test.uz", "password": "Parol1234"})
    assert r.status_code == 200 and r.json()["user"]["is_verified"] is True
    tokens = r.json()
    h = {"Authorization": f"Bearer {tokens['access_token']}"}
    assert client.get("/api/auth/me", headers=h).status_code == 200
    r = client.post("/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 200
    # parolni tiklash (bir martalik)
    link = client.post("/api/auth/forgot-password", json={"email": "flow@test.uz"}).json()["dev_link"]
    rt = link.split("token=")[1]
    assert client.post("/api/auth/reset-password", json={"token": rt, "password": "Yangi12345"}).status_code == 200
    assert client.post("/api/auth/reset-password", json={"token": rt, "password": "Yana12345"}).status_code == 400
    # eski tokenlar bekor
    assert client.get("/api/auth/me", headers=h).status_code == 401
    r = client.post("/api/auth/login", json={"email": "flow@test.uz", "password": "Yangi12345"})
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.post("/api/auth/logout", headers=h).status_code == 200
    assert client.get("/api/auth/me", headers=h).status_code == 401


def test_validation(client):
    r = client.post("/api/auth/register", json={"email": "bad", "password": "x", "full_name": "A"})
    assert r.status_code == 422
    assert client.post("/api/auth/register", json={"email": "weak@test.uz", "password": "abcdefgh", "full_name": "Weak"}).status_code == 422
    register(client, "dup@test.uz")
    assert client.post("/api/auth/register", json={"email": "dup@test.uz", "password": "Parol1234", "full_name": "Dup"}).status_code == 409
    assert client.get("/api/dashboard").status_code == 401


def test_onboarding_dashboard_plan(client, auth):
    h, _ = auth
    body = {"exam_type": "academic", "current_level": "B1", "target_band": 7.0,
            "exam_date": (date.today() + timedelta(days=40)).isoformat(), "daily_minutes": 60, "weak_skills": ["writing"]}
    r = client.post("/api/profile/onboarding", json=body, headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["user"]["profile"]["onboarded"] is True
    d = client.get("/api/dashboard", headers=h).json()
    assert d["target_band"] == 7.0 and d["days_left"] == 40 and d["today_tasks"]
    p = client.get("/api/study-plan", headers=h).json()["plan"]
    assert p["progress"]["total"] > 0 and len(p["week"]) >= 6
    tid = p["today"][0]["id"]
    assert client.patch(f"/api/study-plan/tasks/{tid}", json={"completed": True}, headers=h).json()["completed"] is True
    r = client.post("/api/study-plan/generate", json={"use_ai": True}, headers=h)
    assert r.status_code == 200 and r.json()["ai_used"] is False


def test_reading_test_flow(client, auth):
    h, _ = auth
    tests = client.get("/api/reading", headers=h).json()
    free = next(t for t in tests if not t["is_premium"] and t["exam_type"] == "academic")
    prem = next(t for t in tests if t["is_premium"])
    assert prem["locked"] is True
    assert client.post(f"/api/tests/{prem['id']}/start", json={"mode": "practice"}, headers=h).status_code == 402
    detail = client.get(f"/api/tests/{free['id']}", headers=h).json()
    assert "answer" not in detail["items"][0]
    att = client.post(f"/api/tests/{free['id']}/start", json={"mode": "exam"}, headers=h).json()
    assert att["remaining_sec"] > 0
    items = detail["items"]
    answers = [{"question_id": q["id"], "response": "TRUE" if q["qtype"] == "tfng" else "B"} for q in items[:8]]
    assert client.put(f"/api/tests/attempts/{att['id']}/answers", json={"answers": answers, "time_spent_sec": 60}, headers=h).json()["count"] == 8
    again = client.post(f"/api/tests/{free['id']}/start", json={"mode": "exam"}, headers=h).json()
    assert again["id"] == att["id"] and len(again["answers"]) == 8  # davom ettirish
    res = client.post(f"/api/tests/attempts/{att['id']}/submit", json={"answers": [], "time_spent_sec": 300}, headers=h).json()
    assert res["status"] == "submitted" and res["band"] is not None and res["max_score"] == len(items)
    assert "answer" in res["items"][0] and res["by_type"]
    assert client.put(f"/api/tests/attempts/{att['id']}/answers", json={"answers": []}, headers=h).status_code == 409


def test_writing_demo_feedback(client, auth):
    h, _ = auth
    tasks = client.get("/api/writing/tasks?task_type=task2", headers=h).json()
    essay = ("Nowadays many people work from home. However, there are advantages and disadvantages. " * 12)
    r = client.post("/api/writing/evaluate", json={"task_type": "task2", "prompt": tasks[0]["prompt"], "essay": essay,
                                                   "time_spent_sec": 1200}, headers=h)
    assert r.status_code == 200, r.text
    fb = r.json()["feedback"]
    assert fb["is_demo"] is True and 0 <= fb["band"] <= 9 and set(fb["criteria"]) == {"task", "coherence", "lexical", "grammar"}
    assert "disclaimer" in fb
    assert client.get(f"/api/writing/submissions/{r.json()['submission_id']}", headers=h).status_code == 200
    assert client.post("/api/writing/evaluate", json={"task_type": "task2", "prompt": "Short prompt here", "essay": "too short"},
                       headers=h).status_code == 422


def test_speaking_and_tutor(client, auth):
    h, _ = auth
    st = client.get("/api/speaking/tests", headers=h).json()
    assert st and st[0]["parts"]
    tr = [{"question": "Do you like your city?", "answer": "Yes I like it because it is very green and people is friendly.", "duration_sec": 20}]
    r = client.post("/api/speaking/evaluate", json={"part": "1", "transcript": tr, "test_id": st[0]["id"]}, headers=h)
    assert r.status_code == 200 and r.json()["feedback"]["is_demo"] is True
    # Free: kuniga 1 ta
    assert client.post("/api/speaking/evaluate", json={"part": "1", "transcript": tr}, headers=h).status_code == 402
    r = client.post("/api/ai/chat", json={"messages": [{"role": "user", "content": "people is very good"}], "mode": "chat"}, headers=h)
    assert r.status_code == 200 and "Correction" in r.json()["reply"]
    assert client.get("/api/ai/status", headers=h).json()["available"] is False
    assert client.post("/api/speaking/transcribe", files={"audio": ("a.webm", b"123", "audio/webm")}, headers=h).status_code == 503


def test_vocabulary_and_games(client, auth):
    h, _ = auth
    lst = client.get("/api/vocabulary?search=sustain", headers=h).json()
    assert lst["items"][0]["word"] == "sustainable"
    cards = client.get("/api/vocabulary/due?limit=5", headers=h).json()
    assert len(cards) == 5
    r = client.post(f"/api/vocabulary/{cards[0]['id']}/review", json={"grade": 2}, headers=h).json()
    assert r["progress"]["interval_days"] == 1
    r = client.post(f"/api/vocabulary/{cards[0]['id']}/review", json={"grade": 3}, headers=h).json()
    assert r["progress"]["interval_days"] == 4
    assert client.get("/api/vocabulary/stats", headers=h).json()["started"] == 1
    q = client.get("/api/vocabulary/quiz?n=5", headers=h).json()
    assert len(q) == 5 and q[0]["answer"] in q[0]["options"]
    assert len(client.get("/api/games/grammar?n=5", headers=h).json()) == 5
    assert len(client.get("/api/games/sentences?n=4", headers=h).json()) == 4
    assert client.post("/api/games/results", json={"game": "grammar_challenge", "score": 8, "max_score": 10, "duration_sec": 90},
                       headers=h).status_code == 200
    assert client.post("/api/games/results", json={"game": "hack", "score": 1, "max_score": 1}, headers=h).status_code == 422
    assert client.get("/api/games/results", headers=h).json()["best"]["grammar_challenge"]["best"] == 8


def test_statistics_and_premium(client, auth):
    h, _ = auth
    s = client.get("/api/statistics", headers=h).json()
    assert s["detailed_locked"] is True and s["bands"]["reading"] is not None
    assert client.post("/api/statistics/activity", json={"minutes": 1}, headers=h).status_code == 200
    plans = client.get("/api/subscriptions/plans").json()
    assert plans["test_mode"] is True
    assert client.post("/api/subscriptions/checkout", json={"plan": "premium_monthly", "card_number": "4000 0000 0000 0002"},
                       headers=h).status_code == 402
    r = client.post("/api/subscriptions/checkout", json={"plan": "premium_monthly", "card_number": "4242 4242 4242 4242"}, headers=h)
    assert r.status_code == 200 and r.json()["user"]["is_premium"] is True
    s = client.get("/api/statistics", headers=h).json()
    assert s["detailed_locked"] is False and len(s["weekly"]) == 8 and s["weak_areas"]
    assert client.get("/api/admin/overview", headers=h).status_code == 403


def test_admin(client, admin_headers):
    h = admin_headers
    ov = client.get("/api/admin/overview", headers=h).json()
    assert ov["users"] >= 3 and ov["tests"] >= 10
    users = client.get("/api/admin/users?search=user@test", headers=h).json()
    uid = users["items"][0]["id"]
    assert client.patch(f"/api/admin/users/{uid}", json={"premium_days": 30}, headers=h).json()["is_premium"] is True
    t = client.post("/api/admin/tests", headers=h, json={
        "title": "Admin test", "skill": "reading", "duration_min": 10, "content": {"sections": [{"title": "X", "text": "Hello world."}]},
        "questions": [{"qtype": "tfng", "prompt": "The text says hello.", "options": ["TRUE", "FALSE", "NOT GIVEN"], "answer": ["TRUE"]}]})
    assert t.status_code == 201, t.text
    tid = t.json()["id"]
    q = client.post(f"/api/admin/tests/{tid}/questions", headers=h, json={"qtype": "gap_fill", "prompt": "Hello ____", "answer": ["world"]})
    assert q.status_code == 201
    assert client.post(f"/api/admin/tests/{tid}/questions", headers=h, json={"qtype": "mcq", "prompt": "No options", "answer": ["A"]}).status_code == 422
    assert client.delete(f"/api/admin/tests/{tid}", headers=h).status_code == 200
    v = client.post("/api/admin/vocabulary", headers=h, json={"word": "resilient", "translation_uz": "chidamli"})
    assert v.status_code == 201
    assert client.post("/api/admin/vocabulary", headers=h, json={"word": "Resilient", "translation_uz": "x"}).status_code == 409
    ai = client.get("/api/admin/ai", headers=h).json()
    assert len(ai["providers"]) == 3
    assert client.put("/api/admin/ai", headers=h, json={"provider": "gemini", "models": {"gemini": "gemini-2.0-flash"}}).json()["provider"] == "gemini"
    assert client.post("/api/admin/ai/test", headers=h, json={"provider": "groq"}).json()["ok"] is False
    assert client.put("/api/admin/branding", headers=h, json={"app_name": "IELTS Pro"}).status_code == 200
    assert client.get("/api/config").json()["app_name"] == "IELTS Pro"
    assert isinstance(client.get("/api/admin/logs", headers=h).json(), list)


def test_rate_limit():
    from app.ratelimit import RateLimiter
    rl = RateLimiter()
    assert all(rl.allow("k", 3)[0] for _ in range(3))
    assert rl.allow("k", 3)[0] is False
