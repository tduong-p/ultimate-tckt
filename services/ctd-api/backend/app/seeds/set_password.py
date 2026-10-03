"""Đặt mật khẩu một tài khoản CTD từ dòng lệnh, không để mật khẩu lọt vào
lịch sử shell hay biến môi trường:

    python -m app.seeds.set_password <email>
"""

import getpass
import sys

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.infra.password import hash_password
from app.models.identity import User

DO_DAI_TOI_THIEU = 8


def set_password(db: Session, email: str, password: str) -> User:
    if len(password) < DO_DAI_TOI_THIEU:
        raise ValueError(f"Mật khẩu cần ít nhất {DO_DAI_TOI_THIEU} ký tự.")
    user = db.query(User).filter_by(email=email.strip().lower()).first()
    if user is None:
        raise LookupError(f"Không có tài khoản {email}.")
    user.password_hash = hash_password(password)
    db.commit()
    return user


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("Cách dùng: python -m app.seeds.set_password <email>", file=sys.stderr)
        return 2
    password = getpass.getpass("Mật khẩu mới: ")
    if password != getpass.getpass("Nhập lại: "):
        print("Hai lần nhập không khớp.", file=sys.stderr)
        return 1
    with SessionLocal() as db:
        try:
            user = set_password(db, argv[0], password)
        except (ValueError, LookupError) as loi:
            print(loi, file=sys.stderr)
            return 1
    print(f"Đã đặt mật khẩu cho {user.email}.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
