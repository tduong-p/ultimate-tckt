from datetime import datetime, timedelta, timezone
import uuid
import pytest

from noti.models import Notification, NotificationRecipient
from noti.queue import purge
from noti.templating import Template, Registry


def make_test_registry():
    t_regular = Template(
        key="task.assigned",
        subject="Task assigned",
        required=["actor"],
        sensitive=False,
    )
    t_sensitive = Template(
        key="otp.sensitive",
        subject="OTP Code",
        required=["code"],
        sensitive=True,
    )
    return Registry(
        templates={"task.assigned": t_regular, "otp.sensitive": t_sensitive},
        version="v1",
        env_html=None,
        env_text=None,
    )


def test_purge_lifecycle(db, make_client):
    c, _ = make_client()
    registry = make_test_registry()
    now = datetime.now(timezone.utc)

    # 1. Notification sent 8 days ago (non-sensitive) -> data & variables should be cleared to NULL
    n_8d = Notification(
        id=uuid.uuid4(),
        client_id=c.id,
        template="task.assigned",
        template_version="v1",
        data={"actor": "User 8d"},
        payload_hash="hash8d",
        created_at=now - timedelta(days=8),
    )
    db.add(n_8d)
    r_8d = NotificationRecipient(
        notification_id=n_8d.id,
        email="user8d@example.com",
        variables={"role": "dev"},
        status="sent",
        finished_at=now - timedelta(days=8),
    )
    db.add(r_8d)

    # 2. Notification sent 6 days ago (non-sensitive) -> data & variables should NOT be touched
    n_6d = Notification(
        id=uuid.uuid4(),
        client_id=c.id,
        template="task.assigned",
        template_version="v1",
        data={"actor": "User 6d"},
        payload_hash="hash6d",
        created_at=now - timedelta(days=6),
    )
    db.add(n_6d)
    r_6d = NotificationRecipient(
        notification_id=n_6d.id,
        email="user6d@example.com",
        variables={"role": "dev"},
        status="sent",
        finished_at=now - timedelta(days=6),
    )
    db.add(r_6d)

    # 3. Notification sensitive just finished (now) -> data & variables should be cleared immediately
    n_sens = Notification(
        id=uuid.uuid4(),
        client_id=c.id,
        template="otp.sensitive",
        template_version="v1",
        data={"code": "123456"},
        payload_hash="hash_sens",
        created_at=now - timedelta(minutes=5),
    )
    db.add(n_sens)
    r_sens = NotificationRecipient(
        notification_id=n_sens.id,
        email="sens@example.com",
        variables={"target": "sms"},
        status="sent",
        finished_at=now - timedelta(minutes=2),
    )
    db.add(r_sens)

    # 4. Notification 91 days old, finished -> completely purged (row deleted)
    n_91d = Notification(
        id=uuid.uuid4(),
        client_id=c.id,
        template="task.assigned",
        template_version="v1",
        data=None,
        payload_hash="hash91d",
        created_at=now - timedelta(days=91),
    )
    db.add(n_91d)
    r_91d = NotificationRecipient(
        notification_id=n_91d.id,
        email="user91d@example.com",
        variables=None,
        status="sent",
        finished_at=now - timedelta(days=91),
    )
    db.add(r_91d)

    # 5. Notification 95 days old, but STILL PENDING -> NOT touched, NOT deleted!
    n_old_pending = Notification(
        id=uuid.uuid4(),
        client_id=c.id,
        template="task.assigned",
        template_version="v1",
        data={"actor": "Pending old"},
        payload_hash="hash_pending",
        created_at=now - timedelta(days=95),
    )
    db.add(n_old_pending)
    r_old_pending = NotificationRecipient(
        notification_id=n_old_pending.id,
        email="pending@example.com",
        variables={"key": "val"},
        status="pending",
    )
    db.add(r_old_pending)

    db.flush()
    deleted_noti_id = n_91d.id
    deleted_rec_id = r_91d.id

    db.commit()

    # Run purge
    stats = purge(db, now=now, registry=registry)

    # Check results
    db.refresh(n_8d)
    db.refresh(r_8d)
    assert n_8d.data is None
    assert r_8d.variables is None

    db.refresh(n_6d)
    db.refresh(r_6d)
    assert n_6d.data == {"actor": "User 6d"}
    assert r_6d.variables == {"role": "dev"}

    db.refresh(n_sens)
    db.refresh(r_sens)
    assert n_sens.data is None
    assert r_sens.variables is None

    # n_91d should be completely deleted
    assert db.get(Notification, deleted_noti_id) is None
    assert db.get(NotificationRecipient, deleted_rec_id) is None

    # n_old_pending must NOT be deleted or cleared
    db.refresh(n_old_pending)
    db.refresh(r_old_pending)
    assert n_old_pending.data == {"actor": "Pending old"}
    assert r_old_pending.variables == {"key": "val"}
