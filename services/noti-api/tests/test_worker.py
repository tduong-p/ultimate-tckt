from datetime import datetime, timedelta, timezone
import logging
import uuid
import pytest

from noti.drivers.base import Driver, Message, PermanentError, TransientError
from noti.models import Notification, NotificationRecipient
from noti.status import overall_status
from noti.templating import get_registry
from noti.worker import (
    BACKOFF,
    DRIVER_CALLS_PER_SEND,
    DRIVER_TIMEOUT_SECONDS,
    LOCK_SECONDS,
    MAX_ATTEMPTS,
    PURGE_INTERVAL_SECONDS,
    batch_size_for,
    delay_for,
    maybe_purge,
    run_once,
    scrub_error,
)


class FakeDriver(Driver):
    def __init__(self):
        self.sent_messages: list[Message] = []
        self.rules: dict[str, Exception] = {}

    def set_error_for_email(self, email: str, error: Exception):
        self.rules[email] = error

    def send(self, message: Message) -> None:
        if message.to_email in self.rules:
            err = self.rules[message.to_email]
            raise err
        self.sent_messages.append(message)


def create_notification(db, client_id, template="system.test", data=None):
    if data is None:
        data = {"message": "Kiểm tra hệ thống"}
    noti = Notification(
        id=uuid.uuid4(),
        client_id=client_id,
        template=template,
        template_version="v1",
        data=data,
        payload_hash="hash123",
        priority=1,
    )
    db.add(noti)
    db.flush()
    return noti


def create_recipient(db, noti_id, email, name="User", variables=None, attempts=0, status="pending", next_attempt_at=None):
    rec = NotificationRecipient(
        notification_id=noti_id,
        email=email,
        name=name,
        variables=variables or {},
        status=status,
        attempts=attempts,
        next_attempt_at=next_attempt_at or datetime.now(timezone.utc) - timedelta(seconds=1),
    )
    db.add(rec)
    db.flush()
    return rec


def test_delay_for_and_scrub_error():
    assert delay_for(1) == BACKOFF[0]
    assert delay_for(2) == BACKOFF[1]
    assert delay_for(5) == BACKOFF[4]
    assert delay_for(6) == BACKOFF[4]
    assert delay_for(1, retry_after=3600) == 3600
    assert delay_for(3, retry_after=10) == BACKOFF[2]

    err = "SMTP error: user student@hust.edu.vn rejected by mx1.hust.edu.vn"
    scrubbed = scrub_error(err)
    assert "student@hust.edu.vn" not in scrubbed
    assert "[REDACTED_EMAIL]" in scrubbed


def test_worker_run_once_success(db, make_client):
    c, _ = make_client()
    n = create_notification(db, c.id)
    r = create_recipient(db, n.id, "user@example.com")
    db.commit()

    registry = get_registry()
    driver = FakeDriver()
    now = datetime.now(timezone.utc)

    processed = run_once(db, registry, driver, now=now)
    assert processed == 1
    assert len(driver.sent_messages) == 1
    assert driver.sent_messages[0].to_email == "user@example.com"

    db.refresh(r)
    assert r.status == "sent"
    assert r.sent_at is not None
    assert r.attempts == 1
    assert r.last_error is None


def test_worker_transient_error_retry(db, make_client):
    c, _ = make_client()
    n = create_notification(db, c.id)
    r = create_recipient(db, n.id, "transient@example.com")
    db.commit()

    registry = get_registry()
    driver = FakeDriver()
    driver.set_error_for_email("transient@example.com", TransientError("Network timeout connecting to server"))
    now = datetime.now(timezone.utc)

    processed = run_once(db, registry, driver, now=now)
    assert processed == 1
    assert len(driver.sent_messages) == 0

    db.refresh(r)
    assert r.status == "pending"
    assert r.attempts == 1
    assert r.next_attempt_at == now + timedelta(seconds=60)
    assert "Network timeout" in r.last_error


