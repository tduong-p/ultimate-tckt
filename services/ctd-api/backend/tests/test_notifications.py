import pytest
from sqlalchemy import func, select

from app.models.case import Case, CaseType
from app.models.identity import Role, Unit, UnitKind, User
from app.models.notification import Outbox
from app.seeds.workflow_seed import seed_workflow
from app.services import events, notifications
from app.services.workflow import apply_action


@pytest.fixture()
def boi_canh(db):
    seed_workflow(db)
    notifications.register()
    unit = Unit(name="LCĐ Khoa CNTT", kind=UnitKind.LIEN_CHI_DOAN, email="cntt@example.edu.vn")
    tckt = Unit(name="Ban TCKT", kind=UnitKind.TCKT, email="tckt@example.edu.vn")
    db.add_all([unit, tckt])
    db.flush()
    sv = User(email="sv@sis.hust.edu.vn", full_name="Nguyễn Minh Anh", role=Role.SINH_VIEN, unit_id=unit.id)
    cb = User(email="cb@sis.hust.edu.vn", role=Role.CAN_BO_DON_VI, unit_id=unit.id)
    db.add_all([sv, cb])
    db.flush()
    case = Case(code="KN-1", applicant_id=sv.id, unit_id=unit.id, case_type=CaseType.KET_NAP, status="draft")
    db.add(case)
    db.commit()
    return {"case": case, "sv": sv, "cb": cb, "unit": unit, "tckt": tckt}


def test_chuyen_trang_thai_thi_sinh_ra_mot_dong_outbox(db, boi_canh):
    apply_action(db, boi_canh["case"], "submit", boi_canh["sv"])
    rows = db.scalars(select(Outbox)).all()
    assert len(rows) == 1
    assert rows[0].event_code == "case_submitted"
    assert rows[0].status == "pending"


def test_nguoi_nhan_lay_theo_nguoi_giu_ho_so_o_trang_thai_moi(db, boi_canh):
    apply_action(db, boi_canh["case"], "submit", boi_canh["sv"])
    # dt_checking do cán bộ đơn vị giữ → email đơn vị phải nằm trong To
    row = db.scalars(select(Outbox)).one()
    assert "cntt@example.edu.vn" in row.to_emails
    assert "sv@sis.hust.edu.vn" in row.to_emails
    # Không liên quan tới trạng thái này → không được lọt vào To.
    assert "tckt@example.edu.vn" not in row.to_emails


def test_chuyen_sang_tckt_thi_gui_toi_email_ban_tckt(db, boi_canh):
    apply_action(db, boi_canh["case"], "submit", boi_canh["sv"])
    apply_action(db, boi_canh["case"], "send_tckt", boi_canh["cb"])
    row = db.scalars(select(Outbox).order_by(Outbox.id.desc())).first()
    assert "tckt@example.edu.vn" in row.to_emails
    assert "sv@sis.hust.edu.vn" in row.to_emails
    # Đơn vị không còn giữ hồ sơ ở trạng thái này → không được có trong To.
    assert "cntt@example.edu.vn" not in row.to_emails


def test_ly_do_tra_ve_nam_trong_noi_dung_email(db, boi_canh):
    apply_action(db, boi_canh["case"], "submit", boi_canh["sv"])
    apply_action(db, boi_canh["case"], "request_supplement", boi_canh["cb"], reason="Bảng điểm kỳ 2 bị mờ.")
    row = db.scalars(select(Outbox).order_by(Outbox.id.desc())).first()
    assert "Bảng điểm kỳ 2 bị mờ." in row.body


def test_register_goi_hai_lan_khong_dang_ky_trung_handler(db, boi_canh):
    # boi_canh đã gọi register() một lần; gọi lại không được tăng số handler.
    so_luong_truoc = len(events._handlers)
    notifications.register()
    assert len(events._handlers) == so_luong_truoc


def test_buoc_khong_co_event_code_thi_khong_sinh_email(db, boi_canh):
    apply_action(db, boi_canh["case"], "submit", boi_canh["sv"])
    apply_action(db, boi_canh["case"], "send_tckt", boi_canh["cb"])
    truoc = db.scalar(select(func.count()).select_from(Outbox))
    # remove_from_meeting có event_code = None
    boi_canh["case"].status = "meeting_scheduled"
    db.commit()
    apply_action(db, boi_canh["case"], "remove_from_meeting", boi_canh["cb"], reason="Hoãn họp.")
    assert db.scalar(select(func.count()).select_from(Outbox)) == truoc
