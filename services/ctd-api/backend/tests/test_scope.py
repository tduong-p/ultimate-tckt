import pytest

from app.models.case import Case, CaseType, DRAFT_STATUS
from app.models.identity import Role, Unit, UnitKind, User
from app.seeds.workflow_seed import seed_workflow
from app.services.scope import visible_cases


@pytest.fixture()
def hai_don_vi(db):
    seed_workflow(db)
    cntt = Unit(name="LCĐ Khoa CNTT", kind=UnitKind.LIEN_CHI_DOAN)
    dien = Unit(name="Đoàn trường Điện", kind=UnitKind.DOAN_TRUONG)
    db.add_all([cntt, dien])
    db.flush()
    sv_cntt = User(email="a@sis.hust.edu.vn", role=Role.SINH_VIEN, unit_id=cntt.id)
    sv_cntt_2 = User(email="c@sis.hust.edu.vn", role=Role.SINH_VIEN, unit_id=cntt.id)
    # Sinh viên riêng cho hồ sơ draft — để tách bạch với A1/A2, không ảnh
    # hưởng tới ràng buộc "một hồ sơ đang chạy" của các sinh viên khác.
    sv_cntt_3 = User(email="d@sis.hust.edu.vn", role=Role.SINH_VIEN, unit_id=cntt.id)
    sv_dien = User(email="b@sis.hust.edu.vn", role=Role.SINH_VIEN, unit_id=dien.id)
    db.add_all([sv_cntt, sv_cntt_2, sv_cntt_3, sv_dien])
    db.flush()
    db.add_all([
        Case(code="A1", applicant_id=sv_cntt.id, unit_id=cntt.id, case_type=CaseType.KET_NAP, status="dt_checking"),
        Case(code="A2", applicant_id=sv_cntt_2.id, unit_id=cntt.id, case_type=CaseType.KET_NAP, status="dt_checking"),
        # Hồ sơ chưa gửi — phải KHÔNG xuất hiện trong tầm nhìn của bất kỳ ai
        # ngoài chính sv_cntt_3 (và quản trị viên).
        Case(code="A3", applicant_id=sv_cntt_3.id, unit_id=cntt.id, case_type=CaseType.KET_NAP, status=DRAFT_STATUS),
        Case(code="B1", applicant_id=sv_dien.id, unit_id=dien.id, case_type=CaseType.KET_NAP, status="forwarded"),
    ])
    db.commit()
    return {"cntt": cntt, "dien": dien, "sv_cntt": sv_cntt, "sv_cntt_3": sv_cntt_3, "sv_dien": sv_dien}


def test_sinh_vien_chi_thay_ho_so_cua_minh(db, hai_don_vi):
    codes = {c.code for c in db.scalars(visible_cases(db, hai_don_vi["sv_cntt"]))}
    assert codes == {"A1"}


def test_sinh_vien_thay_ho_so_draft_cua_chinh_minh(db, hai_don_vi):
    codes = {c.code for c in db.scalars(visible_cases(db, hai_don_vi["sv_cntt_3"]))}
    assert codes == {"A3"}


def test_can_bo_chi_thay_ho_so_dung_don_vi_minh(db, hai_don_vi):
    can_bo = User(email="cb@sis.hust.edu.vn", role=Role.CAN_BO_DON_VI, unit_id=hai_don_vi["cntt"].id)
    db.add(can_bo)
    db.commit()
    codes = {c.code for c in db.scalars(visible_cases(db, can_bo))}
    # A3 (draft) cùng đơn vị nhưng chưa gửi — cán bộ không được thấy.
    assert codes == {"A1", "A2"}


def test_tckt_va_vp_doan_thay_toan_truong_tru_ho_so_draft(db, hai_don_vi):
    for role in (Role.TCKT, Role.VP_DOAN):
        user = User(email=f"{role.value}@sis.hust.edu.vn", role=role)
        db.add(user)
        db.commit()
        codes = {c.code for c in db.scalars(visible_cases(db, user))}
        # A3 (draft) không thuộc tầm nhìn của TCKT/VP Đoàn — hồ sơ chưa gửi.
        assert codes == {"A1", "A2", "B1"}, role


def test_chi_bo_chi_thay_ho_so_da_chuyen_den(db, hai_don_vi):
    chi_bo = User(email="cb0@sis.hust.edu.vn", role=Role.CHI_BO)
    db.add(chi_bo)
    db.commit()
    codes = {c.code for c in db.scalars(visible_cases(db, chi_bo))}
    assert codes == {"B1"}


def test_quan_tri_thay_ca_ho_so_draft(db, hai_don_vi):
    quan_tri = User(email="qt@sis.hust.edu.vn", role=Role.QUAN_TRI)
    db.add(quan_tri)
    db.commit()
    codes = {c.code for c in db.scalars(visible_cases(db, quan_tri))}
    assert codes == {"A1", "A2", "A3", "B1"}
