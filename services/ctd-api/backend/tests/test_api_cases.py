import re

import pytest

from app.deps import create_token
from app.models.identity import Role, Unit, UnitKind, User
from app.seeds.catalog_seed import seed_catalog
from app.seeds.workflow_seed import seed_workflow


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_token(user)}"}


@pytest.fixture()
def nguoi_dung(db):
    seed_workflow(db)
    seed_catalog(db)
    cntt = Unit(name="LCĐ Khoa CNTT", kind=UnitKind.LIEN_CHI_DOAN, email="cntt@example.edu.vn")
    dien = Unit(name="LCĐ Khoa Điện", kind=UnitKind.LIEN_CHI_DOAN)
    db.add_all([cntt, dien])
    db.flush()
    sv = User(email="sv@sis.hust.edu.vn", full_name="Nguyễn Minh Anh", role=Role.SINH_VIEN, unit_id=cntt.id)
    sv2 = User(email="sv2@sis.hust.edu.vn", full_name="Lê Thị Bình", role=Role.SINH_VIEN, unit_id=cntt.id)
    cb = User(email="cb@sis.hust.edu.vn", full_name="Trần Văn Hùng", role=Role.CAN_BO_DON_VI, unit_id=cntt.id)
    cb_khac = User(email="cb2@sis.hust.edu.vn", role=Role.CAN_BO_DON_VI, unit_id=dien.id)
    db.add_all([sv, sv2, cb, cb_khac])
    db.commit()
    return {"sv": sv, "sv2": sv2, "cb": cb, "cb_khac": cb_khac}


def test_sinh_vien_tao_ho_so_nhap_thi_co_san_checklist(client, nguoi_dung):
    response = client.post("/api/cases", json={"case_type": "ket_nap"}, headers=_auth(nguoi_dung["sv"]))
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "draft"
    assert len(body["documents"]) == 7


def test_khong_tao_duoc_ho_so_thu_hai(client, nguoi_dung):
    client.post("/api/cases", json={"case_type": "ket_nap"}, headers=_auth(nguoi_dung["sv"]))
    response = client.post("/api/cases", json={"case_type": "ket_nap"}, headers=_auth(nguoi_dung["sv"]))
    assert response.status_code == 400
    assert "một hồ sơ" in response.json()["detail"]


def test_thieu_giay_to_bat_buoc_thi_khong_gui_duoc(client, nguoi_dung):
    case_id = client.post(
        "/api/cases", json={"case_type": "ket_nap"}, headers=_auth(nguoi_dung["sv"])
    ).json()["id"]
    response = client.post(
        f"/api/cases/{case_id}/actions",
        json={"action_code": "submit"},
        headers=_auth(nguoi_dung["sv"]),
    )
    assert response.status_code == 400
    assert "còn thiếu" in response.json()["detail"].lower()


def test_can_bo_chi_thay_ho_so_don_vi_minh(client, db, nguoi_dung):
    client.post("/api/cases", json={"case_type": "ket_nap"}, headers=_auth(nguoi_dung["sv"]))
    assert len(client.get("/api/cases", headers=_auth(nguoi_dung["cb"])).json()) == 0  # còn ở draft
    assert len(client.get("/api/cases", headers=_auth(nguoi_dung["cb_khac"])).json()) == 0


def test_chi_tiet_ho_so_tra_ve_dung_cac_nut_duoc_phep(client, db, nguoi_dung):
    case_id = client.post(
        "/api/cases", json={"case_type": "ket_nap"}, headers=_auth(nguoi_dung["sv"])
    ).json()["id"]
    body = client.get(f"/api/cases/{case_id}", headers=_auth(nguoi_dung["sv"])).json()
    assert [a["action_code"] for a in body["available_actions"]] == ["submit"]


def test_can_bo_don_vi_khac_khong_xem_duoc_chi_tiet(client, nguoi_dung):
    case_id = client.post(
        "/api/cases", json={"case_type": "ket_nap"}, headers=_auth(nguoi_dung["sv"])
    ).json()["id"]
    assert client.get(f"/api/cases/{case_id}", headers=_auth(nguoi_dung["cb_khac"])).status_code == 404


