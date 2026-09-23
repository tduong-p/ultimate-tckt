import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class UnitKind(enum.StrEnum):
    """Đoàn trường và Liên chi Đoàn là CÙNG MỘT CẤP, chỉ khác tên gọi theo quy mô.
    Không lồng nhau. TCKT và VP Đoàn là hai đơn vị cấp Đại học song song."""

    DOAN_TRUONG = "doan_truong"
    LIEN_CHI_DOAN = "lien_chi_doan"
    TCKT = "tckt"
    VP_DOAN = "vp_doan"

    @property
    def holds_cases(self) -> bool:
        """Hồ sơ chỉ thuộc về đơn vị cấp cơ sở, không thuộc về TCKT/VP Đoàn."""
        return self in (UnitKind.DOAN_TRUONG, UnitKind.LIEN_CHI_DOAN)


class Role(enum.StrEnum):
    SINH_VIEN = "sinh_vien"
    CAN_BO_DON_VI = "can_bo_don_vi"
    TCKT = "tckt"
    VP_DOAN = "vp_doan"
    CHI_BO = "chi_bo"
    QUAN_TRI = "quan_tri"


class Unit(Base):
    __tablename__ = "unit"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    kind: Mapped[UnitKind] = mapped_column(Enum(UnitKind, native_enum=False, length=20))
    email: Mapped[str] = mapped_column(String(255), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class User(Base):
    __tablename__ = "app_user"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), default="")
    role: Mapped[Role] = mapped_column(Enum(Role, native_enum=False, length=20))
    unit_id: Mapped[int | None] = mapped_column(ForeignKey("unit.id"), default=None)
    student_id: Mapped[str] = mapped_column(String(32), default="")
    password_hash: Mapped[str | None] = mapped_column(String(255), default=None, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    unit: Mapped[Unit | None] = relationship(lazy="joined")


class OtpCode(Base):
    __tablename__ = "otp_code"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    code_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
