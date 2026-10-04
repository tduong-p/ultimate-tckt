from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import re
import time
from typing import Callable, Optional

from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy.orm import Session

from noti.config import settings
from noti.db import SessionLocal, engine
from noti.drivers import (
    Driver,
    Message,
    PermanentError,
    TransientError,
    get_driver,
)
from noti.queue import (
    MAX_ATTEMPTS,
    claim_next,
    mark_failed,
    mark_retry,
    mark_sent,
    mark_suppressed,
    metrics,
    release,
)
from noti.recipient_policy import apply_policy
from noti.templating import Registry, TemplateError, get_registry

logger = logging.getLogger(__name__)

BACKOFF = [60, 300, 1800, 7200, 43200]
LOCK_SECONDS = 300
DRIVER_TIMEOUT_SECONDS = 30
# Mỗi lần gửi có thể gọi driver tối đa 2 lần (vd. lấy token rồi gửi), mỗi lần chạm timeout.
DRIVER_CALLS_PER_SEND = 2
RECORD_SENT_TRIES = 3
# Worker tự chạy purge định kỳ, không cần cron trên VM (SPEC-NOTI-001 §11).
PURGE_INTERVAL_SECONDS = 3600
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")


def delay_for(attempts: int, retry_after: Optional[int] = None) -> int:
    idx = min(max(attempts, 1), len(BACKOFF)) - 1
    backoff = BACKOFF[idx]
    if retry_after is not None and retry_after > backoff:
        return retry_after
    return backoff


