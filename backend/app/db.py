import os
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker

_engine: Engine | None = None
SessionLocal: sessionmaker | None = None


def _db_url() -> str:
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    # Fallback to SQLite for local dev in this template
    return "sqlite:///./iot_light_control.db"


# PUBLIC_INTERFACE
def init_db() -> None:
    """Initialize database engine and create tables if needed."""
    global _engine, SessionLocal
    if _engine is not None:
        return

    url = _db_url()
    connect_args = {}
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}

    _engine = create_engine(url, connect_args=connect_args, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)

    from .sqlalchemy_models import Base

    Base.metadata.create_all(bind=_engine)


# PUBLIC_INTERFACE
def get_session():
    """FastAPI dependency to yield a SQLAlchemy session."""
    if SessionLocal is None:
        init_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
