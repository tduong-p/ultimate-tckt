from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models.case import CaseType

DAU_SO_HOP_LE = ("03", "05", "07", "08", "09")


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    status: str
    filename: str
    reason: str
    is_required: bool
    allow_not_applicable: bool
    is_adhoc: bool


class ActionOut(BaseModel):
    action_code: str
    label: str
    requires_reason: bool


class CaseEventOut(BaseModel):
    created_at: datetime
    action_label: str
    to_status_label: str
    actor_name: str
    reason: str


class CaseOut(BaseModel):
    id: int
    code: str
    case_type: str
    status: str
    status_label: str
    unit_name: str
    applicant_name: str
    state_entered_at: datetime
    days_in_status: int
    documents: list[DocumentOut]
    available_actions: list[ActionOut]


class CreateCaseIn(BaseModel):
    case_type: CaseType
    batch_id: int | None = None


class ActionIn(BaseModel):
    action_code: str
    reason: str = ""


class CaseDetailIn(BaseModel):
    phone: str
    personal_email: EmailStr
    citizen_id: str
    permanent_address: str = Field(min_length=10, max_length=250)
    temp_address: str = Field(default="", max_length=250)
    emergency_contact_name: str = Field(max_length=255)
    emergency_contact_relation: str = Field(max_length=50)
    emergency_contact_phone: str
    gpa: float = Field(ge=0, le=4)
    conduct_score: int = Field(ge=-110, le=100)

    @field_validator("phone", "emergency_contact_phone")
    @classmethod
    def kiem_tra_sdt(cls, value: str) -> str:
        if not value.isdigit() or len(value) != 10 or value[:2] not in DAU_SO_HOP_LE:
            raise ValueError("Số điện thoại phải gồm 10 chữ số hợp lệ.")
        return value

    @field_validator("citizen_id")
    @classmethod
    def kiem_tra_cccd(cls, value: str) -> str:
        if not value.isdigit() or len(value) != 12:
            raise ValueError("Số CCCD phải gồm 12 chữ số.")
        return value

    @model_validator(mode="after")
    def sdt_khan_cap_khac_sdt_ca_nhan(self) -> "CaseDetailIn":
        if self.phone == self.emergency_contact_phone:
            raise ValueError("SĐT khẩn cấp không được trùng với SĐT cá nhân.")
        return self


class CaseDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    phone: str
    personal_email: str
    citizen_id: str
    permanent_address: str
    temp_address: str
    emergency_contact_name: str
    emergency_contact_relation: str
    emergency_contact_phone: str
    gpa: float | None
    conduct_score: int | None