def batch_size_for(delay_between_sends: float) -> int:
    """Cả lô phải gửi xong trước khi khoá hết hạn, kể cả khi mọi thư chạm timeout driver (§7)."""
    return max(1, int(LOCK_SECONDS // (DRIVER_CALLS_PER_SEND * DRIVER_TIMEOUT_SECONDS + delay_between_sends)))


def scrub_error(error: str) -> str:
    return EMAIL_REGEX.sub("[REDACTED_EMAIL]", error)


def _record_sent(db: Session, recipient_id: int, now: Optional[datetime]) -> bool:
    """Ghi 'sent' sau khi driver đã gửi xong. Thư đã đi nên không bao giờ retry/fail vì lỗi ghi."""
    for attempt in range(1, RECORD_SENT_TRIES + 1):
        try:
            db.rollback()
            mark_sent(db, recipient_id, now=now)
            db.commit()
            return True
        except Exception:
            logger.warning("Recording sent state failed for recipient %s (try %d/%d)", recipient_id, attempt, RECORD_SENT_TRIES)
    try:
        db.rollback()
    except Exception:
        pass
    logger.error(
        "Mail was sent but status could not be recorded for recipient %s; left for lock expiry",
        recipient_id,
    )
    return False


def run_once(
    db: Session,
    registry: Registry,
    driver: Driver,
    now: Optional[datetime] = None,
    delay_between_sends: float = 0.0,
    batch_size: int = 10,
    clock: Callable[[], float] = time.monotonic,
) -> int:
    # Tính từ lúc claim (khoá bắt đầu đếm từ đó), không phải sau khi claim xong.
    deadline = clock() + LOCK_SECONDS - DRIVER_CALLS_PER_SEND * DRIVER_TIMEOUT_SECONDS
    claimed_items = claim_next(db, limit=batch_size, now=now)
    if not claimed_items:
        return 0

    for item in claimed_items:
        # Hết hạn chót của lô: trả phần còn lại để khoá không hết hạn giữa lúc đang gửi
        if clock() >= deadline:
            release(db, item.recipient_id, now=now)
            db.commit()
            continue

        if delay_between_sends > 0:
            time.sleep(delay_between_sends)

        # Merge data and recipient-specific variables
        merged_data = dict(item.data)
        merged_data.update(item.variables)

        # 1. Render template
        try:
            rendered = registry.render(
                item.template,
                merged_data,
                recipient_name=item.name,
                base_url=settings.app_base_url,
            )
        except Exception as e:
            logger.error("Template rendering failed for notification %s recipient %s", item.notification_id, item.recipient_id)
            mark_failed(db, item.recipient_id, scrub_error(f"Render error: {e}"), now=now)
            db.commit()
            continue

        # 2. Check recipient staging policy (allowlist & redirect)
        target_email = apply_policy(item.email, settings.recipient_allowlist, settings.redirect_to)
        if target_email is None:
            logger.info("Recipient %s dropped by allowlist", item.recipient_id)
            mark_suppressed(db, item.recipient_id, now=now)
            db.commit()
            continue

        # CC cũng phải qua allowlist: địa chỉ ngoài danh sách bị bỏ (không chuyển hướng để tránh nhận trùng)
        cc = [c for c in item.cc if apply_policy(c, settings.recipient_allowlist, None) is not None]

        reply_to = item.reply_to
        if reply_to and settings.recipient_allowlist and apply_policy(reply_to, settings.recipient_allowlist, None) is None:
            reply_to = None

        subject = rendered.subject
        if target_email != item.email:
            subject = f"[chuyển hướng từ {item.email}] {rendered.subject}"

        # 3. Prepare message
        msg = Message(
            to_email=target_email,
            to_name=item.name,
            cc=cc,
            reply_to=reply_to,
            subject=subject,
            html=rendered.html,
            text=rendered.text,
        )

        # 4. Send through driver
        try:
            driver.send(msg)
        except PermanentError as e:
            logger.warning("Permanent error sending email for recipient %s", item.recipient_id)
            mark_failed(db, item.recipient_id, scrub_error(str(e)), now=now)
            db.commit()
        except TransientError as e:
            if item.attempts >= MAX_ATTEMPTS:
                logger.error("Max attempts (%d) reached for recipient %s (transient)", item.attempts, item.recipient_id)
                mark_failed(db, item.recipient_id, scrub_error(f"Max attempts reached: {e}"), now=now)
            else:
                delay = delay_for(item.attempts, e.retry_after)
                logger.info("Retrying recipient %s in %d seconds (attempt %d)", item.recipient_id, delay, item.attempts)
                mark_retry(db, item.recipient_id, delay_seconds=delay, error=scrub_error(str(e)), now=now)
            db.commit()
        except Exception as e:
            if item.attempts >= MAX_ATTEMPTS:
                logger.error("Max attempts (%d) reached for recipient %s (unexpected)", item.attempts, item.recipient_id)
                mark_failed(db, item.recipient_id, scrub_error(f"Max attempts reached: {e}"), now=now)
            else:
                delay = delay_for(item.attempts)
                logger.info("Retrying recipient %s in %d seconds after unexpected error", item.recipient_id, delay)
                mark_retry(db, item.recipient_id, delay_seconds=delay, error=scrub_error(str(e)), now=now)
            db.commit()
        else:
            _record_sent(db, item.recipient_id, now)

    return len(claimed_items)


def check_schema_synced() -> None:
    alembic_ini_path = Path(__file__).resolve().parent.parent / "alembic.ini"
    alembic_cfg = Config(str(alembic_ini_path))
    script = ScriptDirectory.from_config(alembic_cfg)
    head_rev = script.get_current_head()

    with engine.connect() as conn:
        context = MigrationContext.configure(conn)
        current_rev = context.get_current_revision()

    if current_rev != head_rev:
        raise RuntimeError(
            f"Database schema revision '{current_rev}' does not match Alembic head '{head_rev}'."
        )


def _purge_now() -> None:
    from noti.queue import purge

    with SessionLocal() as db:
        stats = purge(db)
    logger.info("purge: %s", json.dumps(stats))


def maybe_purge(last_run: float, now_time: float) -> float:
    """Chạy purge nếu đã quá PURGE_INTERVAL_SECONDS; trả thời điểm chạy gần nhất."""
    if last_run and now_time - last_run < PURGE_INTERVAL_SECONDS:
        return last_run
    try:
        _purge_now()
    except Exception:
        logger.exception("purge failed")
    return now_time


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    logger.info("Starting noti worker...")
    check_schema_synced()

    registry = get_registry()
    driver = get_driver(settings)
    rate = settings.send_rate_per_minute
    delay_between = 60.0 / rate if rate > 0 else 0.0
    last_metrics_log = 0.0
    last_purge = 0.0
    batch_size = batch_size_for(delay_between)

    logger.info("Worker initialized with driver %s and rate %d/min", type(driver).__name__, rate)
    while True:
        try:
            now_time = time.time()
            if now_time - last_metrics_log >= 60:
                with SessionLocal() as db:
                    m = metrics(db)
                    logger.info(
                        '{"pending": %d, "failed": %d, "oldest_pending_age_s": %d}',
                        m["pending"],
                        m["failed"],
                        m["oldest_pending_age_seconds"],
                    )
                last_metrics_log = now_time
            last_purge = maybe_purge(last_purge, now_time)

            with SessionLocal() as db:
                count = run_once(db, registry, driver, delay_between_sends=delay_between, batch_size=batch_size)
            if count == 0:
                time.sleep(2)
        except KeyboardInterrupt:
            logger.info("Worker stopped by user")
            break
        except Exception:
            logger.exception("Error during worker execution loop")
            time.sleep(2)


if __name__ == "__main__":
    main()
