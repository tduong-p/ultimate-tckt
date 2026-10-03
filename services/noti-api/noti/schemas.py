from typing import Any, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, EmailStr, Field, StrictStr


class RecipientIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    email: EmailStr
    name: StrictStr | None = Field(default=None, max_length=200)
    variables: dict[str, Any] = Field(default_factory=dict)


class NotificationIn(BaseModel):
    """Thân `POST /v1/notifications` (SPEC-NOTI-001 §5). Lỗi kiểu dữ liệu → 400 `validation_error`."""

    model_config = ConfigDict(extra="ignore")

    template: StrictStr = Field(min_length=1, max_length=100)
    recipients: list[RecipientIn] = Field(min_length=1, max_length=50)
    cc: list[EmailStr] = Field(default_factory=list, max_length=50)
    reply_to: EmailStr | None = None
    priority: Literal["high", "normal", "low"] = "normal"
    expires_at: AwareDatetime | None = None
    source_ref: StrictStr | None = Field(default=None, max_length=255)
    data: dict[str, Any] = Field(default_factory=dict)
    dedupe_key: StrictStr | None = Field(default=None, min_length=1, max_length=255)


def format_errors(errors: list[dict]) -> list[str]:
    details = []
    for err in errors:
        loc = ".".join(str(x) for x in err.get("loc", []) if x != "body")
        msg = err.get("msg", "")
        details.append(f"{loc}: {msg}" if loc else msg)
    return details
