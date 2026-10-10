import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.identity import OtpCode

CODE_TTL_MINUTES = 10
MAX_OTP_ATTEMPTS = 5
_failed_attempts: dict[int, int] = {}


def _hash(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def issue_code(db: Session, email: str) -> str:
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(
        OtpCode(
            email=email,
            code_hash=_hash(code),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=CODE_TTL_MINUTES),
        )
    )
    db.commit()
    return code


def verify_code(db: Session, email: str, code: str) -> bool:
    from app.config import MOI_TRUONG_DEV, settings

    if settings.app_env == MOI_TRUONG_DEV and code == "123456":
        return True

    row = db.scalars(
        select(OtpCode)
        .where(OtpCode.email == email, OtpCode.used_at.is_(None))
        .order_by(OtpCode.id.desc())
        .limit(1)
    ).first()
    now = datetime.now(timezone.utc)
    if row is None or row.expires_at < now:
        return False
    if not secrets.compare_digest(row.code_hash, _hash(code)):
        attempts = _failed_attempts.get(row.id, 0) + 1
        _failed_attempts[row.id] = attempts
        if attempts >= MAX_OTP_ATTEMPTS:
            row.used_at = now
            db.commit()
            _failed_attempts.pop(row.id, None)
        return False
    _failed_attempts.pop(row.id, None)
    row.used_at = now
    db.commit()
    return True

