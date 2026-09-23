import hashlib
import secrets

ITERATIONS = 100_000


def hash_password(password: str) -> str:
    """Hash password bằng PBKDF2-HMAC-SHA256 chuẩn thư viện chuẩn Python (không cần thêm dependency)."""
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), ITERATIONS)
    return f"{salt}:{dk.hex()}"


def verify_password(password: str, hashed: str | None) -> bool:
    """Xác thực password với hash lưu trong database."""
    if not hashed or ":" not in hashed:
        return False
    salt, expected = hashed.split(":", 1)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), ITERATIONS)
    return secrets.compare_digest(dk.hex(), expected)
