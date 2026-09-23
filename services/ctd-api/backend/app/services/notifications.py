from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.identity import Role, Unit, UnitKind, User
from app.models.notification import Outbox
from app.models.workflow import CaseEvent, StatusDef, TransitionDef
from app.services import events

# Quyết định của spec §7.3: KHÔNG Cc Ban TCKT vào mọi email — ~1.500 email/đợt
# sẽ tái tạo đúng vấn đề "rác email toàn ban" mà tài liệu BA phàn nàn.
# Để trống mặc định; bật lại bằng cấu hình nếu cán bộ vẫn muốn.
CC_MAC_DINH: list[str] = []


def _email_don_vi_cap_dai_hoc(db: Session, kind: UnitKind) -> list[str]:
    unit = db.scalars(select(Unit).where(Unit.kind == kind, Unit.is_active.is_(True))).first()
    return [unit.email] if unit and unit.email else []


def recipients_for(db: Session, case: Case) -> tuple[list[str], list[str]]:
    """To = người GIỮ hồ sơ ở trạng thái mới (đọc từ status_def.holder_role) + người nộp.

    Thêm một trạng thái mới vào bảng là quy tắc người nhận tự đúng, không sửa code."""
    status_def = db.get(StatusDef, case.status)
    holder = status_def.holder_role if status_def else None

    to: list[str] = []
    if holder == Role.CAN_BO_DON_VI.value and case.unit and case.unit.email:
        to.append(case.unit.email)
    elif holder == Role.TCKT.value:
        to += _email_don_vi_cap_dai_hoc(db, UnitKind.TCKT)
    elif holder == Role.VP_DOAN.value:
        to += _email_don_vi_cap_dai_hoc(db, UnitKind.VP_DOAN)

    applicant = db.get(User, case.applicant_id)
    if applicant and applicant.email:
        to.append(applicant.email)
    if holder is None and case.unit and case.unit.email:
        # Trạng thái kết thúc: báo cả đơn vị để họ biết hồ sơ đã đóng.
        to.append(case.unit.email)

    return list(dict.fromkeys(to)), list(CC_MAC_DINH)


def _soan_noi_dung(db: Session, case: Case, transition: TransitionDef) -> tuple[str, str]:
    status_def = db.get(StatusDef, case.status)
    nhan = status_def.label if status_def else case.status
    event = db.scalars(
        select(CaseEvent).where(CaseEvent.case_id == case.id).order_by(CaseEvent.id.desc())
    ).first()
    applicant = db.get(User, case.applicant_id)

    subject = f"[{case.code}] {transition.label} — {nhan}"
    dong = [
        f"Hồ sơ: {case.code}",
        f"Người nộp: {applicant.full_name if applicant else ''}",
        f"Đơn vị: {case.unit.name if case.unit else ''}",
        f"Trạng thái hiện tại: {nhan}",
    ]
    if event and event.reason:
        dong += ["", f"Lý do: {event.reason}"]
    if status_def and status_def.sla_days:
        dong += ["", f"Hạn xử lý: {status_def.sla_days} ngày."]
    return subject, "\n".join(dong)


def enqueue(db: Session, case: Case, event_code: str, transition: TransitionDef) -> None:
    to, cc = recipients_for(db, case)
    if not to:
        return
    subject, body = _soan_noi_dung(db, case, transition)
    dedup = f"{case.id}:{event_code}:{case.state_entered_at.isoformat()}"
    if db.scalars(select(Outbox).where(Outbox.dedup_key == dedup)).first() is not None:
        return
    db.add(
        Outbox(
            case_id=case.id,
            to_emails=",".join(to),
            cc_emails=",".join(cc),
            subject=subject,
            body=body,
            event_code=event_code,
            dedup_key=dedup,
        )
    )
    db.flush()


def register() -> None:
    """Gọi một lần lúc khởi động app. Đây là chỗ `notification` NGHE sự kiện —
    module `workflow` không hề biết `notification` tồn tại.

    Truyền thẳng `enqueue` (không bọc lambda): `events.subscribe` chống đăng ký
    trùng bằng so sánh định danh handler — một lambda mới tạo ra mỗi lần gọi
    sẽ không bao giờ khớp lambda cũ, nên cơ chế chống trùng sẽ vô tác dụng."""
    events.subscribe(enqueue)
