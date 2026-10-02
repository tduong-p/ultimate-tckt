from typing import Annotated
from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="NOTI_", env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/noti"
    test_database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/noti_test"
    mail_driver: str = "console"            # console | smtp | graph
    mail_from: str = "noti@example.invalid"
    app_base_url: str = "http://localhost:3000"
    send_rate_per_minute: int = 30
    max_body_bytes: int = 64 * 1024
    recipient_allowlist: Annotated[list[str], NoDecode] = []
    redirect_to: str | None = None
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    graph_tenant: str = ""
    graph_client_id: str = ""
    graph_client_secret: str = ""
    graph_certificate_path: str = ""

    @field_validator("recipient_allowlist", mode="before")
    @classmethod
    def _csv(cls, value):
        if isinstance(value, str):
            return [part.strip() for part in value.split(",") if part.strip()]
        return value


settings = Settings()
