from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Barcha sozlamalar .env faylidan yoki muhit o'zgaruvchilaridan o'qiladi."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "IELTS AI MASTER"
    environment: str = "development"  # development | production
    debug: bool = False

    database_url: str = "postgresql+psycopg://ielts:ielts@localhost:5432/ielts_ai_master"

    # JWT
    jwt_secret: str = "change-me-in-production-please-use-a-long-random-string"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 30
    refresh_token_days: int = 14

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    frontend_url: str = "http://localhost:5173"

    # AI provayderlar (kalitlar FAQAT backendda saqlanadi)
    ai_provider: str = "groq"  # groq | openai | gemini | none
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_stt_model: str = "whisper-large-v3-turbo"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_stt_model: str = "whisper-1"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    ai_timeout_seconds: float = 60.0

    # Email (SMTP). Bo'sh bo'lsa — dev rejim: havolalar logga yoziladi
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "no-reply@ielts-ai-master.example.com"
    smtp_tls: bool = True
    # True bo'lsa tasdiqlash/tiklash havolalari API javobida ham qaytadi (FAQAT development uchun!)
    email_dev_return_links: bool = False

    # Free / Premium cheklovlari
    free_ai_daily_limit: int = 15
    free_tests_daily_limit: int = 3

    # Rate limit (daqiqasiga)
    rate_limit_auth_per_min: int = 10
    rate_limit_ai_per_min: int = 20
    rate_limit_global_per_min: int = 300

    # Seed
    seed_demo_data: bool = True
    admin_email: str = "admin@ielts-ai-master.example.com"
    admin_password: str = "Admin12345!"

    upload_dir: str = "uploads"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
