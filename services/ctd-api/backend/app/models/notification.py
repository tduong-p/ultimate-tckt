from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Outbox(Base):
    """Hàng đợi thông báo. Ghi trong CÙNG transaction với việc đổi trạng thái —
    không bao giờ có chuyện đổi trạng thái mà quên gửi, hay gửi rồi mà rollback."""

    __tablename__ = "outbox"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id", ondelete="CASCADE"), index=True)
    to_emails: Mapped[str] = mapped_column(Text)
    cc_emails: Mapped[str] = mapped_column(Text, default="")
    subject: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    event_code: Mapped[str] = mapped_column(String(40))
    # Chống gửi trùng khi cron chạy chồng hoặc job chạy lại.
    dedup_key: Mapped[str] = mapped_column(String(200), unique=True)
    status: Mapped[str] = mapped_column(String(10), default="pending", index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
