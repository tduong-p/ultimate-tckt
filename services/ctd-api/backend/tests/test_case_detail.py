import pytest

from app.deps import create_token
from app.models.audit import FieldChange
from app.models.identity import Role, Unit, UnitKind, User
from app.seeds.catalog_seed import seed_catalog
from app.seeds.workflow_seed import seed_workflow


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_token(user)}"}


@pytest.fixture()
def ho_so(client, db):
    seed_workflow(db)
    seed_catalog(db)
    unit = Unit(name="LCĐ Khoa CNTT", kind=UnitKind.LIEN_CHI_DOAN)
    db.add(unit)
    db.flush()
    sv = User(email="sv@sis.hust.edu.vn", role=Role.SINH_VIEN, unit_id=unit.id)
    db.add(sv)
    db.commit()
    case_id = client.post("/api/cases", json={"case_type": "ket_nap"}, headers=_auth(sv)).json()["id"]
    return {"case_id": case_id, "sv": sv}


HOP_LE = {
    "phone": "0912345678",
    "personal_email": "minhanh@gmail.com",
    "citizen_id": "001204012345",
    "permanent_address": "Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội",
    "emergency_contact_name": "Nguyễn Văn B",
    "emergency_contact_relation": "Bố",
    "emergency_contact_phone": "0987654321",
    "gpa": 3.45,
    "conduct_score": 88,
}


def test_dien_thong_tin_hop_le(client, ho_so):
    response = client.put(
        f"/api/cases/{ho_so['case_id']}/detail", json=HOP_LE, headers=_auth(ho_so["sv"])
    )
    assert response.status_code == 200
    assert response.json()["phone"] == "0912345678"


@pytest.mark.parametrize(
    "field,value",
    [
        ("phone", "091234567"),        # 9 chữ số
        ("phone", "0212345678"),       # đầu số không hợp lệ
        ("citizen_id", "12345"),       # không đủ 12 chữ số
        ("personal_email", "khong-phai-email"),
        ("gpa", 4.5),                  # ngoài khoảng 0–4
        ("gpa", -0.1),
        ("conduct_score", 101),        # ngoài khoảng −110–100
        ("conduct_score", -111),
        ("permanent_address", "ngắn"), # dưới 10 ký tự
    ],
)
def test_tu_choi_du_lieu_sai_dinh_dang(client, ho_so, field, value):
    payload = HOP_LE | {field: value}
    response = client.put(
        f"/api/cases/{ho_so['case_id']}/detail", json=payload, headers=_auth(ho_so["sv"])
    )
    assert response.status_code == 422, field


def test_sdt_khan_cap_khong_duoc_trung_sdt_ca_nhan(client, ho_so):
    payload = HOP_LE | {"emergency_contact_phone": HOP_LE["phone"]}
    response = client.put(
        f"/api/cases/{ho_so['case_id']}/detail", json=payload, headers=_auth(ho_so["sv"])
    )
    assert response.status_code == 422


def test_moi_lan_sua_deu_duoc_ghi_nhat_ky(client, db, ho_so):
    client.put(f"/api/cases/{ho_so['case_id']}/detail", json=HOP_LE, headers=_auth(ho_so["sv"]))
    client.put(
        f"/api/cases/{ho_so['case_id']}/detail",
        json=HOP_LE | {"phone": "0911111111"},
        headers=_auth(ho_so["sv"]),
    )
    changes = db.query(FieldChange).filter_by(case_id=ho_so["case_id"], field_name="phone").all()
    assert len(changes) == 2
    assert changes[-1].old_value == "0912345678"
    assert changes[-1].new_value == "0911111111"


def test_gia_tri_bien_0_duoc_luu_va_ghi_nhat_ky(client, db, ho_so):
    """Bug đã phát hiện: `str(x or "")` gộp None, 0 và "" thành cùng một
    chuỗi rỗng, khiến giá trị biên hợp lệ (gpa=0, conduct_score=0) bị
    `continue` bỏ qua — API trả 200 nhưng không lưu, không ghi nhật ký."""
    from app.models.case import CaseDetail

    payload = HOP_LE | {"gpa": 0, "conduct_score": 0}
    response = client.put(
        f"/api/cases/{ho_so['case_id']}/detail", json=payload, headers=_auth(ho_so["sv"])
    )
    assert response.status_code == 200

    detail = db.get(CaseDetail, ho_so["case_id"])
    assert float(detail.gpa) == 0
    assert detail.conduct_score == 0

    changes = {
        c.field_name: c
        for c in db.query(FieldChange).filter_by(case_id=ho_so["case_id"]).all()
    }
    assert "gpa" in changes
    assert "conduct_score" in changes


@pytest.mark.parametrize(
    "field,value",
    [
        ("gpa", 0),
        ("gpa", 4),
        ("conduct_score", -110),
        ("conduct_score", 100),
    ],
)
def test_chap_nhan_gia_tri_bien_duong(client, ho_so, field, value):
    payload = HOP_LE | {field: value}
    response = client.put(
        f"/api/cases/{ho_so['case_id']}/detail", json=payload, headers=_auth(ho_so["sv"])
    )
    assert response.status_code == 200, response.text


