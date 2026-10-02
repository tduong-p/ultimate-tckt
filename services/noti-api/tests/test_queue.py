from datetime import datetime, timedelta, timezone
import threading
import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from noti.config import settings
from noti.models import ApiClient, Notification, NotificationRecipient
from noti.queue import claim_next, recover, mark_sent, mark_retry, mark_failed


def create_test_noti(db, client_id, priority=1, expires_at=None, dedupe_key=None):
    noti = Notification(
        id=uuid.uuid4(),
        client_id=client_id,
        template="task.assigned",
        template_version="v1",
        data={"actor": "Admin"},
        payload_hash="hash123",
        dedupe_key=dedupe_key,
        priority=priority,
        expires_at=expires_at,
    )
    db.add(noti)
    db.flush()
    return noti


def create_test_recipient(db, noti_id, email, status="pending", attempts=0, next_attempt_at=None, locked_until=None):
    rec = NotificationRecipient(
        notification_id=noti_id,
        email=email,
        name="User",
        status=status,
        attempts=attempts,
        next_attempt_at=next_attempt_at or datetime.now(timezone.utc),
        locked_until=locked_until,
    )
    db.add(rec)
    db.flush()
    return rec


def test_claim_next_increases_attempts_and_sets_sending(db, make_client):
    c, _ = make_client()
    n = create_test_noti(db, c.id)
    r = create_test_recipient(db, n.id, "a@example.com")
    db.commit()

    now = datetime.now(timezone.utc)
    claimed = claim_next(db, limit=10, now=now)
    assert len(claimed) == 1
    assert claimed[0].recipient_id == r.id
    assert claimed[0].attempts == 1

    # In DB, verify status is sending and locked_until is set
    db.refresh(r)
    assert r.status == "sending"
    assert r.attempts == 1
    assert r.locked_until > now

    # Second claim returns nothing because it's sending
    claimed2 = claim_next(db, limit=10, now=now)
    assert len(claimed2) == 0


def test_parallel_claim_next_disjoint_sets(make_client):
    test_engine = create_engine(settings.test_database_url)
    TestSession = sessionmaker(bind=test_engine)

    setup_db = TestSession()
    c, _ = make_client("parallel_client")
    n = create_test_noti(setup_db, c.id)
    for i in range(20):
        create_test_recipient(setup_db, n.id, f"user{i}@example.com")
    setup_db.commit()
    setup_db.close()

    results = []

    def worker():
        worker_db = TestSession()
        now = datetime.now(timezone.utc)
        items = claim_next(worker_db, limit=10, now=now)
        results.extend([item.recipient_id for item in items])
        worker_db.close()

    t1 = threading.Thread(target=worker)
    t2 = threading.Thread(target=worker)
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    assert len(results) == 20
    assert len(set(results)) == 20  # completely disjoint!


def test_recover_sending_rows(db, make_client):
    c, _ = make_client()
    n = create_test_noti(db, c.id)
    now = datetime.now(timezone.utc)
    past = now - timedelta(minutes=10)

    # 1. sending with attempts < 5 and expired lock -> resets to pending
    r1 = create_test_recipient(db, n.id, "r1@example.com", status="sending", attempts=2, locked_until=past)
    # 2. sending with attempts >= 5 and expired lock -> becomes failed
    r2 = create_test_recipient(db, n.id, "r2@example.com", status="sending", attempts=5, locked_until=past)
    # 3. sending with active lock -> remains sending
    r3 = create_test_recipient(db, n.id, "r3@example.com", status="sending", attempts=2, locked_until=now + timedelta(minutes=5))
    db.commit()

    recover(db, now=now, max_attempts=5)
    db.commit()

    db.refresh(r1)
    db.refresh(r2)
    db.refresh(r3)
    assert r1.status == "pending"
    assert r2.status == "failed"
    assert r3.status == "sending"


def test_pending_expired_becomes_expired(db, make_client):
    c, _ = make_client()
    now = datetime.now(timezone.utc)
    past = now - timedelta(minutes=10)
    future = now + timedelta(minutes=10)

    n_exp = create_test_noti(db, c.id, expires_at=past)
    r_exp = create_test_recipient(db, n_exp.id, "exp@example.com", status="pending", next_attempt_at=past)

    n_valid = create_test_noti(db, c.id, expires_at=future)
    r_valid = create_test_recipient(db, n_valid.id, "valid@example.com", status="pending", next_attempt_at=past)
    db.commit()

    recover(db, now=now)
    db.commit()

    db.refresh(r_exp)
    db.refresh(r_valid)
    assert r_exp.status == "expired"
    assert r_valid.status == "pending"

    # Only valid recipient is claimed
    claimed = claim_next(db, limit=10, now=now)
    assert len(claimed) == 1
    assert claimed[0].recipient_id == r_valid.id


def test_claim_order_priority_then_next_attempt(db, make_client):
    c, _ = make_client()
    now = datetime.now(timezone.utc)

    n_low = create_test_noti(db, c.id, priority=2)
    r_low = create_test_recipient(db, n_low.id, "low@example.com", next_attempt_at=now - timedelta(minutes=5))

    n_high = create_test_noti(db, c.id, priority=0)
    r_high = create_test_recipient(db, n_high.id, "high@example.com", next_attempt_at=now)

    n_normal = create_test_noti(db, c.id, priority=1)
    r_normal = create_test_recipient(db, n_normal.id, "normal@example.com", next_attempt_at=now - timedelta(minutes=2))
    db.commit()

    claimed = claim_next(db, limit=10, now=now)
    assert [c.recipient_id for c in claimed] == [r_high.id, r_normal.id, r_low.id]


def test_mark_helpers(db, make_client):
    c, _ = make_client()
    n = create_test_noti(db, c.id)
    r = create_test_recipient(db, n.id, "m@example.com", status="sending", attempts=1)
    db.commit()

    mark_sent(db, r.id)
    db.commit()
    db.refresh(r)
    assert r.status == "sent"
    assert r.sent_at is not None

    mark_retry(db, r.id, delay_seconds=60, error="network error")
    db.commit()
    db.refresh(r)
    assert r.status == "pending"
    assert r.last_error == "network error"

    mark_failed(db, r.id, error="fatal error")
    db.commit()
    db.refresh(r)
    assert r.status == "failed"
    assert r.last_error == "fatal error"
