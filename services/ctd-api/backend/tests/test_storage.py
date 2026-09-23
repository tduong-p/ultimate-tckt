import time

import pytest

from app.config import settings
from app.errors import BusinessError, PermissionDenied
from app.infra.storage import LocalStorage, MemoryStorage, get_storage, verify_signed_url
from app.models.case import Case, CaseType
from app.models.document import DocStatus
from app.models.identity import Role, Unit, UnitKind, User
from app.seeds.catalog_seed import seed_catalog
from app.seeds.workflow_seed import seed_workflow
from app.services.documents import attach_file, snapshot_for_case


@pytest.fixture()
def ho_so(db):
    seed_workflow(db)
    seed_catalog(db)
    MemoryStorage.objects.clear()
    unit = Unit(name="LCĐ Khoa CNTT", kind=UnitKind.LIEN_CHI_DOAN)
    db.add(unit)
    db.flush()
    sv = User(email="sv@sis.hust.edu.vn", role=Role.SINH_VIEN, unit_id=unit.id)
    db.add(sv)
    db.flush()
    case = Case(code="KN-1", applicant_id=sv.id, unit_id=unit.id, case_type=CaseType.KET_NAP, status="draft")
    db.add(case)
    db.commit()
    return {"case": case, "sv": sv, "docs": snapshot_for_case(db, case)}


def test_tai_len_file_hop_le(db, ho_so):
    doc = ho_so["docs"][0]
    attach_file(db, doc, "don.pdf", "application/pdf", b"%PDF-1.4 noi dung", ho_so["sv"])
    assert doc.status == DocStatus.SUBMITTED
    assert doc.filename == "don.pdf"
    assert doc.version == 1
    assert get_storage().signed_url(doc.storage_key).startswith("memory://")


def test_tu_choi_duoi_file_khong_cho_phep(db, ho_so):
    doc = ho_so["docs"][0]
    with pytest.raises(BusinessError, match="định dạng"):
        attach_file(db, doc, "don.exe", "application/octet-stream", b"x", ho_so["sv"])


def test_tu_choi_file_qua_dung_luong(db, ho_so):
    doc = ho_so["docs"][0]
    qua_to = b"x" * (6 * 1024 * 1024)
    with pytest.raises(BusinessError, match="dung lượng"):
        attach_file(db, doc, "don.pdf", "application/pdf", qua_to, ho_so["sv"])


def test_nop_lai_thi_tang_phien_ban_va_xoa_ly_do_cu(db, ho_so):
    doc = ho_so["docs"][0]
    attach_file(db, doc, "don.pdf", "application/pdf", b"noi dung goc", ho_so["sv"])
    assert doc.version == 1
    khoa_lan_1 = doc.storage_key

    doc.status = DocStatus.REJECTED
    doc.reason = "Ảnh mờ."
    db.commit()

    attach_file(db, doc, "don_moi.pdf", "application/pdf", b"noi dung moi", ho_so["sv"])
    assert doc.version == 2
    assert doc.status == DocStatus.SUBMITTED
    assert doc.reason == ""
    khoa_lan_2 = doc.storage_key
    assert khoa_lan_2 != khoa_lan_1

    # Bản nộp trước không bị ghi đè — hồ sơ Đảng cần lưu vết đầy đủ.
    assert khoa_lan_1 in MemoryStorage.objects
    assert khoa_lan_2 in MemoryStorage.objects


def test_sinh_vien_tai_file_len_ho_so_nguoi_khac_bi_cam(db, ho_so):
    unit = ho_so["case"].unit
    nguoi_khac = User(email="khac@sis.hust.edu.vn", role=Role.SINH_VIEN, unit_id=unit.id)
    db.add(nguoi_khac)
    db.commit()
    doc = ho_so["docs"][0]
    with pytest.raises(PermissionDenied):
        attach_file(db, doc, "don.pdf", "application/pdf", b"noi dung", nguoi_khac)


def test_sinh_vien_khong_duoc_sua_ho_so_dang_cap_tren_xu_ly(db, ho_so):
    case = ho_so["case"]
    case.status = "tckt_checking"
    db.commit()
    doc = ho_so["docs"][0]
    with pytest.raises(BusinessError, match="đang được cấp trên xử lý"):
        attach_file(db, doc, "don.pdf", "application/pdf", b"noi dung", ho_so["sv"])


def test_local_storage_put_read_round_trip(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "local_storage_dir", str(tmp_path))
    storage = LocalStorage()
    storage.put("cases/1/2/v1.pdf", b"noi dung file pdf", "application/pdf")
    assert storage.read("cases/1/2/v1.pdf") == b"noi dung file pdf"


def test_local_storage_signed_url_co_du_tham_so(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "local_storage_dir", str(tmp_path))
    storage = LocalStorage()
    url = storage.signed_url("cases/1/2/v1.pdf")
    assert "key=" in url
    assert "expires=" in url
    assert "sig=" in url


def test_verify_signed_url_dung_thi_qua_sai_thi_khong(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "local_storage_dir", str(tmp_path))
    storage = LocalStorage()
    url = storage.signed_url("cases/1/2/v1.pdf")
    from urllib.parse import parse_qs, urlparse

    qs = parse_qs(urlparse(url).query)
    key, expires, sig = qs["key"][0], int(qs["expires"][0]), qs["sig"][0]

    assert verify_signed_url(key, expires, sig) is True
    assert verify_signed_url(key, int(time.time()) - 1, sig) is False
    assert verify_signed_url(key, expires, sig[:-1] + ("a" if sig[-1] != "a" else "b")) is False


def test_get_storage_tra_ve_local_khi_cau_hinh_local(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "storage_driver", "local")
    monkeypatch.setattr(settings, "local_storage_dir", str(tmp_path))
    assert isinstance(get_storage(), LocalStorage)