def test_worker_transient_with_retry_after(db, make_client):
    c, _ = make_client()
    n = create_notification(db, c.id)
    r = create_recipient(db, n.id, "rate_limit@example.com")
    db.commit()

    registry = get_registry()
    driver = FakeDriver()
    driver.set_error_for_email("rate_limit@example.com", TransientError("429 Too Many Requests", retry_after=3600))
    now = datetime.now(timezone.utc)

    processed = run_once(db, registry, driver, now=now)
    assert processed == 1

    db.refresh(r)
    assert r.status == "pending"
    assert r.next_attempt_at == now + timedelta(seconds=3600)


def test_worker_permanent_error_fails_immediately(db, make_client):
    c, _ = make_client()
    n = create_notification(db, c.id)
    r = create_recipient(db, n.id, "bad_email@example.com")
    db.commit()

    registry = get_registry()
    driver = FakeDriver()
    driver.set_error_for_email("bad_email@example.com", PermanentError("550 Mailbox not found for user student@hust.edu.vn"))
    now = datetime.now(timezone.utc)

    processed = run_once(db, registry, driver, now=now)
    assert processed == 1

    db.refresh(r)
    assert r.status == "failed"
    assert r.attempts == 1
    assert "student@hust.edu.vn" not in r.last_error
    assert "[REDACTED_EMAIL]" in r.last_error


def test_worker_transient_last_attempt_fails(db, make_client):
    c, _ = make_client()
    n = create_notification(db, c.id)
    # Already attempted MAX_ATTEMPTS-1 times, next claim will make attempts == MAX_ATTEMPTS
    r = create_recipient(db, n.id, "flaky@example.com", attempts=MAX_ATTEMPTS - 1)
    db.commit()

    registry = get_registry()
    driver = FakeDriver()
    driver.set_error_for_email("flaky@example.com", TransientError("Connection reset"))
    now = datetime.now(timezone.utc)

    processed = run_once(db, registry, driver, now=now)
    assert processed == 1

    db.refresh(r)
    assert r.status == "failed"
    assert r.attempts == MAX_ATTEMPTS
    assert "Max attempts reached" in r.last_error


def test_worker_partial_status_independent_recipients(db, make_client):
    c, _ = make_client()
    n = create_notification(db, c.id)
    r_good = create_recipient(db, n.id, "good@example.com")
    r_bad = create_recipient(db, n.id, "bad@example.com")
    db.commit()

    registry = get_registry()
    driver = FakeDriver()
    driver.set_error_for_email("bad@example.com", PermanentError("Invalid recipient"))
    now = datetime.now(timezone.utc)

    run_once(db, registry, driver, now=now)

    db.refresh(r_good)
    db.refresh(r_bad)
    assert r_good.status == "sent"
    assert r_bad.status == "failed"

    # Check overall status
    statuses = [r_good.status, r_bad.status]
    assert overall_status(statuses) == "partial"


def test_worker_render_error_fails_immediately_without_retry(db, make_client):
    c, _ = make_client()
    # Notification with unknown template
    n = create_notification(db, c.id, template="non.existent.template")
    r = create_recipient(db, n.id, "render_err@example.com")
    db.commit()

    registry = get_registry()
    driver = FakeDriver()
    now = datetime.now(timezone.utc)

    processed = run_once(db, registry, driver, now=now)
    assert processed == 1

    db.refresh(r)
    assert r.status == "failed"
    assert "Template" in r.last_error or "Render error" in r.last_error


