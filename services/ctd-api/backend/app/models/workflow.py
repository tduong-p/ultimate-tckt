from datetime import datetime

from sqlalchemy import ARRAY, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class StatusDef(Base):
    """Danh mục trạng thái. Mỗi trạng thái tự khai AI ĐANG GIỮ hồ sơ và HẠN bao lâu —
    nhờ đó job nhắc hạn và quy tắc người nhận email đều đọc từ đây, không hardcode."""

    __tablename__ = "status_def"

    code: Mapped[str] = mapped_column(String(30), primary_key=True)
    label: Mapped[str] = mapped_column(String(100))
    holder_role: Mapped[str | None] = mapped_column(String(20), default=None)
    sla_days: Mapped[int | None] = mapped_column(Integer, default=None)
    is_terminal: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class TransitionDef(Base):
    """Bảng bước chuyển hợp lệ. Toàn bộ state machine nằm ở đây dưới dạng DỮ LIỆU.
    Đổi quy trình = sửa các dòng này, không sửa code."""

    __tablename__ = "transition_def"
    __table_args__ = (UniqueConstraint("from_status", "action_code", name="uq_transition_from_action"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    from_status: Mapped[str] = mapped_column(ForeignKey("status_def.code"), index=True)
    to_status: Mapped[str] = mapped_column(ForeignKey("status_def.code"))
    action_code: Mapped[str] = mapped_column(String(40), index=True)
    label: Mapped[str] = mapped_column(String(100))
    allowed_roles: Mapped[list[str]] = mapped_column(ARRAY(String(20)))
    requires_reason: Mapped[bool] = mapped_column(Boolean, default=False)
    event_code: Mapped[str | None] = mapped_column(String(40), default=None)


class CaseEvent(Base):
    """Nhật ký CHUYỂN TRẠNG THÁI. Khác `field_change` (nhật ký sửa dữ liệu)."""

    __tablename__ = "case_event"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id", ondelete="CASCADE"), index=True)
    from_status: Mapped[str] = mapped_column(String(30), default="")
    to_status: Mapped[str] = mapped_column(String(30))
    action_code: Mapped[str] = mapped_column(String(40))
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("app_user.id"), default=None)
    actor_role: Mapped[str] = mapped_column(String(20), default="")
    reason: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
