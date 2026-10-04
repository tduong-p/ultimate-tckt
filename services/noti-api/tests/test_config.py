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


def test_env_example_matches_settings_fields():
    from pathlib import Path
    example = Path(__file__).parent.parent / ".env.example"
    keys = {
        line.split("=", 1)[0].strip()
        for line in example.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    }
    fields = {f"NOTI_{name.upper()}" for name in Settings.model_fields}
    assert keys - fields == set(), "biến trong .env.example không có trong Settings"
    assert fields - keys == set(), "Settings có trường chưa ghi trong .env.example"


def test_always_cc_defaults_off_and_parses_csv(monkeypatch):
    assert Settings(database_url="postgresql+psycopg://x/y").always_cc == []
    monkeypatch.setenv("NOTI_ALWAYS_CC", "a@x.com, B@y.com ,")
    s = Settings(database_url="postgresql+psycopg://x/y")
    assert s.always_cc == ["a@x.com", "B@y.com"]
