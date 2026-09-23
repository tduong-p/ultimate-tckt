import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infra.mailer import get_mailer
from app.models.notification import Outbox

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 5


def run(db: Session) -> int:
    """Đẩy các dòng đang chờ. Mỗi người nhận là một dòng riêng nên một dòng lỗi
    không kéo theo dòng khác — đúng yêu cầu 'gửi lại cho người bị lỗi' của BA."""
    mailer = get_mailer()
    rows = db.scalars(
        select(Outbox).where(Outbox.status == "pending", Outbox.attempts < MAX_ATTEMPTS).limit(200)
    ).all()

    da_gui = 0
    for row in rows:
        row.attempts += 1
        try:
            mailer.send(
                to=[e for e in row.to_emails.split(",") if e],
                cc=[e for e in row.cc_emails.split(",") if e],
                subject=row.subject,
                body=row.body,
            )
        except Exception as exc:  # noqa: BLE001 — ghi lỗi để cán bộ bấm gửi lại
            row.status = "failed" if row.attempts >= MAX_ATTEMPTS else "pending"
            row.error = str(exc)[:1000]
            # Ghi log hệ thống — nếu chỉ lưu vào cột `error` thì lỗi lập trình
            # (vd. AttributeError) sẽ bị cron nuốt vĩnh viễn, không ai thấy.
            logger.exception("send_outbox: lỗi gửi outbox id=%s loại=%s", row.id, type(exc).__name__)
        else:
            row.status = "sent"
            row.sent_at = datetime.now(timezone.utc)
            row.error = ""
            da_gui += 1
    db.commit()
    return da_gui
