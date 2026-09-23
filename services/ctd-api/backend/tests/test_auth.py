from app.infra.mailer import ConsoleMailer
from app.models.identity import Role, User


def test_xin_ma_roi_dang_nhap_thanh_cong(client, db):
    db.add(User(email="sv@sis.hust.edu.vn", full_name="Nguyễn Minh Anh", role=Role.SINH_VIEN))
    db.commit()
    ConsoleMailer.sent.clear()

    assert client.post("/api/auth/request-code", json={"email": "sv@sis.hust.edu.vn"}).status_code == 204
    assert len(ConsoleMailer.sent) == 1
    code = ConsoleMailer.sent[0]["body"].split()[-1]

    response = client.post("/api/auth/verify", json={"email": "sv@sis.hust.edu.vn", "code": code})
    assert response.status_code == 200
    assert response.json()["role"] == "sinh_vien"
    assert response.json()["access_token"]


def test_ma_sai_thi_bi_tu_choi(client, db):
    db.add(User(email="sv@sis.hust.edu.vn", role=Role.SINH_VIEN))
    db.commit()
    client.post("/api/auth/request-code", json={"email": "sv@sis.hust.edu.vn"})

    response = client.post("/api/auth/verify", json={"email": "sv@sis.hust.edu.vn", "code": "000000"})
    assert response.status_code == 401


def test_khong_lo_viec_email_co_ton_tai_hay_khong(client):
    # Trả 204 kể cả với email lạ, để không bị dò danh sách người dùng.
    assert client.post("/api/auth/request-code", json={"email": "nguoila@example.com"}).status_code == 204


def test_ma_da_dung_thi_khong_dung_lai_duoc(client, db):
    db.add(User(email="sv@sis.hust.edu.vn", role=Role.SINH_VIEN))
    db.commit()
    ConsoleMailer.sent.clear()
    client.post("/api/auth/request-code", json={"email": "sv@sis.hust.edu.vn"})
    code = ConsoleMailer.sent[0]["body"].split()[-1]

    first = client.post("/api/auth/verify", json={"email": "sv@sis.hust.edu.vn", "code": code})
    assert first.status_code == 200

    again = client.post("/api/auth/verify", json={"email": "sv@sis.hust.edu.vn", "code": code})
    assert again.status_code == 401


def test_khong_co_token_thi_khong_goi_duoc_api_can_dang_nhap(client):
    assert client.get("/api/me").status_code == 401


def test_dang_nhap_bang_mat_khau_admin(client, db):
    from app.seeds.admin_seed import seed_admin

    admin = seed_admin(db)
    res = client.post("/api/auth/verify", json={"email": admin.email, "code": "Dev@123"})
    assert res.status_code == 200
    body = res.json()
    assert body["role"] == "quan_tri"
    assert body["full_name"] == "Quản trị viên Hệ thống"
    assert body["access_token"]

    # Thử sai mật khẩu
    wrong = client.post("/api/auth/verify", json={"email": admin.email, "code": "SaiPass@999"})
    assert wrong.status_code == 401