def test_worker_crash_recovery_terminates_at_max_attempts(db, make_client):
    from noti.queue import claim_next, recover
    c, _ = make_client()
    n = create_notification(db, c.id)
    now = datetime.now(timezone.utc)
    r = create_recipient(db, n.id, "crasher@example.com", next_attempt_at=now - timedelta(seconds=1))
    db.commit()

    # Simulate MAX_ATTEMPTS crashes (worker claims item -> attempts incremented -> worker dies without completing -> lock expires)
    for attempt in range(1, MAX_ATTEMPTS + 1):
        # 1. Worker claims
        claimed = claim_next(db, limit=10, now=now)
        assert len(claimed) == 1
        assert claimed[0].attempts == attempt

        # 2. Worker crashes! Time moves forward 10 minutes (lock expires)
        now += timedelta(minutes=10)

    # After the last crash and lock expiration, recover should turn it into 'failed'
    recover(db, now=now, max_attempts=MAX_ATTEMPTS)
    db.commit()

    db.refresh(r)
    assert r.status == "failed"
    assert r.attempts == MAX_ATTEMPTS

    # Should no longer be claimable
    claimed = claim_next(db, limit=10, now=now)
    assert len(claimed) == 0


def test_worker_recipient_policy_dropped(db, make_client, monkeypatch):
    import noti.worker
    monkeypatch.setattr(noti.worker.settings, "recipient_allowlist", ["hust.edu.vn"])
    monkeypatch.setattr(noti.worker.settings, "redirect_to", None)

    c, _ = make_client()
    n = create_notification(db, c.id)
    r = create_recipient(db, n.id, "external@gmail.com")
    db.commit()

    registry = get_registry()
    driver = FakeDriver()
    now = datetime.now(timezone.utc)

    processed = run_once(db, registry, driver, now=now)
    assert processed == 1
    # Driver was NOT called
    assert len(driver.sent_messages) == 0

    db.refresh(r)
    # Suppressed (not sent) so it is neither retried nor counted as delivered
    assert r.status == "suppressed"
    assert r.sent_at is None
    assert r.last_error == "dropped by allowlist"


def test_worker_recipient_policy_redirected(db, make_client, monkeypatch):
    import noti.worker
    monkeypatch.setattr(noti.worker.settings, "recipient_allowlist", ["hust.edu.vn"])
    monkeypatch.setattr(noti.worker.settings, "redirect_to", "qa@hust.edu.vn")

    c, _ = make_client()
    n = create_notification(db, c.id)
    r = create_recipient(db, n.id, "student@gmail.com")
    db.commit()

    registry = get_registry()
    driver = FakeDriver()
    now = datetime.now(timezone.utc)

    processed = run_once(db, registry, driver, now=now)
    assert processed == 1
    assert len(driver.sent_messages) == 1
    sent = driver.sent_messages[0]
    assert sent.to_email == "qa@hust.edu.vn"
    assert "[chuyển hướng từ student@gmail.com]" in sent.subject

    db.refresh(r)
    assert r.status == "sent"



def test_worker_links_use_configured_app_base_url(db, make_client, monkeypatch):
    from noti.config import settings
    monkeypatch.setattr(settings, "app_base_url", "https://dyc.test/")
    c, _ = make_client()
    data = {"actor": "B", "task": {"id": 7, "title": "Poster", "path": "/#activity/3"}}
    n = create_notification(db, c.id, template="task.assigned", data=data)
    create_recipient(db, n.id, "user@example.com")
    db.commit()

    driver = FakeDriver()
    run_once(db, get_registry(), driver, now=datetime.now(timezone.utc))
    msg = driver.sent_messages[0]
    assert "https://dyc.test/#activity/3" in msg.html
    assert "https://dyc.test/#activity/3" in msg.text
    assert "app.example" not in msg.html


def test_worker_allowlist_also_filters_cc(db, make_client, monkeypatch):
    from noti.config import settings
    monkeypatch.setattr(settings, "recipient_allowlist", ["hust.edu.vn"])
    monkeypatch.setattr(settings, "redirect_to", None)
    c, _ = make_client()
    n = create_notification(db, c.id)
    n.cc = ["outsider@gmail.com", "b@hust.edu.vn"]
    create_recipient(db, n.id, "a@hust.edu.vn")
    db.commit()

    driver = FakeDriver()
    run_once(db, get_registry(), driver, now=datetime.now(timezone.utc))
    assert driver.sent_messages[0].cc == ["b@hust.edu.vn"]


