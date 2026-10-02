from datetime import datetime, timedelta, timezone
import uuid
from noti.models import Notification, NotificationRecipient
from noti.queue import metrics


def test_metrics_empty(db):
    m = metrics(db)
    assert m["pending"] == 0
    assert m["failed"] == 0
    assert m["oldest_pending_age_seconds"] == 0


def test_metrics_with_data(db, make_client):
    c, _ = make_client()
    now = datetime.now(timezone.utc)

    # Notification created 120 seconds ago, with 1 pending recipient
    n1 = Notification(
        id=uuid.uuid4(),
        client_id=c.id,
        template="task.assigned",
        template_version="v1",
        data={"actor": "A"},
        payload_hash="hash_m1",
        created_at=now - timedelta(seconds=120),
    )
    db.add(n1)
    r1 = NotificationRecipient(
        notification_id=n1.id,
        email="p1@example.com",
        status="pending",
    )
    db.add(r1)

    # Notification created 60 seconds ago, with 1 failed recipient
    n2 = Notification(
        id=uuid.uuid4(),
        client_id=c.id,
        template="task.assigned",
        template_version="v1",
        data={"actor": "B"},
        payload_hash="hash_m2",
        created_at=now - timedelta(seconds=60),
    )
    db.add(n2)
    r2 = NotificationRecipient(
        notification_id=n2.id,
        email="f1@example.com",
        status="failed",
    )
    db.add(r2)

    db.commit()

    m = metrics(db, now=now)
    assert m["pending"] == 1
    assert m["failed"] == 1
    assert 119 <= m["oldest_pending_age_seconds"] <= 125
