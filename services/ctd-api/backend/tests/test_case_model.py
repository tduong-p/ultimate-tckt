import pytest
from sqlalchemy.exc import IntegrityError

from app.models.case import Case, CaseType
from app.models.identity import Role, Unit, UnitKind, User
from app.seeds.workflow_seed import seed_workflow


@pytest.fixture()
def sinh_vien_va_don_vi(db):
    seed_workflow(db)
    unit = Unit(name="LCĐ Khoa CNTT", kind=UnitKind.LIEN_CHI_DOAN)
    db.add(unit)
    db.flush()
    user = User(email="sv@sis.hust.edu.vn", role=Role.SINH_VIEN, unit_id=unit.id)
    db.add(user)
    db.commit()
    return user, unit


def test_khong_nop_duoc_ho_so_thu_hai_khi_con_ho_so_dang_chay(db, sinh_vien_va_don_vi):
    user, unit = sinh_vien_va_don_vi
    db.add(Case(code="KN-1", applicant_id=user.id, unit_id=unit.id, case_type=CaseType.KET_NAP, status="dt_checking"))
    db.commit()

    db.add(Case(code="KN-2", applicant_id=user.id, unit_id=unit.id, case_type=CaseType.KET_NAP, status="draft"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_nop_lai_duoc_sau_khi_ho_so_cu_da_ket_thuc(db, sinh_vien_va_don_vi):
    user, unit = sinh_vien_va_don_vi
    db.add(Case(code="KN-1", applicant_id=user.id, unit_id=unit.id, case_type=CaseType.KET_NAP, status="forwarded"))
    db.commit()

    db.add(Case(code="KN-2", applicant_id=user.id, unit_id=unit.id, case_type=CaseType.KET_NAP, status="draft"))
    db.commit()  # không được lỗi


def test_ho_so_da_huy_cung_giai_phong_rang_buoc(db, sinh_vien_va_don_vi):
    user, unit = sinh_vien_va_don_vi
    db.add(Case(code="KN-1", applicant_id=user.id, unit_id=unit.id, case_type=CaseType.KET_NAP, status="cancelled"))
    db.commit()

    db.add(Case(code="KN-2", applicant_id=user.id, unit_id=unit.id, case_type=CaseType.KET_NAP, status="draft"))
    db.commit()


def test_khong_gan_duoc_trang_thai_khong_ton_tai(db, sinh_vien_va_don_vi):
    user, unit = sinh_vien_va_don_vi
    db.add(Case(code="KN-X", applicant_id=user.id, unit_id=unit.id, case_type=CaseType.KET_NAP, status="trang_thai_ma"))
    with pytest.raises(IntegrityError):
        db.commit()