def test_case_type_khong_hop_le_tra_ve_422(client, nguoi_dung):
    response = client.post(
        "/api/cases", json={"case_type": "khong_ton_tai"}, headers=_auth(nguoi_dung["sv"])
    )
    assert response.status_code == 422


def test_dua_qua_kiem_ung_dung_thi_db_van_chan_va_bao_loi_ro_rang(client, nguoi_dung, monkeypatch):
    """Mô phỏng race hai request đồng thời: cả hai cùng lọt qua kiểm ở tầng
    ứng dụng ('chỉ một hồ sơ đang chạy'), rồi cùng chạm partial unique index ở
    DB. Người dùng phải nhận lỗi nghiệp vụ rõ ràng, không phải 500 thô."""
    from app.services import cases as case_service

    sv = nguoi_dung["sv"]
    client.post("/api/cases", json={"case_type": "ket_nap"}, headers=_auth(sv))

    # Coi "draft" cũng là trạng thái kết thúc trong mắt kiểm ứng dụng, để
    # nhánh kiểm "chỉ một hồ sơ đang chạy" không bắt được hồ sơ vừa tạo — buộc
    # luồng phải đi tới INSERT thật và chạm constraint thật ở DB.
    monkeypatch.setattr(case_service, "TERMINAL_STATUSES", ("forwarded", "cancelled", "draft"))

    response = client.post("/api/cases", json={"case_type": "ket_nap"}, headers=_auth(sv))
    assert response.status_code == 400
    assert "một hồ sơ" in response.json()["detail"]


def test_ma_ho_so_dung_dinh_dang_va_khong_trung_giua_hai_sinh_vien(client, nguoi_dung):
    ma_1 = client.post(
        "/api/cases", json={"case_type": "ket_nap"}, headers=_auth(nguoi_dung["sv"])
    ).json()["code"]
    ma_2 = client.post(
        "/api/cases", json={"case_type": "ket_nap"}, headers=_auth(nguoi_dung["sv2"])
    ).json()["code"]

    assert re.fullmatch(r"KN-\d{4}-\d{4,}", ma_1)
    assert re.fullmatch(r"KN-\d{4}-\d{4,}", ma_2)
    assert ma_1 != ma_2


def _hoan_tat_giay_to(db, case_id: int) -> None:
    """Đánh mọi đầu mục bắt buộc là đã nộp để hồ sơ qua được cửa kiểm giấy tờ."""
    from app.models.document import DocStatus, Document

    for doc in db.query(Document).filter_by(case_id=case_id).all():
        doc.status = DocStatus.SUBMITTED
    db.commit()


def test_nop_lai_cung_phai_du_giay_to_bat_buoc(client, db, nguoi_dung):
    """Vòng "yêu cầu bổ sung" chỉ có nghĩa nếu `resubmit` kiểm lại giấy tờ như
    `submit`. Nếu không, sinh viên bị trả về vì thiếu giấy tờ chỉ cần bấm
    "Nộp lại" là hồ sơ quay lại bàn cán bộ nguyên trạng."""
    from app.models.case import Case
    from app.models.document import DocStatus, Document

    sv = nguoi_dung["sv"]
    case_id = client.post(
        "/api/cases", json={"case_type": "ket_nap"}, headers=_auth(sv)
    ).json()["id"]
    _hoan_tat_giay_to(db, case_id)
    assert client.post(
        f"/api/cases/{case_id}/actions", json={"action_code": "submit"}, headers=_auth(sv)
    ).status_code == 200

    # Cán bộ trả về vì một giấy tờ không đạt.
    thieu = db.query(Document).filter_by(case_id=case_id).first()
    thieu.status = DocStatus.REJECTED
    db.add(thieu)
    db.commit()
    assert client.post(
        f"/api/cases/{case_id}/actions",
        json={"action_code": "request_supplement", "reason": "Ảnh mờ."},
        headers=_auth(nguoi_dung["cb"]),
    ).status_code == 200

    response = client.post(
        f"/api/cases/{case_id}/actions", json={"action_code": "resubmit"}, headers=_auth(sv)
    )
    assert response.status_code == 400, response.text
    assert "còn thiếu" in response.json()["detail"].lower()
    assert db.get(Case, case_id).status == "need_supplement"