def test_maybe_purge_runs_once_per_interval(monkeypatch):
    import noti.worker
    calls = []
    monkeypatch.setattr(noti.worker, "_purge_now", lambda: calls.append(1))
    assert maybe_purge(0.0, 10.0) == 10.0  # lần đầu: chạy ngay
    assert maybe_purge(10.0, 10.0 + PURGE_INTERVAL_SECONDS - 1) == 10.0  # chưa tới hạn
    assert maybe_purge(10.0, 10.0 + PURGE_INTERVAL_SECONDS) == 10.0 + PURGE_INTERVAL_SECONDS
    assert len(calls) == 2


def test_batch_fits_inside_lock_even_if_every_send_times_out():
    for delay in (0.0, 2.0, 60.0, 400.0):
        size = batch_size_for(delay)
        assert size >= 1
        assert size == 1 or size * (DRIVER_CALLS_PER_SEND * DRIVER_TIMEOUT_SECONDS + delay) <= LOCK_SECONDS


def test_batch_size_accounts_for_two_calls_per_send():
    assert batch_size_for(0) == 300 // 60 == 5


def test_allowlisted_recipient_is_suppressed_and_driver_not_called(db, make_client, monkeypatch):
    from noti.config import settings
    monkeypatch.setattr(settings, "recipient_allowlist", ["hust.edu.vn"])
    monkeypatch.setattr(settings, "redirect_to", None)
    c, _ = make_client()
    n = create_notification(db, c.id)
    r = create_recipient(db, n.id, "outsider@gmail.com")
    db.commit()

    driver = FakeDriver()
    run_once(db, get_registry(), driver, now=datetime.now(timezone.utc))
    assert driver.sent_messages == []
    db.refresh(r)
    assert r.status == "suppressed"


def test_reply_to_outside_allowlist_is_dropped(db, make_client, monkeypatch):
    from noti.config import settings
    monkeypatch.setattr(settings, "recipient_allowlist", ["hust.edu.vn"])
    monkeypatch.setattr(settings, "redirect_to", None)
    c, _ = make_client()
    n1 = create_notification(db, c.id)
    n1.reply_to = "outsider@gmail.com"
    create_recipient(db, n1.id, "a@hust.edu.vn")
    n2 = create_notification(db, c.id)
    n2.reply_to = "boss@hust.edu.vn"
    create_recipient(db, n2.id, "b@hust.edu.vn")
    db.commit()

    driver = FakeDriver()
    run_once(db, get_registry(), driver, now=datetime.now(timezone.utc))
    by_to = {m.to_email: m for m in driver.sent_messages}
    assert by_to["a@hust.edu.vn"].reply_to is None
    assert by_to["b@hust.edu.vn"].reply_to == "boss@hust.edu.vn"


def test_commit_failure_after_send_does_not_resend_or_retry(db, make_client, monkeypatch, caplog):
    import noti.worker
    c, _ = make_client()
    n = create_notification(db, c.id)
    r = create_recipient(db, n.id, "user@example.com")
    db.commit()

    calls = {"n": 0}

    def boom(*args, **kwargs):
        calls["n"] += 1
        raise RuntimeError("db down")

    monkeypatch.setattr(noti.worker, "mark_sent", boom)
    driver = FakeDriver()
    now = datetime.now(timezone.utc)
    with caplog.at_level(logging.ERROR, logger="noti.worker"):
        run_once(db, get_registry(), driver, now=now)
    assert len(driver.sent_messages) == 1
    assert calls["n"] == 3
    db.refresh(r)
    assert r.attempts == 1
    assert r.last_error is None
    assert r.status == "sending"
    errors = [rec.getMessage() for rec in caplog.records if rec.levelno >= logging.ERROR]
    assert any(str(r.id) in m for m in errors)
    assert not any("user@example.com" in m for m in errors)

    # Khoá chưa hết hạn nên lần chạy kế không gửi lại
    run_once(db, get_registry(), driver, now=now + timedelta(seconds=1))
    assert len(driver.sent_messages) == 1


