"""Chốt kiểm quyền dùng chung cho mọi thao tác ĐỔI NỘI DUNG hồ sơ.

Trước bản sửa này, mỗi hàm trong `services/documents.py` và `case_detail.py`
tự kiểm quyền theo kiểu riêng, luôn dưới dạng `if user.role == SINH_VIEN:`
không có `else` — nghĩa là mọi vai trò khác lọt hết. File test này khẳng định
hành vi ĐÚNG cho cả năm thao tác, theo cùng một bảng luật.
"""

import pytest

from app.errors import BusinessError, PermissionDenied
from app.models.case import Case, CaseType
from app.models.document import DocStatus
from app.models.identity import Role, Unit, UnitKind, User
from app.seeds.catalog_seed import seed_catalog
from app.seeds.workflow_seed import seed_workflow
from app.services import case_detail as detail_service
from app.services import documents as doc_service


@pytest.fixture()
def boi_canh(db):
    seed_workflow(db)
    seed_catalog(db)
    unit = Unit(name="LCĐ Khoa CNTT", kind=UnitKind.LIEN_CHI_DOAN)
    db.add(unit)
    db.flush()
    sv = User(email="sv@sis.hust.edu.vn", role=Role.SINH_VIEN, unit_id=unit.id)
    cb = User(email="cb@sis.hust.edu.vn", role=Role.CAN_BO_DON_VI, unit_id=unit.id)
    tckt = User(email="tckt@sis.hust.edu.vn", role=Role.TCKT, unit_id=unit.id)
    vp = User(email="vp@sis.hust.edu.vn", role=Role.VP_DOAN, unit_id=unit.id)
    qt = User(email="qt@sis.hust.edu.vn", role=Role.QUAN_TRI, unit_id=unit.id)
    db.add_all([sv, cb, tckt, vp, qt])
    db.flush()
    case = Case(code="KN-1", applicant_id=sv.id, unit_id=unit.id,
                case_type=CaseType.KET_NAP, status="draft")
    db.add(case)
    db.commit()
    docs = doc_service.snapshot_for_case(db, case)
    return {"case": case, "sv": sv, "cb": cb, "tckt": tckt, "vp": vp, "qt": qt, "docs": docs}


def _doi_trang_thai(db, case: Case, status: str) -> None:
    case.status = status
    db.add(case)
    db.commit()


def _file(db, doc, user):
    return doc_service.attach_file(db, doc, "don.pdf", "application/pdf", b"%PDF-1.4 x", user)


# --- Mục 1: attach_file chỉ dành cho chủ hồ sơ (và quản trị) ---------------

@pytest.mark.parametrize("vai_tro", ["cb", "tckt", "vp"])
def test_can_bo_khong_duoc_dinh_file_thay_sinh_vien(db, boi_canh, vai_tro):
    _doi_trang_thai(db, boi_canh["case"], "dt_checking")
    with pytest.raises(PermissionDenied):
        _file(db, boi_canh["docs"][0], boi_canh[vai_tro])


def test_chu_ho_so_van_dinh_file_duoc(db, boi_canh):
    doc = _file(db, boi_canh["docs"][0], boi_canh["sv"])
    assert doc.status == DocStatus.SUBMITTED


def test_sinh_vien_khac_khong_dinh_file_vao_ho_so_nguoi_ta(db, boi_canh):
    khac = User(email="sv9@sis.hust.edu.vn", role=Role.SINH_VIEN,
                unit_id=boi_canh["case"].unit_id)
    db.add(khac)
    db.commit()
    with pytest.raises(PermissionDenied):
        _file(db, boi_canh["docs"][0], khac)


# --- Mục 2: update_detail chỉ dành cho chủ hồ sơ (và quản trị) -------------

@pytest.mark.parametrize("vai_tro", ["cb", "tckt", "vp"])
def test_can_bo_khong_duoc_sua_thong_tin_khai_cua_sinh_vien(db, boi_canh, vai_tro):
    with pytest.raises(PermissionDenied):
        detail_service.update_detail(
            db, boi_canh["case"], {"citizen_id": "001204012345"}, boi_canh[vai_tro]
        )


def test_chu_ho_so_van_sua_duoc_thong_tin(db, boi_canh):
    detail = detail_service.update_detail(
        db, boi_canh["case"], {"citizen_id": "001204012345"}, boi_canh["sv"]
    )
    assert detail.citizen_id == "001204012345"


# --- Mục 4: hồ sơ đã kết thúc thì không ai đổi nội dung, kể cả quản trị ----

@pytest.mark.parametrize("trang_thai", ["forwarded", "cancelled"])
def test_khong_them_dau_muc_vao_ho_so_da_ket_thuc(db, boi_canh, trang_thai):
    _doi_trang_thai(db, boi_canh["case"], trang_thai)
    with pytest.raises(BusinessError):
        doc_service.add_adhoc(db, boi_canh["case"], "Giấy bổ sung", boi_canh["cb"])


def test_khong_danh_gia_giay_to_cua_ho_so_da_ket_thuc(db, boi_canh):
    _doi_trang_thai(db, boi_canh["case"], "forwarded")
    with pytest.raises(BusinessError):
        doc_service.mark_verdict(
            db, boi_canh["docs"][0], DocStatus.REJECTED, "Ảnh mờ.", boi_canh["cb"]
        )


def test_quan_tri_cung_khong_khai_khong_ap_dung_tren_ho_so_da_ket_thuc(db, boi_canh):
    _doi_trang_thai(db, boi_canh["case"], "forwarded")
    duoc_phep = next(d for d in boi_canh["docs"] if d.allow_not_applicable)
    with pytest.raises(BusinessError):
        doc_service.mark_not_applicable(db, duoc_phep, "Chưa có bảng điểm.", boi_canh["qt"])


def test_quan_tri_cung_khong_sua_thong_tin_ho_so_da_ket_thuc(db, boi_canh):
    _doi_trang_thai(db, boi_canh["case"], "cancelled")
    with pytest.raises(BusinessError):
        detail_service.update_detail(
            db, boi_canh["case"], {"citizen_id": "001204012345"}, boi_canh["qt"]
        )


def test_quan_tri_van_ho_tro_duoc_khi_ho_so_con_trong_tay_nguoi_nop(db, boi_canh):
    duoc_phep = next(d for d in boi_canh["docs"] if d.allow_not_applicable)
    doc = doc_service.mark_not_applicable(db, duoc_phep, "Chưa có bảng điểm.", boi_canh["qt"])
    assert doc.status == DocStatus.NOT_APPLICABLE
