from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.infra.mailer import ConsoleMailer
from app.jobs import run_reminders, send_outbox
from app.models.case import Case, CaseType
from app.models.identity import Role, Unit, UnitKind, User
from app.models.notification import Outbox
from app.seeds.workflow_seed import seed_workflow
from app.services import notifications
from app.services.workflow import apply_action
from tests.conftest import TestSession


@pytest.fixture()
def boi_canh(db):
    seed_workflow(db)
    notifications.register()
    ConsoleMailer.sent.clear()
    unit = Unit(name="LCĐ Khoa CNTT", kind=UnitKind.LIEN_CHI_DOAN, email="cntt@example.edu.vn")
    db.add(unit)
    db.flush()
    sv = User(email="sv@sis.hust.edu.vn", role=Role.SINH_VIEN, unit_id=unit.id)
    db.add(sv)
    db.flush()
    case = Case(code="KN-1", applicant_id=sv.id, unit_id=unit.id, case_type=CaseType.KET_NAP, status="draft")
    db.add(case)
    db.commit()
    return {"case": case, "sv": sv, "unit": unit}


def test_send_outbox_gui_va_danh_dau_da_gui(db, boi_canh):
    apply_action(db, boi_canh["case"], "submit", boi_canh["sv"])
    assert send_outbox.run(db) == 1
    row = db.scalars(select(Outbox)).one()
    assert row.status == "sent"
    assert row.sent_at is not None
    assert len(ConsoleMailer.sent) == 1


def test_send_outbox_khong_gui_lai_dong_da_gui(db, boi_canh):
    apply_action(db, boi_canh["case"], "submit", boi_canh["sv"])
    send_outbox.run(db)
    assert send_outbox.run(db) == 0


def test_nhac_ho_so_qua_han_theo_sla_cua_trang_thai(db, boi_canh):
    apply_action(db, boi_canh["case"], "submit", boi_canh["sv"])  # → dt_checking, SLA 7 ngày
    db.query(Outbox).delete()
    boi_canh["case"].state_entered_at = datetime.now(timezone.utc) - timedelta(days=8)
    db.commit()

    assert run_reminders.run(db) == 1
    row = db.scalars(select(Outbox).where(Outbox.event_code == "overdue_reminder")).one()
    assert "cntt@example.edu.vn" in row.to_emails


def test_khong_nhac_ho_so_chua_qua_han(db, boi_canh):
    apply_action(db, boi_canh["case"], "submit", boi_canh["sv"])
    db.query(Outbox).delete()
    boi_canh["case"].state_entered_at = datetime.now(timezone.utc) - timedelta(days=2)
    db.commit()
    assert run_reminders.run(db) == 0


def test_khong_nhac_don_hai_lan_trong_cung_ngay(db, boi_canh):
    """Gọi run_reminders hai lần liên tiếp trong cùng ngày — dedup_key (khoá theo
    ngày) phải chặn lần thứ hai. Đây là test cho cơ chế dedup_key, KHÔNG phải
    cho REPEAT_DAYS — xem hai test bên dưới để chứng minh riêng REPEAT_DAYS."""
    apply_action(db, boi_canh["case"], "submit", boi_canh["sv"])
    db.query(Outbox).delete()
    boi_canh["case"].state_entered_at = datetime.now(timezone.utc) - timedelta(days=8)
    db.commit()
    run_reminders.run(db)
    assert run_reminders.run(db) == 0


def test_khong_nhac_lai_trong_chu_ky_repeat_days(db, boi_canh):
    """Cô lập riêng REPEAT_DAYS: last_reminded_at là hôm qua nên dedup_key hôm
    nay CHƯA tồn tại (không có dòng Outbox nào cả) — nếu vẫn trả 0, nguyên
    nhân duy nhất có thể là khối kiểm REPEAT_DAYS, không phải dedup_key."""
    apply_action(db, boi_canh["case"], "submit", boi_canh["sv"])
    db.query(Outbox).delete()
    now = datetime.now(timezone.utc)
    boi_canh["case"].state_entered_at = now - timedelta(days=8)
    boi_canh["case"].last_reminded_at = now - timedelta(days=1)
    db.commit()
    assert run_reminders.run(db) == 0


def test_nhac_lai_sau_khi_qua_chu_ky_repeat_days(db, boi_canh):
    """Đối chứng của test trên: last_reminded_at vượt REPEAT_DAYS (4 > 3 ngày)
    nên phải nhắc lại — nếu test trên đỏ mà xoá hẳn khối kiểm REPEAT_DAYS,
    test này chứng minh khối kiểm đó thật sự có tác dụng, không phải chỉ vô hại."""
    apply_action(db, boi_canh["case"], "submit", boi_canh["sv"])
    db.query(Outbox).delete()
    now = datetime.now(timezone.utc)
    boi_canh["case"].state_entered_at = now - timedelta(days=8)
    boi_canh["case"].last_reminded_at = now - timedelta(days=4)
    db.commit()
    assert run_reminders.run(db) == 1


def test_khong_nhac_ho_so_da_ket_thuc(db, boi_canh):
    boi_canh["case"].status = "forwarded"
    boi_canh["case"].state_entered_at = datetime.now(timezone.utc) - timedelta(days=100)
    db.commit()
    assert run_reminders.run(db) == 0


def test_run_reminders_khong_crash_khi_cron_chay_chong(db, boi_canh):
    """Mô phỏng hai tiến trình cron chạy chồng: ngay TRƯỚC khi job này commit,
    một 'tiến trình khác' (phiên DB độc lập) đã chèn VÀ commit thành công đúng
    dòng Outbox với cùng dedup_key. Lúc đó dedup_key đã tồn tại ở DB nhưng job
    này không hề biết (đã kiểm tra trước đó, lúc chưa có) — commit của job này
    phải va UNIQUE constraint. Job phải bắt lỗi đó, coi như 'đã có người nhắc
    rồi', rollback êm và trả 0 — KHÔNG được ném ngoại lệ ra ngoài."""
    apply_action(db, boi_canh["case"], "submit", boi_canh["sv"])
    db.query(Outbox).delete()
    now = datetime.now(timezone.utc)
    boi_canh["case"].state_entered_at = now - timedelta(days=8)
    db.commit()

    dedup = f"{boi_canh['case'].id}:overdue_reminder:{now.date().isoformat()}"
    da_chen = {"xong": False}

    def chen_boi_tien_trinh_khac(session):
        if da_chen["xong"]:
            return
        da_chen["xong"] = True
        phien_khac = TestSession()
        try:
            phien_khac.add(
                Outbox(
                    case_id=boi_canh["case"].id,
                    to_emails="ai_do_khac@example.edu.vn",
                    cc_emails="",
                    subject="nhắc từ tiến trình khác",
                    body="nội dung",
                    event_code="overdue_reminder",
                    dedup_key=dedup,
                )
            )
            phien_khac.commit()
        finally:
            phien_khac.close()

    from sqlalchemy import event

    event.listen(db, "before_commit", chen_boi_tien_trinh_khac)
    try:
        assert run_reminders.run(db) == 0
    finally:
        event.remove(db, "before_commit", chen_boi_tien_trinh_khac)

    # Đúng một dòng nhắc cho hồ sơ này — của "tiến trình khác", không nhân đôi.
    rows = db.scalars(
        select(Outbox).where(Outbox.case_id == boi_canh["case"].id, Outbox.event_code == "overdue_reminder")
    ).all()
    assert len(rows) == 1
