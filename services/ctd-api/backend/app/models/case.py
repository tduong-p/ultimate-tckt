import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, Computed, DateTime, Enum, ForeignKey, Index, Integer, Numeric, String, Text, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

# Hai trạng thái kết thúc. Khai riêng từng mã để nơi khác cần đúng một trong
# hai (ví dụ tầm nhìn của Chi bộ) không phải viết cứng chuỗi lần nữa.
FORWARDED_STATUS = "forwarded"
CANCELLED_STATUS = "cancelled"
TERMINAL_STATUSES = (FORWARDED_STATUS, CANCELLED_STATUS)

# Trạng thái hồ sơ nháp — sinh viên chưa gửi. Dùng chung cho mọi nơi cần kiểm
# hoặc gán trạng thái này — KHÔNG viết cứng chuỗi "draft" ở nơi khác.
DRAFT_STATUS = "draft"

# Hai trạng thái hồ sơ còn nằm trong tay người nộp. Dùng chung cho mọi service
# kiểm quyền sửa — KHÔNG khai lại hằng số này ở nơi khác.
EDITABLE_BY_APPLICANT_STATUSES = (DRAFT_STATUS, "need_supplement")

# Sinh predicate cho partial index từ chính hằng số trên — nếu không, thêm một
# trạng thái kết thúc mới sẽ sửa hằng số mà không sửa index, và hai tầng lệch nhau.
_TERMINAL_SQL = ", ".join(f"'{status}'" for status in TERMINAL_STATUSES)


class CaseType(enum.StrEnum):
    KET_NAP = "ket_nap"
    CHUYEN_CHINH_THUC = "chuyen_chinh_thuc"


class Batch(Base):
    __tablename__ = "batch"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    is_open: Mapped[bool] = mapped_column(Boolean, default=True)


class Case(Base):
    __tablename__ = "case"
    __table_args__ = (
        # MySQL không hỗ trợ partial index. Thay bằng generated column nullable:
        # - active_applicant_sentinel = applicant_id khi hồ sơ chưa kết thúc
        # - active_applicant_sentinel = NULL khi hồ sơ kết thúc
        # MySQL bỏ qua NULL trong unique index → nhiều hồ sơ kết thúc cho phép,
        # nhưng chỉ một hồ sơ đang chạy mỗi sinh viên được tồn tại.
        Index("uq_case_one_active_per_applicant", "active_applicant_sentinel", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True)
    applicant_id: Mapped[int] = mapped_column(ForeignKey("app_user.id"), index=True)
    unit_id: Mapped[int] = mapped_column(ForeignKey("unit.id"), index=True)
    batch_id: Mapped[int | None] = mapped_column(ForeignKey("batch.id"), default=None, index=True)
    case_type: Mapped[CaseType] = mapped_column(Enum(CaseType, native_enum=False, length=30))

    # Khoá ngoại tới status_def: không thể gán một trạng thái không tồn tại.
    status: Mapped[str] = mapped_column(ForeignKey("status_def.code"), default=DRAFT_STATUS, index=True)

    state_entered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_reminded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Generated column — giá trị tự tính từ status, không ghi trực tiếp.
    # = applicant_id khi hồ sơ chưa kết thúc; = NULL khi kết thúc.
    # Phải là STORED (persisted=True) vì MySQL chỉ cho index STORED generated column.
    active_applicant_sentinel: Mapped[int | None] = mapped_column(
        Integer,
        Computed(
            f"CASE WHEN status NOT IN ({_TERMINAL_SQL}) THEN applicant_id ELSE NULL END",
            persisted=True,
        ),
    )

    applicant = relationship("User", lazy="joined")
    unit = relationship("Unit", lazy="joined")
    documents = relationship(
        "Document", back_populates="case", order_by="Document.sort_order", lazy="selectin"
    )


class CaseDetail(Base):
    """Thông tin khai trong hồ sơ. Tách khỏi `case` vì rất nhiều cột — để chung
    làm bảng `case` phình và khó đọc."""

    __tablename__ = "case_detail"

    case_id: Mapped[int] = mapped_column(ForeignKey("case.id", ondelete="CASCADE"), primary_key=True)
    phone: Mapped[str] = mapped_column(String(10), default="")
    personal_email: Mapped[str] = mapped_column(String(255), default="")
    citizen_id: Mapped[str] = mapped_column(String(12), default="")
    permanent_address: Mapped[str] = mapped_column(Text, default="")
    temp_address: Mapped[str] = mapped_column(Text, default="")
    emergency_contact_name: Mapped[str] = mapped_column(String(255), default="")
    emergency_contact_relation: Mapped[str] = mapped_column(String(50), default="")
    emergency_contact_phone: Mapped[str] = mapped_column(String(10), default="")
    gpa: Mapped[float | None] = mapped_column(Numeric(3, 2), default=None)
    conduct_score: Mapped[int | None] = mapped_column(Integer, default=None)
