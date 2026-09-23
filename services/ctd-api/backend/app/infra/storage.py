import hashlib
import hmac
import time
from pathlib import Path

import boto3

from app.config import settings


class Storage:
    def put(self, key: str, data: bytes, content_type: str) -> None:
        raise NotImplementedError

    def signed_url(self, key: str, expires_seconds: int = 600) -> str:
        raise NotImplementedError


class MemoryStorage(Storage):
    """Dùng cho test và chạy local — không cần tài khoản object storage."""

    objects: dict[str, bytes] = {}

    def put(self, key: str, data: bytes, content_type: str) -> None:
        MemoryStorage.objects[key] = data

    def signed_url(self, key: str, expires_seconds: int = 600) -> str:
        return f"memory://{key}"


class S3Storage(Storage):
    """Object storage tương thích S3 (Cloudflare R2, Backblaze B2, DO Spaces).
    KHÔNG dùng URL công khai — hồ sơ chứa CCCD, địa chỉ, lý lịch gia đình."""

    def __init__(self) -> None:
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
        )

    def put(self, key: str, data: bytes, content_type: str) -> None:
        self._client.put_object(
            Bucket=settings.s3_bucket, Key=key, Body=data, ContentType=content_type
        )

    def signed_url(self, key: str, expires_seconds: int = 600) -> str:
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket, "Key": key},
            ExpiresIn=expires_seconds,
        )


def _chu_ky(key: str, expires: int) -> str:
    return hmac.new(
        settings.jwt_secret.encode(), f"{key}:{expires}".encode(), hashlib.sha256
    ).hexdigest()


def verify_signed_url(key: str, expires: int, sig: str) -> bool:
    """Kiểm tra chữ ký HMAC và hạn dùng của một link tải file local.
    Dùng ở route /api/documents/file — xem ghi chú ở đó về việc route này
    KHÔNG kiểm current_user (chữ ký + hạn dùng đóng vai trò xác thực)."""
    if time.time() > expires:
        return False
    return hmac.compare_digest(_chu_ky(key, expires), sig)


class LocalStorage(Storage):
    """Lưu file trên volume Docker riêng của máy chủ app — lựa chọn có chủ ý
    khi không có tài khoản object storage ngoài (S3/R2). File chỉ truy xuất
    được qua URL ký HMAC ngắn hạn (xem verify_signed_url), không public."""

    def __init__(self) -> None:
        self._base_dir = Path(settings.local_storage_dir)
        self._base_dir.mkdir(parents=True, exist_ok=True)

    def _duong_dan(self, key: str) -> Path:
        # `key` luôn do server sinh ra (services/documents.py::attach_file),
        # không lấy thẳng từ input người dùng — nhưng vẫn kiểm tra phòng thủ
        # để chống path traversal nếu có chỗ nào đó sau này truyền key thô.
        duong_dan = (self._base_dir / key).resolve()
        base_resolved = self._base_dir.resolve()
        if base_resolved not in duong_dan.parents and duong_dan != base_resolved:
            raise ValueError(f"Đường dẫn file nằm ngoài thư mục lưu trữ cho phép: {key}")
        return duong_dan

    def put(self, key: str, data: bytes, content_type: str) -> None:
        duong_dan = self._duong_dan(key)
        duong_dan.parent.mkdir(parents=True, exist_ok=True)
        duong_dan.write_bytes(data)

    def read(self, key: str) -> bytes:
        return self._duong_dan(key).read_bytes()

    def signed_url(self, key: str, expires_seconds: int = 600) -> str:
        expires = int(time.time()) + expires_seconds
        sig = _chu_ky(key, expires)
        return f"/api/documents/file?key={key}&expires={expires}&sig={sig}"


def get_storage() -> Storage:
    if settings.storage_driver == "s3":
        return S3Storage()
    if settings.storage_driver == "local":
        return LocalStorage()
    return MemoryStorage()
