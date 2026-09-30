"""Seed admin chạy ở mỗi lần container khởi động: không được đặt lại mật khẩu,
và môi trường thật không bao giờ nhận mật khẩu mặc định công khai trong repo."""

import pytest

from app.infra.password import hash_password, verify_password
from app.models.identity import Role
from app.seeds.admin_seed import ADMIN_EMAIL, ADMIN_PASSWORD_DEFAULT, seed_admin
from app.seeds.set_password import set_password


def test_seed_giu_mat_khau_admin_da_co(db):
    admin = seed_admin(db, app_env="dev")
    admin.password_hash = hash_password("MatKhauRieng2026!")
    db.commit()

    again = seed_admin(db, app_env="production")

    assert verify_password("MatKhauRieng2026!", again.password_hash)
    assert not verify_password(ADMIN_PASSWORD_DEFAULT, again.password_hash)
    assert again.role == Role.QUAN_TRI
    assert again.is_active is True


def test_seed_moi_truong_that_khong_dat_mat_khau_mac_dinh(db):
    admin = seed_admin(db, app_env="production")
    assert admin.password_hash is None


def test_seed_dev_van_dat_mat_khau_mac_dinh(db):
    admin = seed_admin(db, app_env="dev")
    assert verify_password(ADMIN_PASSWORD_DEFAULT, admin.password_hash)


def test_set_password_doi_mat_khau(db):
    seed_admin(db, app_env="production")
    user = set_password(db, ADMIN_EMAIL.upper(), "MatKhauMoi2026!")
    assert verify_password("MatKhauMoi2026!", user.password_hash)


def test_set_password_tu_choi_mat_khau_ngan(db):
    seed_admin(db, app_env="production")
    with pytest.raises(ValueError):
        set_password(db, ADMIN_EMAIL, "ngan")


def test_set_password_bao_loi_khi_khong_co_email(db):
    with pytest.raises(LookupError):
        set_password(db, "khong-ton-tai@example.edu.vn", "MatKhauMoi2026!")
