from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings

def engine_kwargs() -> dict:
    if settings.db_schema:
        return {"connect_args": {"options": f"-csearch_path={settings.db_schema}"}}
    return {}


engine = create_engine(settings.database_url, pool_pre_ping=True, future=True, **engine_kwargs())
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
