from collections.abc import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@event.listens_for(engine, "connect")
def _set_utc_timezone(dbapi_conn, _connection_record):
    """Đảm bảo mọi connection đều dùng UTC — bù cho việc MySQL DATETIME không
    lưu timezone (khác PostgreSQL TIMESTAMPTZ). SQLAlchemy sẽ đọc/ghi giờ UTC
    đúng miễn là connection-level time_zone khớp với giờ lưu trong DB."""
    cursor = dbapi_conn.cursor()
    cursor.execute("SET time_zone = '+00:00'")
    cursor.close()


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
