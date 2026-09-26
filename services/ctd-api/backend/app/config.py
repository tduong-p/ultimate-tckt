from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Giá trị nằm công khai trong repo và trong .env.example — chỉ dùng được ở máy
# lập trình viên. Khai một chỗ để chốt chặn bên dưới không phải chép lại chuỗi.
JWT_SECRET_MAC_DINH = "doi-chuoi-nay-o-moi-truong-that"

# Môi trường duy nhất được phép chạy bằng cấu hình mặc định.
MOI_TRUONG_DEV = "dev"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # dev | staging | production. Mặc định "dev" để máy lập trình viên chạy
    # được ngay; mọi giá trị khác bị coi là môi trường thật và bị siết.
    app_env: str = MOI_TRUONG_DEV

    database_url: str = "mysql+pymysql://root:root@localhost:3306/ctd?charset=utf8mb4"
    test_database_url: str = "mysql+pymysql://root:root@localhost:3306/ctd_test?charset=utf8mb4"

    jwt_secret: str = "doi-chuoi-nay-o-moi-truong-that"
    jwt_ttl_minutes: int = 480

    mailer_driver: str = "console"   # console | smtp
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    mail_from: str = "no-reply@example.edu.vn"

    storage_driver: str = "memory"   # memory | s3 | local
    s3_endpoint: str = ""
    s3_bucket: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    local_storage_dir: str = "/app/storage/documents"

    @model_validator(mode="after")
    def _chan_secret_mac_dinh(self) -> "Settings":
        """Fail-fast lúc khởi động: quên đặt JWT_SECRET trên môi trường thật thì
        bất kỳ ai đọc repo cũng ký được token `quan_tri` trên hệ thống chứa CCCD
        và lý lịch. Thà app không chạy còn hơn chạy với khoá ai cũng biết."""
        if self.app_env != MOI_TRUONG_DEV and self.jwt_secret == JWT_SECRET_MAC_DINH:
            raise ValueError(
                "JWT_SECRET đang là giá trị mặc định công khai trong repo. "
                f"Hãy đặt biến môi trường JWT_SECRET bằng một chuỗi bí mật riêng "
                f"trước khi chạy ở môi trường '{self.app_env}' "
                f"(chỉ APP_ENV={MOI_TRUONG_DEV} mới được dùng giá trị mặc định)."
            )
        return self


settings = Settings()
