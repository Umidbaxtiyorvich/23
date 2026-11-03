import os

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://ielts:ielts@localhost:5432/ielts_test")
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", os.environ["DATABASE_URL"]) if "TEST_DATABASE_URL" in os.environ else "postgresql+psycopg://ielts:ielts@localhost:5432/ielts_test"
os.environ["AI_PROVIDER"] = "none"
os.environ["GROQ_API_KEY"] = ""
os.environ["OPENAI_API_KEY"] = ""
os.environ["GEMINI_API_KEY"] = ""
os.environ["EMAIL_DEV_RETURN_LINKS"] = "true"
os.environ["RATE_LIMIT_AUTH_PER_MIN"] = "1000"
os.environ["RATE_LIMIT_GLOBAL_PER_MIN"] = "10000"
os.environ["RATE_LIMIT_AI_PER_MIN"] = "1000"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, engine  # noqa: E402
from app import models  # noqa: E402,F401


@pytest.fixture(scope="session")
def client():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    from app.main import app
    with TestClient(app) as c:
        yield c


def register(client, email="user@test.uz", password="Parol1234", name="Test User"):
    r = client.post("/api/auth/register", json={"email": email, "password": password, "full_name": name})
    assert r.status_code == 201, r.text
    return r.json()


@pytest.fixture(scope="session")
def auth(client):
    data = register(client)
    return {"Authorization": f"Bearer {data['access_token']}"}, data


@pytest.fixture(scope="session")
def admin_headers(client):
    r = client.post("/api/auth/login", json={"email": "admin@ielts-ai-master.example.com", "password": "Admin12345!"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
