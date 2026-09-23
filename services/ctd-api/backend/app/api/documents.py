from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.deps import current_user
from app.infra.storage import LocalStorage, get_storage, verify_signed_url
from app.models.case import Case
from app.models.document import Document
from app.models.identity import User
from app.schemas.case import DocumentOut
from app.schemas.document import AdhocIn, NotApplicableIn, SignedUrlOut, VerdictIn
from app.services import documents as doc_service
from app.services.scope import visible_cases

router = APIRouter(prefix="/api", tags=["documents"])
URL_TTL_SECONDS = 600


def _lay_giay_to(db: Session, document_id: int, user: User) -> Document:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy giấy tờ.")
    trong_pham_vi = db.scalars(visible_cases(db, user).where(Case.id == document.case_id)).first()
    if trong_pham_vi is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy giấy tờ.")
    return document


@router.post("/documents/{document_id}/file", response_model=DocumentOut)
def tai_len(
    document_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> DocumentOut:
    document = _lay_giay_to(db, document_id, user)
    data = file.file.read()
    doc_service.attach_file(db, document, file.filename or "", file.content_type or "", data, user)
    return DocumentOut.model_validate(document)


@router.post("/documents/{document_id}/verdict", response_model=DocumentOut)
def danh_gia(
    document_id: int,
    payload: VerdictIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> DocumentOut:
    document = _lay_giay_to(db, document_id, user)
    doc_service.mark_verdict(db, document, payload.verdict, payload.reason, user)
    return DocumentOut.model_validate(document)


@router.post("/documents/{document_id}/not-applicable", response_model=DocumentOut)
def khong_ap_dung(
    document_id: int,
    payload: NotApplicableIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> DocumentOut:
    document = _lay_giay_to(db, document_id, user)
    doc_service.mark_not_applicable(db, document, payload.reason, user)
    return DocumentOut.model_validate(document)


@router.get("/documents/{document_id}/url", response_model=SignedUrlOut)
def link_xem_file(
    document_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)
) -> SignedUrlOut:
    document = _lay_giay_to(db, document_id, user)
    if not document.storage_key:
        raise HTTPException(status_code=404, detail="Giấy tờ này chưa có file.")
    return SignedUrlOut(
        url=get_storage().signed_url(document.storage_key, URL_TTL_SECONDS),
        expires_seconds=URL_TTL_SECONDS,
    )


@router.get("/documents/file")
def tai_file_local(key: str, expires: int, sig: str, db: Session = Depends(get_db)) -> Response:
    # KHÔNG kiểm current_user ở đây một cách cố ý — đây là bản tương đương của
    # một presigned URL S3: phân quyền đã được kiểm đúng MỘT LẦN khi
    # link_xem_file() (route /api/documents/{document_id}/url, có current_user
    # + visible_cases) cấp ra link ký ngắn hạn này. Chữ ký HMAC + hạn dùng ở
    # đây đóng vai trò thay cho việc xác thực lại, giống hệt việc S3 không
    # kiểm tra lại IAM mỗi lần GET một presigned URL. Đừng "sửa" bằng cách
    # thêm current_user vào đây — sẽ phá link tải trực tiếp từ trình duyệt.
    if not verify_signed_url(key, expires, sig):
        raise HTTPException(status_code=403, detail="Link đã hết hạn hoặc không hợp lệ.")
    if settings.storage_driver != "local":
        raise HTTPException(status_code=404, detail="Không tìm thấy file.")
    document = db.scalars(select(Document).where(Document.storage_key == key)).first()
    if document is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy file.")
    data = LocalStorage().read(key)
    return Response(content=data, media_type=document.content_type or "application/octet-stream")


@router.post("/cases/{case_id}/documents", status_code=201, response_model=DocumentOut)
def them_dau_muc_phat_sinh(
    case_id: int,
    payload: AdhocIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> DocumentOut:
    case = db.scalars(visible_cases(db, user).where(Case.id == case_id)).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ.")
    return DocumentOut.model_validate(doc_service.add_adhoc(db, case, payload.name, user))
