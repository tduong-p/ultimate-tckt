import enum
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class DocStatus(enum.StrEnum):
    MISSING = "missing"
    SUBMITTED = "submitted"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    NOT_APPLICABLE = "not_applicable"


class DocumentType(Base):
    """Danh mục giấy tờ — quản trị viên khai, KHÔNG hardcode trong code.
    Thêm một loại giấy tờ mới = thêm một dòng ở đây."""

    __tablename__ = "document_type"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(60), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    applies_to: Mapped[list[str]] = mapped_column(JSON, default=list)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_not_applicable: Mapped[bool] = mapped_column(Boolean, default=False)
    accepted_ext: Mapped[list[str]] = mapped_column(JSON, default=list)
    max_size_mb: Mapped[int] = mapped_column(Integer, default=5)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Document(Base):
    """MỘT DÒNG CHO MỖI ĐẦU MỤC GIẤY TỜ của một hồ sơ — kể cả mục chưa nộp.
    Đây là 'tấm ảnh' chụp danh mục lúc tạo hồ sơ; danh mục đổi về sau không
    ảnh hưởng hồ sơ đang chạy."""

    __tablename__ = "document"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id", ondelete="CASCADE"), index=True)
    document_type_id: Mapped[int | None] = mapped_column(ForeignKey("document_type.id"), default=None)
    name: Mapped[str] = mapped_column(String(255))
    status: Mapped[DocStatus] = mapped_column(
        Enum(DocStatus, native_enum=False, length=20), default=DocStatus.MISSING
    )
    storage_key: Mapped[str] = mapped_column(String(500), default="")
    filename: Mapped[str] = mapped_column(String(255), default="")
    content_type: Mapped[str] = mapped_column(String(100), default="")
    size: Mapped[int] = mapped_column(Integer, default=0)
    reason: Mapped[str] = mapped_column(Text, default="")
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_not_applicable: Mapped[bool] = mapped_column(Boolean, default=False)
    is_adhoc: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=0)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    case = relationship("Case", back_populates="documents")
