import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.db import get_db
from app.main import app as fastapi_app
from app.models.base import Base
import app.models  # noqa: F401

test_engine = create_engine(settings.test_database_url, pool_pre_ping=True)
TestSession = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)


@event.listens_for(test_engine, "connect")
def _set_utc_timezone(dbapi_conn, _connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("SET time_zone = '+00:00'")
    cursor.close()


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
    # Dọn sạch giữa các test — MySQL không có RESTART IDENTITY hay CASCADE trên TRUNCATE.
    # Tắt FK checks tạm để truncate theo thứ tự bất kỳ, bật lại sau.
    with test_engine.begin() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(text(f"TRUNCATE TABLE `{table.name}`"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))


@pytest.fixture()
def client(db: Session) -> TestClient:
    fastapi_app.dependency_overrides[get_db] = lambda: db
    yield TestClient(fastapi_app)
    fastapi_app.dependency_overrides.clear()
