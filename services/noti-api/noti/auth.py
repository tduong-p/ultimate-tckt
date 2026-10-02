import hashlib
import hmac
import secrets
from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session
from noti.db import get_db
from noti.errors import NotiError
from noti.models import ApiClient


def hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def generate_key() -> str:
    return secrets.token_urlsafe(32)


def current_client(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> ApiClient:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise NotiError(401, "unauthorized")
    digest = hash_key(authorization[7:].strip())
    client = db.scalar(select(ApiClient).where(ApiClient.key_hash == digest))
    if client is None or client.revoked_at is not None or not hmac.compare_digest(client.key_hash, digest):
        raise NotiError(401, "unauthorized")
    return client
