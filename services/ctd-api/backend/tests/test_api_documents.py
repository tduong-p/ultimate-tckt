import pytest

from app.config import settings
from app.deps import create_token
from app.models.case import Case, CaseType
from app.models.identity import Role, Unit, UnitKind, User
from app.seeds.catalog_seed import seed_catalog
from app.seeds.workflow_seed import seed_workflow
from app.services.documents import snapshot_for_case


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_token(user)}"}


@pytest.fixture()
def boi_canh(db):
    seed_workflow(db)
    seed_catalog(db)
    unit = Unit(name="LCĐ Khoa CNTT", kind=UnitKind.LIEN_CHI_DOAN)
    khac = Unit(name="LCĐ Khoa Điện", kind=UnitKind.LIEN_CHI_DOAN)
    db.add_all([unit, khac])
    db.flush()
    sv = User(email="sv@sis.hust.edu.vn", role=Role.SINH_VIEN, unit_id=unit.id)
    cb = User(email="cb@sis.hust.edu.vn", role=Role.CAN_BO_DON_VI, unit_id=unit.id)
    nguoi_la = User(email="la@sis.hust.edu.vn", role=Role.CAN_BO_DON_VI, unit_id=khac.id)
    db.add_all([sv, cb, nguoi_la])
    db.flush()
    case = Case(code="KN-1", applicant_id=sv.id, unit_id=unit.id, case_type=CaseType.KET_NAP, status="draft")
    db.add(case)
    db.commit()
    return {"case": case, "sv": sv, "cb": cb, "nguoi_la": nguoi_la, "docs": snapshot_for_case(db, case)}


