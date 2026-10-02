import uuid
from datetime import datetime
from sqlalchemy import ARRAY, DateTime, ForeignKey, Index, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class ApiClient(Base):
    __tablename__ = "api_clients"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True)
    allowed_templates: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id: Mapped[int] = mapped_column(ForeignKey("api_clients.id"))
    template: Mapped[str] = mapped_column(String(100))
    template_version: Mapped[str] = mapped_column(String(64))
    data: Mapped[dict | None] = mapped_column(JSONB)
    payload_hash: Mapped[str] = mapped_column(String(64))
    dedupe_key: Mapped[str | None] = mapped_column(String(255))
    cc: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, server_default="{}")
    reply_to: Mapped[str | None] = mapped_column(String(320))
    priority: Mapped[int] = mapped_column(Integer, default=1)       # 0 high, 1 normal, 2 low
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source_ref: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    recipients: Mapped[list["NotificationRecipient"]] = relationship(back_populates="notification", cascade="all, delete-orphan")
    __table_args__ = (
        Index("uq_notifications_client_dedupe", "client_id", "dedupe_key", unique=True,
              postgresql_where=text("dedupe_key IS NOT NULL")),
    )


class NotificationRecipient(Base):
    __tablename__ = "notification_recipients"
    id: Mapped[int] = mapped_column(primary_key=True)
    notification_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("notifications.id", ondelete="CASCADE"))
    email: Mapped[str] = mapped_column(String(320))
    name: Mapped[str | None] = mapped_column(String(200))
    variables: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(Text)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notification: Mapped[Notification] = relationship(back_populates="recipients")
    __table_args__ = (Index("ix_recipients_claim", "status", "next_attempt_at"),)
