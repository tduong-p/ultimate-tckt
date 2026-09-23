"""Chốt chặn cấu hình: khoá ký token mặc định nằm công khai trong repo, nên
không được phép chạy ngoài môi trường dev."""

import pytest
from pydantic import ValidationError

from app.config import JWT_SECRET_MAC_DINH, Settings


def _settings(**kwargs) -> Settings:
    # _env_file=None: không đọc .env của máy lập trình viên, để test kiểm đúng
    # luật trong code chứ không phải nội dung file cấu hình cục bộ.
    return Settings(_env_file=None, **kwargs)


def test_moi_truong_that_khong_duoc_dung_secret_mac_dinh():
    with pytest.raises(ValidationError) as loi:
        _settings(app_env="production", jwt_secret=JWT_SECRET_MAC_DINH)
    assert "JWT_SECRET" in str(loi.value)


def test_moi_truong_that_co_secret_rieng_thi_chay_duoc():
    cau_hinh = _settings(app_env="production", jwt_secret="mot-chuoi-bi-mat-that-su-dai")
    assert cau_hinh.jwt_secret == "mot-chuoi-bi-mat-that-su-dai"


def test_dev_van_dung_duoc_secret_mac_dinh():
    assert _settings().app_env == "dev"
    assert _settings(jwt_secret=JWT_SECRET_MAC_DINH).jwt_secret == JWT_SECRET_MAC_DINH
