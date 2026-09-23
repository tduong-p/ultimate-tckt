import pytest

from app.errors import InvalidTransition, PermissionDenied, ReasonRequired
from app.models.case import Case, CaseType
from app.models.identity import Role, Unit, UnitKind, User
from app.models.workflow import CaseEvent
from app.seeds.workflow_seed import seed_workflow
from app.services.workflow import apply_action, available_actions


@pytest.fixture()
def moi_truong(db):
    seed_workflow(db)
    cntt = Unit(name="LCĐ Khoa CNTT", kind=UnitKind.LIEN_CHI_DOAN, email="cntt@example.edu.vn")
    dien = Unit(name="LCĐ Khoa Điện", kind=UnitKind.LIEN_CHI_DOAN, email="dien@example.edu.vn")
    db.add_all([cntt, dien])
    db.flush()
    sv = User(email="sv@sis.hust.edu.vn", full_name="Nguyễn Minh Anh", role=Role.SINH_VIEN, unit_id=cntt.id)
    cb_cntt = User(email="cb1@sis.hust.edu.vn", role=Role.CAN_BO_DON_VI, unit_id=cntt.id)
    cb_dien = User(email="cb2@sis.hust.edu.vn", role=Role.CAN_BO_DON_VI, unit_id=dien.id)
    tckt = User(email="tckt@sis.hust.edu.vn", role=Role.TCKT)
    vp = User(email="vp@sis.hust.edu.vn", role=Role.VP_DOAN)
    db.add_all([sv, cb_cntt, cb_dien, tckt, vp])
    db.flush()
    case = Case(code="KN-2026-0184", applicant_id=sv.id, unit_id=cntt.id, case_type=CaseType.KET_NAP, status="draft")
    db.add(case)
    db.commit()
    return {"case": case, "sv": sv, "cb_cntt": cb_cntt, "cb_dien": cb_dien, "tckt": tckt, "vp": vp}


def test_ho_so_di_tron_ven_tu_nop_den_chuyen_chi_bo(db, moi_truong):
    m = moi_truong
    case = m["case"]

    apply_action(db, case, "submit", m["sv"])
    assert case.status == "dt_checking"

    apply_action(db, case, "send_tckt", m["cb_cntt"])
    assert case.status == "tckt_checking"

    apply_action(db, case, "tckt_pass", m["tckt"])
    assert case.status == "eligible"

    apply_action(db, case, "add_to_meeting", m["cb_cntt"])
    assert case.status == "meeting_scheduled"

    apply_action(db, case, "meeting_pass", m["cb_cntt"])
    assert case.status == "vp_checking"

    apply_action(db, case, "vp_approve", m["vp"])
    assert case.status == "forwarded"

    events = db.query(CaseEvent).filter_by(case_id=case.id).all()
    assert len(events) == 6
    assert [e.action_code for e in events][-1] == "vp_approve"


def test_can_bo_don_vi_khac_khong_duoc_dung_vao(db, moi_truong):
    m = moi_truong
    apply_action(db, m["case"], "submit", m["sv"])
    with pytest.raises(PermissionDenied):
        apply_action(db, m["case"], "send_tckt", m["cb_dien"])


def test_khong_ai_duoc_duyet_ho_so_cua_chinh_minh(db, moi_truong):
    """Cán bộ Đoàn cũng có thể là người xin vào Đảng — phải chặn."""
    m = moi_truong
    m["sv"].role = Role.CAN_BO_DON_VI
    db.commit()
    m["case"].status = "dt_checking"
    db.commit()
    with pytest.raises(PermissionDenied):
        apply_action(db, m["case"], "send_tckt", m["sv"])


def test_tra_ve_ma_khong_nhap_ly_do_thi_bi_chan(db, moi_truong):
    m = moi_truong
    apply_action(db, m["case"], "submit", m["sv"])
    with pytest.raises(ReasonRequired):
        apply_action(db, m["case"], "request_supplement", m["cb_cntt"], reason="   ")


def test_nhay_trang_thai_khong_hop_le_bi_chan(db, moi_truong):
    m = moi_truong
    with pytest.raises(InvalidTransition):
        apply_action(db, m["case"], "vp_approve", m["vp"])


def test_ly_do_tra_ve_duoc_ghi_vao_nhat_ky(db, moi_truong):
    m = moi_truong
    apply_action(db, m["case"], "submit", m["sv"])
    apply_action(db, m["case"], "request_supplement", m["cb_cntt"], reason="Bảng điểm kỳ 2 bị mờ.")
    event = db.query(CaseEvent).filter_by(case_id=m["case"].id).order_by(CaseEvent.id.desc()).first()
    assert event.reason == "Bảng điểm kỳ 2 bị mờ."
    assert event.actor_role == "can_bo_don_vi"


def test_available_actions_chi_tra_ve_viec_nguoi_do_lam_duoc(db, moi_truong):
    m = moi_truong
    apply_action(db, m["case"], "submit", m["sv"])
    codes = {t.action_code for t in available_actions(db, m["case"], m["cb_cntt"])}
    assert codes == {"request_supplement", "send_tckt", "cancel"}
    assert available_actions(db, m["case"], m["sv"]) == []


def test_huy_ho_so_giu_nguyen_du_lieu(db, moi_truong):
    m = moi_truong
    apply_action(db, m["case"], "submit", m["sv"])
    apply_action(db, m["case"], "cancel", m["cb_cntt"], reason="Sinh viên đã tốt nghiệp.")
    assert m["case"].status == "cancelled"
    assert db.get(Case, m["case"].id) is not None
    assert db.query(CaseEvent).filter_by(case_id=m["case"].id).count() == 2


def test_moc_thoi_gian_vao_trang_thai_duoc_cap_nhat(db, moi_truong):
    m = moi_truong
    truoc = m["case"].state_entered_at
    apply_action(db, m["case"], "submit", m["sv"])
    assert m["case"].state_entered_at > truoc
    assert m["case"].last_reminded_at is None
