from sqlalchemy.orm import Session
from app.config import MOI_TRUONG_DEV, settings
from app.models.identity import Role, User
from app.infra.password import hash_password

ADMIN_EMAIL = "tckt.dtn@hust.edu.vn"
# Chỉ dùng ở APP_ENV=dev. Môi trường thật đặt mật khẩu bằng
# `python -m app.seeds.set_password <email>`.
ADMIN_PASSWORD_DEFAULT = "Dev@123"
ADMIN_FULL_NAME = "Quản trị viên Hệ thống"


def seed_admin(db: Session, app_env: str | None = None) -> User:
    """Đảm bảo có tài khoản quản trị cao nhất. Chạy ở mỗi lần khởi động nên
    không bao giờ đổi mật khẩu của tài khoản đã có."""
    env = app_env or settings.app_env
    user = db.query(User).filter_by(email=ADMIN_EMAIL).first()
    if user is None:
        user = User(
            email=ADMIN_EMAIL,
            full_name=ADMIN_FULL_NAME,
            role=Role.QUAN_TRI,
            password_hash=hash_password(ADMIN_PASSWORD_DEFAULT) if env == MOI_TRUONG_DEV else None,
            is_active=True,
            unit_id=None,
        )
        db.add(user)
    else:
        user.role = Role.QUAN_TRI
        user.is_active = True
        if not user.full_name:
            user.full_name = ADMIN_FULL_NAME

    db.commit()
    db.refresh(user)
    return user
