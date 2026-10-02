from datetime import datetime, timezone
import logging
from pathlib import Path
import re
import time
from typing import Optional

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
from noti.queue import claim_next, mark_failed, mark_retry, mark_sent
from noti.templating import Registry, TemplateError, get_registry

logger = logging.getLogger(__name__)

BACKOFF = [60, 300, 1800, 7200, 43200]
MAX_ATTEMPTS = 5
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")


def delay_for(attempts: int, retry_after: Optional[int] = None) -> int:
    idx = min(max(attempts, 1), len(BACKOFF)) - 1
    backoff = BACKOFF[idx]
    if retry_after is not None and retry_after > backoff:
        return retry_after
    return backoff


def scrub_error(error: str) -> str:
    return EMAIL_REGEX.sub("[REDACTED_EMAIL]", error)


def run_once(
    db: Session,
    registry: Registry,
    driver: Driver,
    now: Optional[datetime] = None,
    delay_between_sends: float = 0.0,
) -> int:
    claimed_items = claim_next(db, limit=10, now=now)
    if not claimed_items:
        return 0

    for item in claimed_items:
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
                base_url="https://app.example",
            )
        except Exception as e:
            logger.error("Template rendering failed for notification %s recipient %s", item.notification_id, item.recipient_id)
            mark_failed(db, item.recipient_id, scrub_error(f"Render error: {e}"))
            db.commit()
            continue

        # 2. Prepare message
        msg = Message(
            to_email=item.email,
            to_name=item.name,
            cc=item.cc,
            reply_to=item.reply_to,
            subject=rendered.subject,
            html=rendered.html,
            text=rendered.text,
        )

        # 3. Send through driver
        try:
            driver.send(msg)
            mark_sent(db, item.recipient_id, now=now)
            db.commit()
        except PermanentError as e:
            logger.warning("Permanent error sending email for recipient %s", item.recipient_id)
            mark_failed(db, item.recipient_id, scrub_error(str(e)))
            db.commit()
        except TransientError as e:
            if item.attempts >= MAX_ATTEMPTS:
                logger.error("Max attempts (%d) reached for recipient %s (transient)", item.attempts, item.recipient_id)
                mark_failed(db, item.recipient_id, scrub_error(f"Max attempts reached: {e}"))
            else:
                delay = delay_for(item.attempts, e.retry_after)
                logger.info("Retrying recipient %s in %d seconds (attempt %d)", item.recipient_id, delay, item.attempts)
                mark_retry(db, item.recipient_id, delay_seconds=delay, error=scrub_error(str(e)), now=now)
            db.commit()
        except Exception as e:
            if item.attempts >= MAX_ATTEMPTS:
                logger.error("Max attempts (%d) reached for recipient %s (unexpected)", item.attempts, item.recipient_id)
                mark_failed(db, item.recipient_id, scrub_error(f"Max attempts reached: {e}"))
            else:
                delay = delay_for(item.attempts)
                logger.info("Retrying recipient %s in %d seconds after unexpected error", item.recipient_id, delay)
                mark_retry(db, item.recipient_id, delay_seconds=delay, error=scrub_error(str(e)), now=now)
            db.commit()

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


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    logger.info("Starting noti worker...")
    check_schema_synced()

    registry = get_registry()
    driver = get_driver(settings)
    rate = settings.send_rate_per_minute
    delay_between = 60.0 / rate if rate > 0 else 0.0

    logger.info("Worker initialized with driver %s and rate %d/min", type(driver).__name__, rate)
    while True:
        try:
            with SessionLocal() as db:
                count = run_once(db, registry, driver, delay_between_sends=delay_between)
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