def test_sinh_vien_tai_len_file(client, boi_canh):
    doc = boi_canh["docs"][0]
    response = client.post(
        f"/api/documents/{doc.id}/file",
        files={"file": ("don.pdf", b"%PDF-1.4 x", "application/pdf")},
        headers=_auth(boi_canh["sv"]),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "submitted"


def test_nguoi_ngoai_pham_vi_khong_tai_len_duoc(client, boi_canh, db):
    # Hồ sơ phải KHÔNG ở "draft" — nếu để draft thì mọi cán bộ (cùng đơn vị
    # hay khác đơn vị) đều bị visible_cases loại, và test sẽ luôn ra 404 vì lý
    # do loại-theo-draft, không phải vì cách ly theo đơn vị — cái test này
    # thực sự muốn kiểm.
    case = boi_canh["case"]
    case.status = "dt_checking"
    db.add(case)
    db.commit()
    doc = boi_canh["docs"][0]
    response = client.post(
        f"/api/documents/{doc.id}/file",
        files={"file": ("don.pdf", b"x", "application/pdf")},
        headers=_auth(boi_canh["nguoi_la"]),
    )
    assert response.status_code == 404


def test_can_bo_khong_duoc_dinh_file_thay_sinh_vien(client, boi_canh, db):
    # Đính file là lời khai của chính người nộp — cán bộ không đính thay, kể
    # cả khi hồ sơ đang nằm trên bàn mình. Đây là vi phạm quyền (403).
    case = boi_canh["case"]
    case.status = "dt_checking"
    db.add(case)
    db.commit()
    doc = boi_canh["docs"][0]
    response = client.post(
        f"/api/documents/{doc.id}/file",
        files={"file": ("don.pdf", b"x", "application/pdf")},
        headers=_auth(boi_canh["cb"]),
    )
    assert response.status_code == 403


def test_chu_ho_so_khong_dinh_file_len_ho_so_da_ket_thuc(client, boi_canh, db):
    # Hồ sơ đã "forwarded" (đã bàn giao Chi bộ) là trạng thái kết thúc — không
    # ai được đổi nội dung nữa. Với người ĐÚNG quyền thì đây là ràng buộc toàn
    # vẹn hồ sơ (400), không phải chuyện phân quyền (403).
    case = boi_canh["case"]
    case.status = "forwarded"
    db.add(case)
    db.commit()
    doc = boi_canh["docs"][0]
    response = client.post(
        f"/api/documents/{doc.id}/file",
        files={"file": ("don.pdf", b"x", "application/pdf")},
        headers=_auth(boi_canh["sv"]),
    )
    assert response.status_code == 400


def test_can_bo_danh_dau_khong_dat_kem_ly_do(client, boi_canh, db):
    # Cán bộ đơn vị không thấy hồ sơ còn ở "draft" (Task 7, visible_cases) —
    # hồ sơ phải đã được sinh viên gửi thì cán bộ mới nằm trong phạm vi xử lý.
    case = boi_canh["case"]
    case.status = "dt_checking"
    db.add(case)
    db.commit()
    doc = boi_canh["docs"][0]
    response = client.post(
        f"/api/documents/{doc.id}/verdict",
        json={"verdict": "rejected", "reason": "Ảnh mờ, không đọc được MSSV."},
        headers=_auth(boi_canh["cb"]),
    )
    assert response.status_code == 200
    assert response.json()["reason"] == "Ảnh mờ, không đọc được MSSV."


def test_sinh_vien_khong_duoc_danh_gia_giay_to(client, boi_canh):
    doc = boi_canh["docs"][0]
    response = client.post(
        f"/api/documents/{doc.id}/verdict",
        json={"verdict": "accepted", "reason": ""},
        headers=_auth(boi_canh["sv"]),
    )
    # Sinh viên cố đánh giá giấy tờ là vi phạm quyền, không phải dữ liệu sai
    # (Task 8 đã đổi mark_verdict từ BusinessError sang PermissionDenied cho
    # trường hợp này) — nên mã lỗi đúng là 403, không phải 400.
    assert response.status_code == 403


def test_danh_dau_khong_ap_dung_chi_voi_muc_duoc_phep(client, boi_canh):
    duoc_phep = next(d for d in boi_canh["docs"] if d.allow_not_applicable)
    khong_duoc = next(d for d in boi_canh["docs"] if not d.allow_not_applicable)
    ok = client.post(
        f"/api/documents/{duoc_phep.id}/not-applicable",
        json={"reason": "Sinh viên năm thứ nhất chưa có bảng điểm kỳ 2."},
        headers=_auth(boi_canh["sv"]),
    )
    assert ok.status_code == 200
    loi = client.post(
        f"/api/documents/{khong_duoc.id}/not-applicable",
        json={"reason": "Không có"},
        headers=_auth(boi_canh["sv"]),
    )
    assert loi.status_code == 400


def test_can_bo_khong_duoc_danh_dau_khong_ap_dung(client, boi_canh, db):
    # Đánh dấu "không áp dụng" là lời khai của người nộp về hoàn cảnh của
    # chính họ — cán bộ không khai thay, họ có mark_verdict để nêu kết luận
    # riêng. Cán bộ đơn vị dù đang có hồ sơ trong tầm nhìn (visible_cases)
    # vẫn phải bị chặn ở đây (403), không phải chỉ lọc ở router.
    case = boi_canh["case"]
    case.status = "dt_checking"
    db.add(case)
    db.commit()
    duoc_phep = next(d for d in boi_canh["docs"] if d.allow_not_applicable)
    response = client.post(
        f"/api/documents/{duoc_phep.id}/not-applicable",
        json={"reason": "Sinh viên năm thứ nhất chưa có bảng điểm kỳ 2."},
        headers=_auth(boi_canh["cb"]),
    )
    assert response.status_code == 403


def test_sinh_vien_khong_danh_dau_khong_ap_dung_khi_ho_so_da_len_cap_tren(client, boi_canh, db):
    case = boi_canh["case"]
    case.status = "dt_checking"
    db.add(case)
    db.commit()
    duoc_phep = next(d for d in boi_canh["docs"] if d.allow_not_applicable)
    response = client.post(
        f"/api/documents/{duoc_phep.id}/not-applicable",
        json={"reason": "Không áp dụng."},
        headers=_auth(boi_canh["sv"]),
    )
    assert response.status_code == 400


def test_link_xem_file_co_han_va_chi_cap_cho_nguoi_trong_pham_vi(client, boi_canh, db):
    doc = boi_canh["docs"][0]
    client.post(
        f"/api/documents/{doc.id}/file",
        files={"file": ("don.pdf", b"x", "application/pdf")},
        headers=_auth(boi_canh["sv"]),
    )
    # Cán bộ đơn vị chỉ thấy hồ sơ sau khi đã được gửi (visible_cases, Task 7).
    case = boi_canh["case"]
    case.status = "dt_checking"
    db.add(case)
    db.commit()
    assert client.get(f"/api/documents/{doc.id}/url", headers=_auth(boi_canh["cb"])).status_code == 200
    assert client.get(f"/api/documents/{doc.id}/url", headers=_auth(boi_canh["nguoi_la"])).status_code == 404


def test_can_bo_them_dau_muc_phat_sinh_qua_api(client, boi_canh, db):
    # Cán bộ đơn vị không thấy hồ sơ còn ở "draft" (Task 7, visible_cases).
    case = boi_canh["case"]
    case.status = "dt_checking"
    db.add(case)
    db.commit()
    response = client.post(
        f"/api/cases/{boi_canh['case'].id}/documents",
        json={"name": "Xác nhận quá trình học tại ĐH Xây dựng"},
        headers=_auth(boi_canh["cb"]),
    )
    assert response.status_code == 201
    assert response.json()["is_adhoc"] is True


def test_tai_file_local_url_hop_le_tra_ve_noi_dung(client, boi_canh, db, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "storage_driver", "local")
    monkeypatch.setattr(settings, "local_storage_dir", str(tmp_path))
    doc = boi_canh["docs"][0]
    upload = client.post(
        f"/api/documents/{doc.id}/file",
        files={"file": ("don.pdf", b"%PDF-1.4 noi dung that", "application/pdf")},
        headers=_auth(boi_canh["sv"]),
    )
    assert upload.status_code == 200

    link = client.get(f"/api/documents/{doc.id}/url", headers=_auth(boi_canh["sv"]))
    assert link.status_code == 200
    url = link.json()["url"]
    assert url.startswith("/api/documents/file?")

    response = client.get(url)
    assert response.status_code == 200
    assert response.content == b"%PDF-1.4 noi dung that"
    assert response.headers["content-type"].startswith("application/pdf")


def test_tai_file_local_url_het_han_bi_tu_choi(client, boi_canh, db, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "storage_driver", "local")
    monkeypatch.setattr(settings, "local_storage_dir", str(tmp_path))
    doc = boi_canh["docs"][0]
    client.post(
        f"/api/documents/{doc.id}/file",
        files={"file": ("don.pdf", b"noi dung", "application/pdf")},
        headers=_auth(boi_canh["sv"]),
    )
    link = client.get(f"/api/documents/{doc.id}/url", headers=_auth(boi_canh["sv"]))
    from urllib.parse import parse_qs, urlparse

    qs = parse_qs(urlparse(link.json()["url"]).query)
    response = client.get(
        "/api/documents/file",
        params={"key": qs["key"][0], "expires": 1, "sig": qs["sig"][0]},
    )
    assert response.status_code == 403


def test_tai_file_local_url_sai_chu_ky_bi_tu_choi(client, boi_canh, db, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "storage_driver", "local")
    monkeypatch.setattr(settings, "local_storage_dir", str(tmp_path))
    doc = boi_canh["docs"][0]
    client.post(
        f"/api/documents/{doc.id}/file",
        files={"file": ("don.pdf", b"noi dung", "application/pdf")},
        headers=_auth(boi_canh["sv"]),
    )
    link = client.get(f"/api/documents/{doc.id}/url", headers=_auth(boi_canh["sv"]))
    from urllib.parse import parse_qs, urlparse

    qs = parse_qs(urlparse(link.json()["url"]).query)
    response = client.get(
        "/api/documents/file",
        params={"key": qs["key"][0], "expires": qs["expires"][0], "sig": "sai-chu-ky"},
    )
    assert response.status_code == 403


def test_verdict_sai_gia_tri_tra_ve_422_khong_phai_500(client, boi_canh, db):
    """Giá trị `verdict` không nằm trong DocStatus phải bị Pydantic chặn ở
    tầng schema (422), không được để `DocStatus(...)` ném ValueError trần và
    biến thành 500."""
    case = boi_canh["case"]
    case.status = "dt_checking"
    db.add(case)
    db.commit()
    doc = boi_canh["docs"][0]
    response = client.post(
        f"/api/documents/{doc.id}/verdict",
        json={"verdict": "khong_ton_tai", "reason": "x"},
        headers=_auth(boi_canh["cb"]),
    )
    assert response.status_code == 422
