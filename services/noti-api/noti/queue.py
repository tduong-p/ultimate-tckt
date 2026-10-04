from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import uuid
from typing import Any, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session


MAX_ATTEMPTS = 6


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


def recover(db: Session, now: Optional[datetime] = None, max_attempts: int = MAX_ATTEMPTS) -> None:
    if now is None:
        now = datetime.now(timezone.utc)

    # 1. Recover expired pending notifications
    expire_pending_sql = text("""
    UPDATE notification_recipients r
    SET status = 'expired', locked_until = NULL, finished_at = :now
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
    SET status = 'failed', locked_until = NULL, finished_at = :now, last_error = 'max attempts reached while locked/sending'
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


def mark_sent(db: Session, recipient_id: int, error: Optional[str] = None, now: Optional[datetime] = None) -> None:
    if now is None:
        now = datetime.now(timezone.utc)
    sql = text("""
    UPDATE notification_recipients
    SET status = 'sent', sent_at = :now, finished_at = :now, locked_until = NULL, last_error = :error
    WHERE id = :rid
    """)
    db.execute(sql, {"now": now, "error": error, "rid": recipient_id})


def mark_retry(db: Session, recipient_id: int, delay_seconds: int, error: str, now: Optional[datetime] = None) -> None:
    if now is None:
        now = datetime.now(timezone.utc)
    next_attempt = now + timedelta(seconds=delay_seconds)
    sql = text("""
    UPDATE notification_recipients
    SET status = 'pending', next_attempt_at = :next_attempt, locked_until = NULL, finished_at = NULL, last_error = :error
    WHERE id = :rid
    """)
    db.execute(sql, {"next_attempt": next_attempt, "error": error, "rid": recipient_id})


def mark_failed(db: Session, recipient_id: int, error: str, now: Optional[datetime] = None) -> None:
    if now is None:
        now = datetime.now(timezone.utc)
    sql = text("""
    UPDATE notification_recipients
    SET status = 'failed', locked_until = NULL, finished_at = :now, last_error = :error
    WHERE id = :rid
    """)
    db.execute(sql, {"error": error, "now": now, "rid": recipient_id})


def mark_suppressed(
    db: Session,
    recipient_id: int,
    error: str = "dropped by allowlist",
    now: Optional[datetime] = None,
) -> None:
    if now is None:
        now = datetime.now(timezone.utc)
    sql = text("""
    UPDATE notification_recipients
    SET status = 'suppressed', sent_at = NULL, finished_at = :now, locked_until = NULL, last_error = :error
    WHERE id = :rid
    """)
    db.execute(sql, {"now": now, "error": error, "rid": recipient_id})


def release(db: Session, recipient_id: int, now: Optional[datetime] = None) -> None:
    """Trả dòng về pending mà không tính là một lần thử (claim đã +1 attempts)."""
    if now is None:
        now = datetime.now(timezone.utc)
    sql = text("""
    UPDATE notification_recipients
    SET status = 'pending', attempts = GREATEST(attempts - 1, 0), locked_until = NULL,
        next_attempt_at = :now, finished_at = NULL
    WHERE id = :rid
    """)
    db.execute(sql, {"now": now, "rid": recipient_id})


def metrics(db: Session, now: Optional[datetime] = None) -> dict[str, Any]:
    if now is None:
        now = datetime.now(timezone.utc)
    sql = text("""
    SELECT
      count(*) FILTER (WHERE r.status IN ('pending', 'sending')) AS pending_count,
      count(*) FILTER (WHERE r.status = 'failed') AS failed_count,
      min(r.next_attempt_at) FILTER (
        WHERE r.status = 'sending' OR (r.status = 'pending' AND r.next_attempt_at <= :now)
      ) AS oldest_ready_at
    FROM notification_recipients r
    """)
    # Tuổi = đã đến lượt gửi bao lâu mà chưa gửi được; dòng đang chờ backoff không tính (tránh cảnh báo nhầm).
    row = db.execute(sql, {"now": now}).mappings().one()
    oldest_dt = row["oldest_ready_at"]
    age_seconds = 0
    if oldest_dt is not None:
        age_seconds = max(0, int((now - oldest_dt).total_seconds()))
    return {
        "pending": row["pending_count"] or 0,
        "failed": row["failed_count"] or 0,
        "oldest_pending_age_seconds": age_seconds,
    }


def purge(db: Session, now: Optional[datetime] = None, registry: Optional[Any] = None) -> dict[str, int]:
    if now is None:
        now = datetime.now(timezone.utc)
    if registry is None:
        from noti.templating import get_registry
        registry = get_registry()

    sensitive_keys = [k for k, t in registry.items() if getattr(t, "sensitive", False)]

    seven_days_ago = now - timedelta(days=7)
    ninety_days_ago = now - timedelta(days=90)

    cleared_sensitive = 0
    if sensitive_keys:
        sql_sensitive = text("""
        WITH terminal_noti AS (
          SELECT n.id
          FROM notifications n
          WHERE n.template = ANY(:templates)
            AND (n.data IS NOT NULL OR EXISTS (
              SELECT 1 FROM notification_recipients r WHERE r.notification_id = n.id AND r.variables IS NOT NULL
            ))
            AND NOT EXISTS (
              SELECT 1 FROM notification_recipients r WHERE r.notification_id = n.id AND r.status IN ('pending', 'sending')
            )
            AND (
              SELECT max(COALESCE(r.finished_at, r.sent_at, r.next_attempt_at))
              FROM notification_recipients r
              WHERE r.notification_id = n.id
            ) <= :now
        )
        UPDATE notifications n
        SET data = NULL
        FROM terminal_noti tn
        WHERE n.id = tn.id
        RETURNING n.id
        """)
        res = db.execute(sql_sensitive, {"templates": sensitive_keys, "now": now})
        cleared_sensitive_ids = [r[0] for r in res.fetchall()]
        if cleared_sensitive_ids:
            db.execute(text("""
            UPDATE notification_recipients
            SET variables = NULL
            WHERE notification_id = ANY(:ids) AND variables IS NOT NULL
            """), {"ids": cleared_sensitive_ids})
        cleared_sensitive = len(cleared_sensitive_ids)

    sql_regular = text("""
    WITH terminal_noti AS (
      SELECT n.id
      FROM notifications n
      WHERE (n.data IS NOT NULL OR EXISTS (
        SELECT 1 FROM notification_recipients r WHERE r.notification_id = n.id AND r.variables IS NOT NULL
      ))
        AND NOT EXISTS (
          SELECT 1 FROM notification_recipients r WHERE r.notification_id = n.id AND r.status IN ('pending', 'sending')
        )
        AND (
          SELECT max(COALESCE(r.finished_at, r.sent_at, r.next_attempt_at))
          FROM notification_recipients r
          WHERE r.notification_id = n.id
        ) <= :seven_days_ago
    )
    UPDATE notifications n
    SET data = NULL
    FROM terminal_noti tn
    WHERE n.id = tn.id
    RETURNING n.id
    """)
    res = db.execute(sql_regular, {"seven_days_ago": seven_days_ago})
    cleared_regular_ids = [r[0] for r in res.fetchall()]
    if cleared_regular_ids:
        db.execute(text("""
        UPDATE notification_recipients
        SET variables = NULL
        WHERE notification_id = ANY(:ids) AND variables IS NOT NULL
        """), {"ids": cleared_regular_ids})
    cleared_regular = len(cleared_regular_ids)

    sql_delete = text("""
    DELETE FROM notifications n
    WHERE n.created_at <= :ninety_days_ago
      AND NOT EXISTS (
        SELECT 1 FROM notification_recipients r WHERE r.notification_id = n.id AND r.status IN ('pending', 'sending')
      )
    RETURNING n.id
    """)
    res_del = db.execute(sql_delete, {"ninety_days_ago": ninety_days_ago})
    deleted_ids = [r[0] for r in res_del.fetchall()]
    deleted_count = len(deleted_ids)

    db.commit()
    db.expire_all()
    return {
        "cleared_sensitive": cleared_sensitive,
        "cleared_regular": cleared_regular,
        "deleted": deleted_count,
    }
