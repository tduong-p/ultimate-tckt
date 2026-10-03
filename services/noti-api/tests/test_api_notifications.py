from datetime import datetime, timezone
import threading
import uuid
import pytest
from noti.models import Notification, NotificationRecipient


def body(**over):
    base = {
        "template": "task.assigned",
        "recipients": [{"email": "an@example.com", "name": "An"}],
        "data": {"actor": "Bình", "task": {"id": 1, "title": "Poster", "path": "/#activity/3"}},
        "dedupe_key": "task-assigned:1:7",
    }
    base.update(over)
    return base


def auth(key):
    return {"Authorization": f"Bearer {key}"}


def test_create_then_replay_then_conflict(client, make_client):
    _, key = make_client()
    r1 = client.post("/v1/notifications", json=body(), headers=auth(key))
    assert r1.status_code == 202
    assert r1.json()["status"] == "pending"
    nid = r1.json()["id"]

    r2 = client.post("/v1/notifications", json=body(), headers=auth(key))
    assert r2.status_code == 200
    assert r2.json()["id"] == nid
    assert r2.json()["status"] == "pending"

    r3 = client.post(
        "/v1/notifications",
        json=body(data={"actor": "Khác", "task": {"id": 1, "title": "Poster", "path": "/#a"}}),
        headers=auth(key),
    )
    assert r3.status_code == 409
    assert r3.json()["error"] == "dedupe_key_conflict"
    assert r3.json()["id"] == nid


def test_unknown_template_missing_var_and_limits_are_400(client, make_client):
    _, key = make_client()
    assert client.post("/v1/notifications", json=body(template="nope"), headers=auth(key)).status_code == 400
    assert client.post("/v1/notifications", json=body(data={"actor": "B"}), headers=auth(key)).status_code == 400
    many = [{"email": f"u{i}@example.com"} for i in range(51)]
    assert client.post("/v1/notifications", json=body(recipients=many), headers=auth(key)).status_code == 400
    assert client.post("/v1/notifications", json=body(recipients=[]), headers=auth(key)).status_code == 400


def test_absolute_url_in_path_is_rejected(client, make_client):
    _, key = make_client()
    bad1 = body(data={"actor": "B", "task": {"id": 1, "title": "x", "path": "https://evil.example/x"}})
    assert client.post("/v1/notifications", json=bad1, headers=auth(key)).status_code == 400

    bad2 = body(data={"actor": "B", "task": {"id": 1, "title": "x", "path": "//evil.example/x"}})
    assert client.post("/v1/notifications", json=bad2, headers=auth(key)).status_code == 400


def test_client_not_allowed_template_is_400(client, make_client):
    _, key = make_client(allowed=("task.overdue",))
    assert client.post("/v1/notifications", json=body(), headers=auth(key)).status_code == 400


def test_oversize_body_is_413(client, make_client):
    _, key = make_client()
    big = body(data={"actor": "x" * 70_000, "task": {"id": 1, "title": "t", "path": "/#a"}})
    assert client.post("/v1/notifications", json=big, headers=auth(key)).status_code == 413


def test_other_client_gets_404_on_get_and_retry(client, make_client):
    _, key_a = make_client("a")
    _, key_b = make_client("b")
    nid = client.post("/v1/notifications", json=body(), headers=auth(key_a)).json()["id"]
    assert client.get(f"/v1/notifications/{nid}", headers=auth(key_b)).status_code == 404
    assert client.post(f"/v1/notifications/{nid}/retry", headers=auth(key_b)).status_code == 404


def test_unseen_variables_are_not_stored(client, db, make_client):
    _, key = make_client()
    b = body()
    b["data"]["secret"] = "x"
    client.post("/v1/notifications", json=b, headers=auth(key))
    row = db.query(Notification).one()
    assert "secret" not in row.data


def test_get_by_id_and_by_dedupe_key(client, make_client):
    _, key = make_client()
    nid = client.post("/v1/notifications", json=body(), headers=auth(key)).json()["id"]

    # GET by ID
    r_id = client.get(f"/v1/notifications/{nid}", headers=auth(key))
    assert r_id.status_code == 200
    data_id = r_id.json()
    assert data_id["id"] == nid
    assert data_id["template"] == "task.assigned"
    assert data_id["status"] == "pending"
    assert len(data_id["recipients"]) == 1
    assert data_id["recipients"][0]["email"] == "an@example.com"

    # GET by dedupe_key
    r_dedupe = client.get("/v1/notifications?dedupe_key=task-assigned:1:7", headers=auth(key))
    assert r_dedupe.status_code == 200
    assert r_dedupe.json()["id"] == nid

    # GET by nonexistent dedupe_key
    assert client.get("/v1/notifications?dedupe_key=nonexistent", headers=auth(key)).status_code == 404