def test_batch_deadline_releases_remaining_without_counting_attempt(db, make_client):
    c, _ = make_client()
    n = create_notification(db, c.id)
    recs = [create_recipient(db, n.id, f"u{i}@example.com") for i in range(3)]
    db.commit()

    calls = {"n": 0}

    def clock():
        calls["n"] += 1
        return 0.0 if calls["n"] <= 2 else 10_000.0

    driver = FakeDriver()
    now = datetime.now(timezone.utc)
    processed = run_once(db, get_registry(), driver, now=now, clock=clock)
    assert processed == 3
    assert len(driver.sent_messages) == 1
    statuses = []
    for r in recs:
        db.refresh(r)
        statuses.append((r.status, r.attempts))
    assert statuses.count(("sent", 1)) == 1
    assert statuses.count(("pending", 0)) == 2


@pytest.mark.parametrize("before,expected", [(MAX_ATTEMPTS - 1, "failed"), (MAX_ATTEMPTS - 2, "pending")])
def test_sixth_transient_failure_marks_failed_fifth_stays_pending(db, make_client, before, expected):
    c, _ = make_client()
    n = create_notification(db, c.id)
    r = create_recipient(db, n.id, "flaky@example.com", attempts=before)
    db.commit()
    driver = FakeDriver()
    driver.set_error_for_email("flaky@example.com", TransientError("Connection reset"))
    run_once(db, get_registry(), driver, now=datetime.now(timezone.utc))
    db.refresh(r)
    assert r.status == expected



def test_always_cc_added_after_allowlist_and_deduped(db, make_client, monkeypatch):
    from noti.config import settings
    monkeypatch.setattr(settings, "recipient_allowlist", ["hust.edu.vn"])
    monkeypatch.setattr(settings, "redirect_to", None)
    monkeypatch.setattr(settings, "always_cc", ["Ops@gmail.com", "a@hust.edu.vn", "b@HUST.edu.vn"])
    c, _ = make_client()
    n = create_notification(db, c.id)
    n.cc = ["outsider@yahoo.com", "b@hust.edu.vn"]
    create_recipient(db, n.id, "a@hust.edu.vn")
    db.commit()

    driver = FakeDriver()
    run_once(db, get_registry(), driver, now=datetime.now(timezone.utc))
    assert driver.sent_messages[0].cc == ["b@hust.edu.vn", "Ops@gmail.com"]


def test_always_cc_not_added_for_suppressed_recipient(db, make_client, monkeypatch):
    from noti.config import settings
    monkeypatch.setattr(settings, "recipient_allowlist", ["hust.edu.vn"])
    monkeypatch.setattr(settings, "redirect_to", None)
    monkeypatch.setattr(settings, "always_cc", ["ops@gmail.com"])
    c, _ = make_client()
    n = create_notification(db, c.id)
    create_recipient(db, n.id, "outsider@gmail.com")
    db.commit()

    driver = FakeDriver()
    run_once(db, get_registry(), driver, now=datetime.now(timezone.utc))
    assert driver.sent_messages == []


def test_always_cc_off_by_default(db, make_client, monkeypatch):
    from noti.config import settings
    monkeypatch.setattr(settings, "always_cc", [])
    c, _ = make_client()
    n = create_notification(db, c.id)
    create_recipient(db, n.id, "a@hust.edu.vn")
    db.commit()

    driver = FakeDriver()
    run_once(db, get_registry(), driver, now=datetime.now(timezone.utc))
    assert driver.sent_messages[0].cc == []