def test_nop_lai_duoc_khi_da_bo_sung_day_du(client, db, nguoi_dung):
    from app.models.case import Case

    sv = nguoi_dung["sv"]
    case_id = client.post(
        "/api/cases", json={"case_type": "ket_nap"}, headers=_auth(sv)
    ).json()["id"]
    _hoan_tat_giay_to(db, case_id)
    client.post(f"/api/cases/{case_id}/actions", json={"action_code": "submit"}, headers=_auth(sv))
    client.post(
        f"/api/cases/{case_id}/actions",
        json={"action_code": "request_supplement", "reason": "Ảnh mờ."},
        headers=_auth(nguoi_dung["cb"]),
    )
    _hoan_tat_giay_to(db, case_id)
    response = client.post(
        f"/api/cases/{case_id}/actions", json={"action_code": "resubmit"}, headers=_auth(sv)
    )
    assert response.status_code == 200, response.text
    assert db.get(Case, case_id).status == "dt_checking"


def test_ho_so_nhap_bo_hoang_go_duoc_va_sinh_vien_tao_lai_duoc(client, db, nguoi_dung):
    """Sinh viên chọn nhầm loại hồ sơ rồi bỏ đó: `draft` chưa kết thúc nên
    partial unique index vẫn giữ chỗ. Phải có đường huỷ hồ sơ nháp, nếu không
    sinh viên bị khoá vĩnh viễn, chỉ sửa được bằng psql."""
    from app.models.identity import Role, User

    sv = nguoi_dung["sv"]
    quan_tri = User(email="qt@sis.hust.edu.vn", role=Role.QUAN_TRI)
    db.add(quan_tri)
    db.commit()

    case_id = client.post(
        "/api/cases", json={"case_type": "ket_nap"}, headers=_auth(sv)
    ).json()["id"]
    huy = client.post(
        f"/api/cases/{case_id}/actions",
        json={"action_code": "cancel", "reason": "Sinh viên chọn nhầm loại hồ sơ."},
        headers=_auth(quan_tri),
    )
    assert huy.status_code == 200, huy.text
    assert huy.json()["status"] == "cancelled"

    lai = client.post(
        "/api/cases", json={"case_type": "chuyen_chinh_thuc"}, headers=_auth(sv)
    )
    assert lai.status_code == 201, lai.text


def test_lich_su_xu_ly_theo_thu_tu_thoi_gian(client, db, nguoi_dung):
    sv = nguoi_dung["sv"]
    cb = nguoi_dung["cb"]
    case_id = client.post(
        "/api/cases", json={"case_type": "ket_nap"}, headers=_auth(sv)
    ).json()["id"]
    _hoan_tat_giay_to(db, case_id)
    client.post(f"/api/cases/{case_id}/actions", json={"action_code": "submit"}, headers=_auth(sv))
    client.post(
        f"/api/cases/{case_id}/actions",
        json={"action_code": "request_supplement", "reason": "Ảnh mờ."},
        headers=_auth(cb),
    )

    response = client.get(f"/api/cases/{case_id}/events", headers=_auth(sv))
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert [ev["actor_name"] for ev in body] == ["Nguyễn Minh Anh", "Trần Văn Hùng"]
    assert body[0]["created_at"] <= body[1]["created_at"]
    assert body[1]["reason"] == "Ảnh mờ."
    assert body[1]["action_label"]
    assert body[1]["to_status_label"]


def test_lich_su_xu_ly_khong_thuoc_pham_vi_thi_404(client, db, nguoi_dung):
    sv = nguoi_dung["sv"]
    case_id = client.post(
        "/api/cases", json={"case_type": "ket_nap"}, headers=_auth(sv)
    ).json()["id"]
    response = client.get(f"/api/cases/{case_id}/events", headers=_auth(nguoi_dung["cb_khac"]))
    assert response.status_code == 404
