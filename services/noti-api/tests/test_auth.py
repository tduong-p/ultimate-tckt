from datetime import datetime, timezone
import pytest
from sqlalchemy import select
from noti.auth import hash_key
from noti.cli import create_client, revoke_client
from noti.models import ApiClient


def test_missing_key_is_401(client):
    assert client.get("/v1/templates").status_code == 401


def test_wrong_key_is_401(client, make_client):
    make_client()
    assert client.get("/v1/templates", headers={"Authorization": "Bearer nope"}).status_code == 401


def test_revoked_key_is_401(client, db, make_client):
    row, key = make_client()
    row.revoked_at = datetime.now(timezone.utc)
    db.commit()
    assert client.get("/v1/templates", headers={"Authorization": f"Bearer {key}"}).status_code == 401


def test_valid_key_ok(client, make_client):
    _, key = make_client()
    assert client.get("/v1/templates", headers={"Authorization": f"Bearer {key}"}).status_code == 200


def test_cli_create_and_revoke_client(db):
    row, raw_key = create_client(db, "cli_test", ["task.assigned"])
    assert row.name == "cli_test"
    assert row.key_hash == hash_key(raw_key)
    assert raw_key not in row.key_hash
    assert row.allowed_templates == ["task.assigned"]

    # Verify query from DB
    from_db = db.scalar(select(ApiClient).where(ApiClient.name == "cli_test"))
    assert from_db.key_hash == hash_key(raw_key)

    # Test duplicate name
    with pytest.raises(ValueError):
        create_client(db, "cli_test")

    # Test revoke
    revoked = revoke_client(db, "cli_test")
    assert revoked.revoked_at is not None