def test_retry_endpoint(client, db, make_client):
    _, key = make_client()
    nid = client.post("/v1/notifications", json=body(), headers=auth(key)).json()["id"]

    # Mark recipient failed
    rec = db.query(NotificationRecipient).filter_by(notification_id=uuid.UUID(nid)).one()
    rec.status = "failed"
    rec.attempts = 3
    db.commit()

    # Retry
    res = client.post(f"/v1/notifications/{nid}/retry", headers=auth(key))
    assert res.status_code == 200
    assert res.json()["status"] == "pending"

    db.refresh(rec)
    assert rec.status == "pending"
    assert rec.attempts == 0


def test_templates_listing_filtered(client, make_client):
    _, key_all = make_client("all_user")
    r_all = client.get("/v1/templates", headers=auth(key_all))
    assert r_all.status_code == 200
    keys = [t["key"] for t in r_all.json()["templates"]]
    assert len(keys) == 11

    _, key_restricted = make_client("restricted_user", allowed=("task.assigned",))
    r_res = client.get("/v1/templates", headers=auth(key_restricted))
    assert r_res.status_code == 200
    keys_res = [t["key"] for t in r_res.json()["templates"]]
    assert keys_res == ["task.assigned"]


def test_concurrent_same_key_creates_one_row(make_client):
    from noti.service import create_notification
    from noti.templating import load_registry
    from noti.config import settings
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from pathlib import Path

    reg = load_registry(Path(__file__).parent.parent / "templates")
    test_engine = create_engine(settings.test_database_url)
    TestSession = sessionmaker(bind=test_engine)
    # Setup client in its own session
    setup_db = TestSession()
    client_row, _ = make_client("concurrent_client")
    cid = client_row.id
    setup_db.close()

    results = []
    errors = []

    def worker():
        db = TestSession()
        try:
            from sqlalchemy import select
            c = db.scalar(select(client_row.__class__).where(client_row.__class__.id == cid))
            p = body(dedupe_key="concurrent-key-1")
            res = create_notification(db, c, p, reg)
            results.append(res)
        except Exception as e:
            errors.append(e)
        finally:
            db.close()

    t1 = threading.Thread(target=worker)
    t2 = threading.Thread(target=worker)
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    assert len(errors) == 0, f"Thread errors: {errors}"
    assert len(results) == 2
    # One created (202), one returned existing (200)
    statuses = {r["code"] for r in results}
    assert statuses == {200, 202}
    ids = {r["body"]["id"] for r in results}
    assert len(ids) == 1

    check_db = TestSession()
    count = check_db.query(Notification).filter_by(dedupe_key="concurrent-key-1").count()
    check_db.close()
    assert count == 1


@pytest.mark.parametrize("override", [
    {"recipients": ["an@example.com"]},
    {"recipients": [{"email": "khong-phai-email"}]},
    {"recipients": [{"email": "an@example.com", "name": 5}]},
    {"cc": ["b@example.com\r\nBcc: x@evil.example"]},
    {"reply_to": "not-an-email"},
    {"expires_at": "ngày mai"},
    {"expires_at": "2026-10-03T08:00:00"},
    {"priority": "urgent"},
    {"data": ["không phải object"]},
    {"dedupe_key": 123},
    {"source_ref": "x" * 256},
])
def test_malformed_fields_are_400_not_500(client, make_client, override):
    _, key = make_client()
    r = client.post("/v1/notifications", json=body(**override), headers=auth(key))
    assert r.status_code == 400, r.text
    assert r.json()["error"] == "validation_error"


def test_undeclared_recipient_variables_are_not_stored(client, db, make_client):
    _, key = make_client()
    b = body(recipients=[{"email": "an@example.com", "variables": {"actor": "Riêng", "secret": "x"}}])
    assert client.post("/v1/notifications", json=b, headers=auth(key)).status_code == 202
    rec = db.query(NotificationRecipient).one()
    assert rec.variables == {"actor": "Riêng"}
