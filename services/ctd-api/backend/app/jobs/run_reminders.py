import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.notification import Outbox
from app.models.workflow import StatusDef
from app.services.notifications import recipients_for

logger = logging.getLogger(__name__)

# Nhắc lại sau mỗi chừng này ngày nếu hồ sơ vẫn chưa nhúc nhích.
REPEAT_DAYS = 3


def run(db: Session) -> int:
    """Quét hồ sơ quá hạn theo SLA của CHÍNH TRẠNG THÁI nó đang ở —
    không có con số ngày nào viết cứng trong hàm này."""
    now = datetime.now(timezone.utc)
    sla_theo_trang_thai = {
        s.code: s.sla_days
        for s in db.scalars(select(StatusDef).where(StatusDef.is_terminal.is_(False)))
        if s.sla_days is not None
    }
    if not sla_theo_trang_thai:
        return 0

    cases = db.scalars(select(Case).where(Case.status.in_(sla_theo_trang_thai.keys()))).all()
    da_tao = 0
    for case in cases:
        han = sla_theo_trang_thai[case.status]
        if now - case.state_entered_at < timedelta(days=han):
            continue
        if case.last_reminded_at and now - case.last_reminded_at < timedelta(days=REPEAT_DAYS):
            continue

        to, cc = recipients_for(db, case)
        if not to:
            continue
        so_ngay = (now - case.state_entered_at).days
        dedup = f"{case.id}:overdue_reminder:{now.date().isoformat()}"
        if db.scalars(select(Outbox).where(Outbox.dedup_key == dedup)).first() is not None:
            continue
        db.add(
            Outbox(
                case_id=case.id,
                to_emails=",".join(to),
                cc_emails=",".join(cc),
                subject=f"[{case.code}] Hồ sơ quá hạn xử lý {so_ngay} ngày",
                body=(
                    f"Hồ sơ {case.code} đã ở trạng thái hiện tại {so_ngay} ngày, "
                    f"vượt hạn {han} ngày. Đề nghị xử lý sớm."
                ),
                event_code="overdue_reminder",
                dedup_key=dedup,
            )
        )
        case.last_reminded_at = now
        da_tao += 1

    try:
        db.commit()
    except IntegrityError:
        # Cron chạy chồng: một tiến trình khác đã tạo đúng dòng nhắc này (cùng
        # dedup_key) giữa lúc job này kiểm tra và lúc job này commit. Constraint
        # UNIQUE ở tầng DB đã làm đúng việc của nó — coi như "đã có người nhắc
        # rồi", không phải lỗi, không được để ném ra ngoài làm job chết giữa vòng lặp.
        db.rollback()
        logger.info("run_reminders: bỏ qua do trùng dedup_key (cron chạy chồng)")
        return 0
    return da_tao
