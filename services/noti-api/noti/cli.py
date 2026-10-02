import argparse
from datetime import datetime, timezone
import sys
from sqlalchemy import select
from sqlalchemy.orm import Session

from noti.auth import generate_key, hash_key
from noti.db import SessionLocal
from noti.models import ApiClient


def create_client(db: Session, name: str, allowed_templates: list[str] | None = None) -> tuple[ApiClient, str]:
    existing = db.scalar(select(ApiClient).where(ApiClient.name == name))
    if existing:
        raise ValueError(f"Client với tên '{name}' đã tồn tại")
    raw_key = generate_key()
    client = ApiClient(
        name=name,
        key_hash=hash_key(raw_key),
        allowed_templates=allowed_templates or [],
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client, raw_key


def revoke_client(db: Session, name: str) -> ApiClient:
    client = db.scalar(select(ApiClient).where(ApiClient.name == name))
    if not client:
        raise ValueError(f"Không tìm thấy client '{name}'")
    client.revoked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(client)
    return client


def main(argv=None):
    parser = argparse.ArgumentParser(description="Noti CLI management tool")
    subparsers = parser.add_subparsers(dest="command", required=True)

    create_parser = subparsers.add_parser("create-client", help="Tạo API client mới")
    create_parser.add_argument("name", help="Tên client (unique)")
    create_parser.add_argument("--templates", help="Danh sách template được phép, phân tách bằng dấu phẩy", default="")

    revoke_parser = subparsers.add_parser("revoke-client", help="Thu hồi API client")
    revoke_parser.add_argument("name", help="Tên client cần thu hồi")

    subparsers.add_parser("purge", help="Dọn dẹp dữ liệu cũ")

    args = parser.parse_args(argv)
    db = SessionLocal()
    try:
        if args.command == "create-client":
            templates = [t.strip() for t in args.templates.split(",") if t.strip()]
            _, key = create_client(db, args.name, templates)
            print(f"Client '{args.name}' được tạo thành công.")
            print(f"API Key: {key}")
            print("CẢNH BÁO: Key chỉ hiển thị một lần duy nhất, hãy lưu trữ cẩn thận!")
        elif args.command == "revoke-client":
            revoke_client(db, args.name)
            print(f"Client '{args.name}' đã bị thu hồi.")
        elif args.command == "purge":
            from noti.queue import purge
            stats = purge(db)
            print(
                f"Purge hoàn tất: {stats['cleared_sensitive']} thông báo nhạy cảm đã xoá data, "
                f"{stats['cleared_regular']} thông báo thường đã xoá data, "
                f"{stats['deleted']} thông báo cũ đã xoá hẳn."
            )
    finally:
        db.close()


if __name__ == "__main__":
    main()
