from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import uuid
from typing import Any, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session


@dataclass
class Claimed:
    recipient_id: int
    notification_id: uuid.UUID
    email: str
    name: Optional[str]
    variables: dict[str, Any]
    attempts: int
    template: str
    data: dict[str, Any]
    cc: list[str]
    reply_to: Optional[str]


CLAIM_SQL = text("""
WITH picked AS (
  SELECT r.id FROM notification_recipients r
  JOIN notifications n ON n.id = r.notification_id
  WHERE r.status = 'pending' AND r.next_attempt_at <= :now
    AND (n.expires_at IS NULL OR n.expires_at > :now)
  ORDER BY n.priority ASC, r.next_attempt_at ASC
  FOR UPDATE OF r SKIP LOCKED
  LIMIT :limit
)
UPDATE notification_recipients r
SET status = 'sending', attempts = r.attempts + 1, locked_until = :now + interval '5 minutes'
FROM picked, notifications n
WHERE r.id = picked.id AND n.id = r.notification_id
RETURNING r.id AS recipient_id, r.notification_id, r.email, r.name, r.variables, r.attempts,
          n.template, n.data, n.cc, n.reply_to
""")


def recover(db: Session, now: Optional[datetime] = None, max_attempts: int = 5) -> None:
    if now is None:
        now = datetime.now(timezone.utc)

    # 1. Recover expired pending notifications
    expire_pending_sql = text("""
    UPDATE notification_recipients r
    SET status = 'expired', locked_until = NULL
    FROM notifications n
    WHERE r.notification_id = n.id
      AND r.status = 'pending'
      AND n.expires_at IS NOT NULL
      AND n.expires_at <= :now
    """)
    db.execute(expire_pending_sql, {"now": now})

    # 2. Recover sending rows with expired lock
    # attempts < max_attempts -> back to pending
    reset_to_pending_sql = text("""
    UPDATE notification_recipients
    SET status = 'pending', locked_until = NULL, next_attempt_at = :now
    WHERE status = 'sending'
      AND locked_until IS NOT NULL
      AND locked_until <= :now
      AND attempts < :max_attempts
    """)
    db.execute(reset_to_pending_sql, {"now": now, "max_attempts": max_attempts})

    # attempts >= max_attempts -> mark failed
    mark_dead_failed_sql = text("""
    UPDATE notification_recipients
    SET status = 'failed', locked_until = NULL, last_error = 'max attempts reached while locked/sending'
    WHERE status = 'sending'
      AND locked_until IS NOT NULL
      AND locked_until <= :now
      AND attempts >= :max_attempts
    """)
    db.execute(mark_dead_failed_sql, {"now": now, "max_attempts": max_attempts})


def claim_next(db: Session, limit: int = 10, now: Optional[datetime] = None) -> list[Claimed]:
    if now is None:
        now = datetime.now(timezone.utc)

    recover(db, now=now)

    result = db.execute(CLAIM_SQL, {"now": now, "limit": limit})
    rows = result.mappings().all()
    db.commit()

    claimed_list = []
    for row in rows:
        claimed_list.append(
            Claimed(
                recipient_id=row["recipient_id"],
                notification_id=row["notification_id"],
                email=row["email"],
                name=row["name"],
                variables=row["variables"] or {},
                attempts=row["attempts"],
                template=row["template"],
                data=row["data"] or {},
                cc=row["cc"] or [],
                reply_to=row["reply_to"],
            )
        )
    return claimed_list


def mark_sent(db: Session, recipient_id: int, now: Optional[datetime] = None) -> None:
    if now is None:
        now = datetime.now(timezone.utc)
    sql = text("""
    UPDATE notification_recipients
    SET status = 'sent', sent_at = :now, locked_until = NULL, last_error = NULL
    WHERE id = :rid
    """)
    db.execute(sql, {"now": now, "rid": recipient_id})


def mark_retry(db: Session, recipient_id: int, delay_seconds: int, error: str, now: Optional[datetime] = None) -> None:
    if now is None:
        now = datetime.now(timezone.utc)
    next_attempt = now + timedelta(seconds=delay_seconds)
    sql = text("""
    UPDATE notification_recipients
    SET status = 'pending', next_attempt_at = :next_attempt, locked_until = NULL, last_error = :error
    WHERE id = :rid
    """)
    db.execute(sql, {"next_attempt": next_attempt, "error": error, "rid": recipient_id})


def mark_failed(db: Session, recipient_id: int, error: str) -> None:
    sql = text("""
    UPDATE notification_recipients
    SET status = 'failed', locked_until = NULL, last_error = :error
    WHERE id = :rid
    """)
    db.execute(sql, {"error": error, "rid": recipient_id})
