import pytest
from sqlalchemy import func, select

from app.errors import BusinessError, PermissionDenied
from app.models.case import Case, CaseType
from app.models.document import DocStatus, Document, DocumentType
from app.models.identity import Role, Unit, UnitKind, User
from app.seeds.catalog_seed import seed_catalog
from app.seeds.workflow_seed import seed_workflow
from app.services.documents import add_adhoc, mark_verdict, missing_required, snapshot_for_case


@pytest.fixture()
def ho_so(db):
    seed_workflow(db)
    seed_catalog(db)
    unit = Unit(name="LCĐ Khoa CNTT", kind=UnitKind.LIEN_CHI_DOAN)
    db.add(unit)
    db.flush()
    sv = User(email="sv@sis.hust.edu.vn", role=Role.SINH_VIEN, unit_id=unit.id)
    cb = User(email="cb@sis.hust.edu.vn", role=Role.CAN_BO_DON_VI, unit_id=unit.id)
    db.add_all([sv, cb])
    db.flush()
    case = Case(code="KN-1", applicant_id=sv.id, unit_id=unit.id, case_type=CaseType.KET_NAP, status="draft")
    db.add(case)
    db.commit()
    return {"case": case, "sv": sv, "cb": cb, "unit": unit}


def test_tao_ho_so_thi_chep_danh_muc_thanh_cac_dong_chua_nop(db, ho_so):
    docs = snapshot_for_case(db, ho_so["case"])
    assert len(docs) == 7
    assert all(d.status == DocStatus.MISSING for d in docs)
    assert all(d.storage_key == "" for d in docs)


def test_them_dau_muc_moi_vao_danh_muc_khong_anh_huong_ho_so_dang_chay(db, ho_so):
    snapshot_for_case(db, ho_so["case"])
    db.add(DocumentType(
        code="xac_nhan_moi", name="Giấy xác nhận mới", applies_to=["ket_nap"],
        is_required=True, sort_order=99,
    ))
    db.commit()
    # Đếm trực tiếp từ DB — không đọc collection Python đã cache, để chứng minh
    # đúng quy tắc nghiệp vụ (không có dòng document mới nào được ghi xuống DB),
    # không chỉ chứng minh "object đang cầm trên tay không bị append thêm".
    so_dong = db.scalar(
        select(func.count()).select_from(Document).where(Document.case_id == ho_so["case"].id)
    )
    assert so_dong == 7  # vẫn 7, không tự mọc thêm


def test_ho_so_tao_sau_khi_sua_danh_muc_thi_co_dau_muc_moi(db, ho_so):
    db.add(DocumentType(
        code="xac_nhan_moi", name="Giấy xác nhận mới", applies_to=["ket_nap"],
        is_required=True, sort_order=99,
    ))
    db.commit()
    sv2 = User(email="sv2@sis.hust.edu.vn", role=Role.SINH_VIEN, unit_id=ho_so["unit"].id)
    db.add(sv2)
    db.flush()
    case2 = Case(code="KN-2", applicant_id=sv2.id, unit_id=ho_so["unit"].id,
                 case_type=CaseType.KET_NAP, status="draft")
    db.add(case2)
    db.commit()
    assert len(snapshot_for_case(db, case2)) == 8


def test_can_bo_them_duoc_dau_muc_phat_sinh_cho_rieng_mot_ho_so(db, ho_so):
    snapshot_for_case(db, ho_so["case"])
    doc = add_adhoc(db, ho_so["case"], "Xác nhận quá trình học tại ĐH Xây dựng", ho_so["cb"])
    assert doc.is_adhoc is True
    assert doc.document_type_id is None
    assert len(ho_so["case"].documents) == 8


def test_sinh_vien_khong_duoc_them_dau_muc(db, ho_so):
    snapshot_for_case(db, ho_so["case"])
    with pytest.raises(PermissionDenied):
        add_adhoc(db, ho_so["case"], "Giấy tự chế", ho_so["sv"])


def test_goi_snapshot_lan_hai_khong_chup_de(db, ho_so):
    snapshot_for_case(db, ho_so["case"])
    snapshot_for_case(db, ho_so["case"])
    so_dong = db.scalar(
        select(func.count()).select_from(Document).where(Document.case_id == ho_so["case"].id)
    )
    assert so_dong == 7


def test_danh_dau_khong_dat_bat_buoc_co_ly_do(db, ho_so):
    docs = snapshot_for_case(db, ho_so["case"])
    with pytest.raises(BusinessError):
        mark_verdict(db, docs[0], DocStatus.REJECTED, "", ho_so["cb"])


def test_danh_dau_dat_va_khong_dat_ghi_lai_ly_do(db, ho_so):
    docs = snapshot_for_case(db, ho_so["case"])
    mark_verdict(db, docs[0], DocStatus.ACCEPTED, "", ho_so["cb"])
    mark_verdict(db, docs[1], DocStatus.REJECTED, "Ảnh mờ, không đọc được MSSV.", ho_so["cb"])
    assert docs[0].status == DocStatus.ACCEPTED
    assert docs[1].reason == "Ảnh mờ, không đọc được MSSV."


def test_liet_ke_giay_to_bat_buoc_con_thieu(db, ho_so):
    docs = snapshot_for_case(db, ho_so["case"])
    for doc in docs:
        doc.status = DocStatus.SUBMITTED
    docs[0].status = DocStatus.MISSING
    db.commit()
    thieu = missing_required(db, ho_so["case"])
    assert [d.id for d in thieu] == [docs[0].id]


def test_muc_cho_phep_khong_ap_dung_thi_khong_tinh_la_thieu(db, ho_so):
    docs = snapshot_for_case(db, ho_so["case"])
    for doc in docs:
        doc.status = DocStatus.SUBMITTED
    bang_diem_ky2 = next(d for d in docs if d.name == "Bảng điểm học kỳ 2")
    bang_diem_ky2.status = DocStatus.NOT_APPLICABLE
    bang_diem_ky2.reason = "Sinh viên năm thứ nhất chưa có bảng điểm kỳ 2."
    db.commit()
    assert missing_required(db, ho_so["case"]) == []
