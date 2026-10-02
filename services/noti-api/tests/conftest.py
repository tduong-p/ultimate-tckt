import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from noti.config import settings
from noti.db import get_db
from noti.models import Base, ApiClient

test_engine = create_engine(settings.test_database_url, pool_pre_ping=True)
TestSession = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.drop_all(test_engine)
    Base.metadata.create_all(test_engine)
    yield
    Base.metadata.drop_all(test_engine)


@pytest.fixture()
def db() -> Session:
    session = TestSession()
    yield session
    session.rollback()
    session.close()
    with test_engine.begin() as conn:
        tables = ",".join(f'"{t.name}"' for t in reversed(Base.metadata.sorted_tables))
        if tables:
            conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))


@pytest.fixture()
def client(db: Session) -> TestClient:
    from noti.api import app as fastapi_app
    fastapi_app.dependency_overrides[get_db] = lambda: db
    yield TestClient(fastapi_app)
    fastapi_app.dependency_overrides.clear()


@pytest.fixture()
def make_client(db: Session):
    def _make(name="core", allowed=()):
        try:
            from noti.auth import hash_key, generate_key
            key = generate_key()
            client_row = ApiClient(name=name, key_hash=hash_key(key), allowed_templates=list(allowed))
            db.add(client_row)
            db.commit()
            db.refresh(client_row)
            return client_row, key
        except ImportError:
            raise NotImplementedError("auth module not yet implemented")
    return _make
