import os
import pytest
from noti.config import Settings


def test_defaults_are_safe():
    s = Settings(database_url="postgresql+psycopg://x/y")
    assert s.mail_driver == "console"
    assert s.send_rate_per_minute == 30
    assert s.recipient_allowlist == []
    assert s.max_body_bytes == 64 * 1024


def test_allowlist_is_parsed_from_csv():
    s = Settings(database_url="postgresql+psycopg://x/y", recipient_allowlist="hust.edu.vn, a@b.c")
    assert s.recipient_allowlist == ["hust.edu.vn", "a@b.c"]


def test_allowlist_from_env_via_monkeypatch(monkeypatch):
    monkeypatch.setenv("NOTI_RECIPIENT_ALLOWLIST", "domain.com, user@test.com")
    s = Settings(database_url="postgresql+psycopg://x/y")
    assert s.recipient_allowlist == ["domain.com", "user@test.com"]
