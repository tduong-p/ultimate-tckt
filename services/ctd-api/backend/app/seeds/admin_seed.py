from sqlalchemy.orm import Session
from app.models.identity import Role, User
from app.infra.password import hash_password

ADMIN_EMAIL = "tckt.dtn@hust.edu.vn"
ADMIN_PASSWORD_DEFAULT = "Dev@123"
ADMIN_FULL_NAME = "Quản trị viên Hệ thống"


def seed_admin(db: Session) -> User:
    """Tạo hoặc cập nhật tài khoản quản trị cao nhất của hệ thống."""
    user = db.query(User).filter_by(email=ADMIN_EMAIL).first()
    if user is None:
        user = User(
            email=ADMIN_EMAIL,
            full_name=ADMIN_FULL_NAME,
            role=Role.QUAN_TRI,
            password_hash=hash_password(ADMIN_PASSWORD_DEFAULT),
            is_active=True,
            unit_id=None,
        )
        db.add(user)
    else:
        user.role = Role.QUAN_TRI
        user.is_active = True
        user.password_hash = hash_password(ADMIN_PASSWORD_DEFAULT)
        if not user.full_name:
            user.full_name = ADMIN_FULL_NAME

    db.commit()
    db.refresh(user)
    return user