def test_khong_the_sua_ho_so_cua_nguoi_khac(db, ho_so):
    # Không thể tái hiện nhánh này qua API: `_lay_ho_so_trong_pham_vi` lọc
    # theo `visible_cases` TRƯỚC khi service chạy tới, và với vai trò sinh
    # viên phạm vi đó chỉ gồm hồ sơ của chính họ — hồ sơ người khác không
    # bao giờ lọt qua để tới được kiểm tra PermissionDenied, router trả 404
    # (cố ý, để không tiết lộ hồ sơ đó có tồn tại hay không — xem comment tại
    # `_lay_ho_so_trong_pham_vi`). Vì vậy test thẳng vào service, đúng quy
    # ước đã dùng cho `add_adhoc` trong `test_documents.py`.
    from app.errors import PermissionDenied
    from app.models.case import Case
    from app.models.identity import Role, User
    from app.services.case_detail import update_detail

    case = db.get(Case, ho_so["case_id"])
    nguoi_khac = User(email="khac@sis.hust.edu.vn", role=Role.SINH_VIEN, unit_id=case.unit_id)
    db.add(nguoi_khac)
    db.commit()
    with pytest.raises(PermissionDenied):
        update_detail(db, case, HOP_LE, nguoi_khac)


def test_thong_bao_loi_gpa_vuot_bien_la_tieng_viet(client, ho_so):
    payload = HOP_LE | {"gpa": 4.5}
    response = client.put(
        f"/api/cases/{ho_so['case_id']}/detail", json=payload, headers=_auth(ho_so["sv"])
    )
    assert response.status_code == 422
    loi = [e for e in response.json()["detail"] if e["loc"][-1] == "gpa"]
    assert loi, response.json()
    assert "should be" not in loi[0]["msg"].lower()
    assert "nhỏ hơn hoặc bằng 4" in loi[0]["msg"]


def test_thong_bao_loi_dia_chi_qua_ngan_la_tieng_viet(client, ho_so):
    payload = HOP_LE | {"permanent_address": "ngắn"}
    response = client.put(
        f"/api/cases/{ho_so['case_id']}/detail", json=payload, headers=_auth(ho_so["sv"])
    )
    assert response.status_code == 422
    loi = [e for e in response.json()["detail"] if e["loc"][-1] == "permanent_address"]
    assert loi, response.json()
    assert "should have" not in loi[0]["msg"].lower()
    assert "ít nhất 10 ký tự" in loi[0]["msg"]


def test_nhat_ky_ghi_dung_gia_tri_0_khong_lam_tron_thanh_rong(client, db, ho_so):
    """Fix round 2: `str(old_value or "")` / `str(new_value or "")` khi GHI vào
    FieldChange vẫn coi 0 (falsy) như chưa khai — nhật ký nói sai "trước đó để
    trống" / "đổi thành trống" trong khi thực tế là số 0. "Chưa khai" và "khai
    bằng 0" là hai sự việc khác nhau, không được ghi nhầm."""
    from app.models.case import CaseDetail

    payload_1 = HOP_LE | {"gpa": 0, "conduct_score": 50}
    r1 = client.put(
        f"/api/cases/{ho_so['case_id']}/detail", json=payload_1, headers=_auth(ho_so["sv"])
    )
    assert r1.status_code == 200

    # Không đoán định dạng Decimal Postgres trả về — đọc thẳng từ DB.
    detail = db.get(CaseDetail, ho_so["case_id"])
    gpa_da_luu = str(detail.gpa)

    payload_2 = HOP_LE | {"gpa": 3.5, "conduct_score": 0}
    r2 = client.put(
        f"/api/cases/{ho_so['case_id']}/detail", json=payload_2, headers=_auth(ho_so["sv"])
    )
    assert r2.status_code == 200

    gpa_change = (
        db.query(FieldChange)
        .filter_by(case_id=ho_so["case_id"], field_name="gpa")
        .order_by(FieldChange.id.desc())
        .first()
    )
    assert gpa_change.old_value == gpa_da_luu, "old_value phải là 0 đã khai, không phải rỗng"
    assert gpa_change.new_value == "3.5"

    conduct_change = (
        db.query(FieldChange)
        .filter_by(case_id=ho_so["case_id"], field_name="conduct_score")
        .order_by(FieldChange.id.desc())
        .first()
    )
    assert conduct_change.old_value == "50"
    assert conduct_change.new_value == "0", "new_value phải là 0, không phải rỗng"


def test_thong_bao_loi_ep_kieu_sai_la_tieng_viet(client, ho_so):
    """Gõ chữ vào ô số (GPA) — lỗi `float_parsing` của Pydantic, đường người
    dùng thật hay đi nhất, phải dịch sang tiếng Việt như các loại lỗi khác."""
    payload = HOP_LE | {"gpa": "abc"}
    response = client.put(
        f"/api/cases/{ho_so['case_id']}/detail", json=payload, headers=_auth(ho_so["sv"])
    )
    assert response.status_code == 422
    loi = [e for e in response.json()["detail"] if e["loc"][-1] == "gpa"]
    assert loi, response.json()
    assert "should be" not in loi[0]["msg"].lower()
    assert "kiểu dữ liệu" in loi[0]["msg"] or "số" in loi[0]["msg"]


def test_khong_sua_duoc_khi_ho_so_dang_o_cap_tren(client, db, ho_so):
    from app.models.case import Case

    client.put(f"/api/cases/{ho_so['case_id']}/detail", json=HOP_LE, headers=_auth(ho_so["sv"]))
    db.get(Case, ho_so["case_id"]).status = "tckt_checking"
    db.commit()
    response = client.put(
        f"/api/cases/{ho_so['case_id']}/detail", json=HOP_LE, headers=_auth(ho_so["sv"])
    )
    assert response.status_code == 400
