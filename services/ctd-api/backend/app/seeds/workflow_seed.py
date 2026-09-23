from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.workflow import StatusDef, TransitionDef

# (code, label, holder_role, sla_days, is_terminal)
STATUSES = [
    ("draft", "Nháp", "sinh_vien", None, False),
    ("dt_checking", "ĐT/LCĐ đang kiểm tra", "can_bo_don_vi", 7, False),
    ("need_supplement", "Chờ sinh viên bổ sung", "sinh_vien", 2, False),
    ("tckt_checking", "Ban TCKT kiểm tra", "tckt", 5, False),
    ("eligible", "Đủ điều kiện họp xét", "can_bo_don_vi", 30, False),
    ("meeting_scheduled", "Chờ họp xét", "can_bo_don_vi", None, False),
    ("vp_checking", "VP Đoàn rà soát", "vp_doan", 10, False),
    ("forwarded", "Đã chuyển Chi bộ", None, None, True),
    ("cancelled", "Đã huỷ", None, None, True),
]

CAN_BO = ["can_bo_don_vi"]
# Mọi cấp cán bộ đều huỷ được hồ sơ; sinh viên thì không.
CAN_HUY = ["can_bo_don_vi", "tckt", "vp_doan", "quan_tri"]

# (from, action_code, to, label, allowed_roles, requires_reason, event_code)
TRANSITIONS = [
    ("draft", "submit", "dt_checking", "Gửi hồ sơ", ["sinh_vien"], False, "case_submitted"),
    ("dt_checking", "request_supplement", "need_supplement", "Yêu cầu bổ sung", CAN_BO, True, "supplement_requested"),
    ("dt_checking", "send_tckt", "tckt_checking", "Thông qua → gửi Ban TCKT", CAN_BO, False, "sent_to_tckt"),
    ("need_supplement", "resubmit", "dt_checking", "Nộp lại", ["sinh_vien"], False, "case_resubmitted"),
    ("tckt_checking", "tckt_pass", "eligible", "Đạt", ["tckt"], False, "tckt_passed"),
    ("tckt_checking", "tckt_return", "dt_checking", "Không đạt → trả đơn vị", ["tckt"], True, "tckt_returned"),
    ("eligible", "add_to_meeting", "meeting_scheduled", "Đưa vào cuộc họp", CAN_BO, False, "meeting_assigned"),
    ("meeting_scheduled", "remove_from_meeting", "eligible", "Gỡ khỏi cuộc họp", CAN_BO, True, None),
    ("meeting_scheduled", "meeting_pass", "vp_checking", "Thông qua", CAN_BO, False, "meeting_passed"),
    ("meeting_scheduled", "meeting_fail", "need_supplement", "Không thông qua → trả về", CAN_BO, True, "meeting_failed"),
    ("vp_checking", "vp_return", "dt_checking", "Trả về đơn vị", ["vp_doan"], True, "vp_returned"),
    ("vp_checking", "vp_approve", "forwarded", "Duyệt → chuyển Chi bộ", ["vp_doan"], False, "case_forwarded"),
]

# Huỷ hồ sơ: một bước logic, trải thành một dòng cho mỗi trạng thái chưa kết
# thúc — spec §5.2 ghi "mọi trạng thái chưa kết thúc", `draft` NẰM TRONG đó.
# Hồ sơ nháp bị bỏ hoang mà không huỷ được thì partial unique index vẫn giữ
# chỗ, và sinh viên chọn nhầm loại hồ sơ bị khoá vĩnh viễn.
# Sinh từ chính STATUSES thay vì chép tay: một nguồn sự thật duy nhất, thêm
# trạng thái mới là danh sách này tự đúng.
CANCELLABLE_FROM = [code for code, _, _, _, is_terminal in STATUSES if not is_terminal]
TRANSITIONS += [
    (code, "cancel", "cancelled", "Huỷ hồ sơ", CAN_HUY, True, "case_cancelled")
    for code in CANCELLABLE_FROM
]


def seed_workflow(db: Session) -> None:
    """Idempotent — chạy lại không sinh dòng trùng. Gọi lúc khởi tạo và sau mỗi deploy."""
    for order, (code, label, holder, sla, terminal) in enumerate(STATUSES):
        row = db.get(StatusDef, code)
        if row is None:
            row = StatusDef(code=code)
            db.add(row)
        row.label, row.holder_role, row.sla_days = label, holder, sla
        row.is_terminal, row.sort_order = terminal, order
    db.flush()

    for from_status, action, to_status, label, roles, needs_reason, event in TRANSITIONS:
        row = db.scalars(
            select(TransitionDef).where(
                TransitionDef.from_status == from_status, TransitionDef.action_code == action
            )
        ).first()
        if row is None:
            row = TransitionDef(from_status=from_status, action_code=action)
            db.add(row)
        row.to_status, row.label = to_status, label
        row.allowed_roles, row.requires_reason, row.event_code = roles, needs_reason, event
    db.commit()
