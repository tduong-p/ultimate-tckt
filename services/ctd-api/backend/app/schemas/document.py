from pydantic import BaseModel

from app.models.document import DocStatus


class VerdictIn(BaseModel):
    # Khai đúng kiểu để Pydantic chặn giá trị lạ ngay ở tầng schema (422).
    # Ép kiểu bằng tay trong router (`DocStatus(payload.verdict)`) làm giá trị
    # sai ném ValueError trần và biến thành 500.
    verdict: DocStatus
    reason: str = ""


class NotApplicableIn(BaseModel):
    reason: str


class AdhocIn(BaseModel):
    name: str


class SignedUrlOut(BaseModel):
    url: str
    expires_seconds: int
