from sqlalchemy import func as sa_func, select
from sqlalchemy.orm import Session
import json

from app.errors import BusinessError
from app.infra.storage import get_storage
from app.models.case import Case
from app.models.document import DocStatus, Document, DocumentType
from app.models.identity import User
from app.services.permissions import ThaoTac, kiem_quyen


def snapshot_for_case(db: Session, case: Case) -> list[Document]:
    """Chép danh mục giấy tờ HIỆN HÀNH thành các dòng của riêng hồ sơ này.
    Gọi đúng một lần lúc tạo hồ sơ; gọi lại thì trả về ảnh đã chụp, không chụp đè."""
    if case.documents:
        return list(case.documents)

    types = db.scalars(
        select(DocumentType)
        .where(
            DocumentType.is_active.is_(True),
            sa_func.json_contains(
                DocumentType.applies_to,
                json.dumps(case.case_type.value),  # e.g. '"ket_nap"' — valid JSON scalar
            ),
        )
        .order_by(DocumentType.sort_order)
    ).all()
    for doc_type in types:
        db.add(
            Document(
                case_id=case.id,
                document_type_id=doc_type.id,
                name=doc_type.name,
                is_required=doc_type.is_required,
                allow_not_applicable=doc_type.allow_not_applicable,
                sort_order=doc_type.sort_order,
            )
        )
    db.commit()
    db.refresh(case)
    return list(case.documents)


def add_adhoc(db: Session, case: Case, name: str, user: User) -> Document:
    """Đầu mục phát sinh cho RIÊNG một hồ sơ — không đụng danh mục chuẩn.
    Sinh viên không được thêm; nếu cho phép thì checklist mất ý nghĩa ràng buộc."""
    kiem_quyen(case, user, ThaoTac.THEM_DAU_MUC)
    doc = Document(case_id=case.id, name=name, is_adhoc=True, is_required=True, sort_order=900)
    db.add(doc)
    db.commit()
    # Session dùng expire_on_commit=False (app/db.py và tests/conftest.py) nên
    # commit() không tự làm mới collection `case.documents` đã nạp sẵn trong bộ
    # nhớ — phải refresh() để đối tượng `case` đang giữ trong tay phản ánh đúng.
    # Mọi hàm sau này thêm Document qua case_id thô cũng phải làm vậy.
    db.refresh(case)
    db.refresh(doc)
    return doc


def mark_verdict(db: Session, document: Document, verdict: DocStatus, reason: str, user: User) -> Document:
    kiem_quyen(document.case, user, ThaoTac.DANH_GIA_GIAY_TO)
    if verdict not in (DocStatus.ACCEPTED, DocStatus.REJECTED):
        raise BusinessError("Kết luận chỉ có thể là đạt hoặc không đạt.")
    if verdict == DocStatus.REJECTED and not reason.strip():
        raise BusinessError("Cần nhập lý do khi đánh dấu không đạt.")
    document.status = verdict
    document.reason = reason.strip()
    db.commit()
    return document


def mark_not_applicable(db: Session, document: Document, reason: str, user: User) -> Document:
    """Đánh dấu 'không áp dụng' là LỜI KHAI của người nộp về hoàn cảnh của
    chính họ (ví dụ sinh viên năm nhất chưa có bảng điểm kỳ 2) — không phải
    kết luận của cán bộ (cán bộ đã có mark_verdict để nêu kết luận của mình).
    Vì vậy chỉ chủ hồ sơ mới được khai; quản trị được thao tác thay khi cần
    hỗ trợ. Mọi vai trò khác — kể cả cán bộ đang có hồ sơ trong tầm nhìn —
    đều bị chặn ở chốt chung, KHÔNG chỉ lọc ở router."""
    kiem_quyen(document.case, user, ThaoTac.KHAI_KHONG_AP_DUNG)
    if not document.allow_not_applicable:
        raise BusinessError("Giấy tờ này bắt buộc phải nộp, không được đánh dấu không áp dụng.")
    if not reason.strip():
        raise BusinessError("Cần nêu lý do không áp dụng.")
    document.status = DocStatus.NOT_APPLICABLE
    document.reason = reason.strip()
    db.commit()
    db.refresh(document)
    return document


def missing_required(db: Session, case: Case) -> list[Document]:
    """Giấy tờ bắt buộc còn thiếu. Mục đã đánh 'không áp dụng' không tính là thiếu."""
    return [
        doc for doc in case.documents
        if doc.is_required and doc.status in (DocStatus.MISSING, DocStatus.REJECTED)
    ]


def attach_file(
    db: Session, document: Document, filename: str, content_type: str, data: bytes, user: User
) -> Document:
    """Gắn file vào một đầu mục giấy tờ.

    Vị trí lưu file phụ thuộc STORAGE_DRIVER (xem app/infra/storage.py): mặc
    định nên dùng object storage ngoài (S3/R2) để tách dữ liệu khỏi VM chạy
    app; 'local' là lựa chọn được chấp nhận có chủ ý khi không có object
    storage ngoài, khi đó file nằm trên volume Docker riêng (không phải ổ đĩa
    gốc container) và chỉ truy xuất được qua URL ký HMAC ngắn hạn, không public.

    Đính file là lời khai của chính người nộp — cán bộ không đính thay (chốt
    chung `ThaoTac.DINH_FILE`). Thao tác này đặt lại `status=submitted` và xoá
    `reason` của kết luận "không đạt", nên để lọt vai trò khác là mất dấu vết
    kết luận của cán bộ."""
    kiem_quyen(document.case, user, ThaoTac.DINH_FILE)

    doc_type = db.get(DocumentType, document.document_type_id) if document.document_type_id else None
    accepted = doc_type.accepted_ext if doc_type else ["pdf", "jpg", "jpeg", "png"]
    max_mb = doc_type.max_size_mb if doc_type else 5

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in accepted:
        raise BusinessError(f"File sai định dạng. Chỉ nhận: {', '.join(accepted)}.")
    if len(data) > max_mb * 1024 * 1024:
        raise BusinessError(f"File vượt quá dung lượng cho phép ({max_mb} MB).")

    document.version += 1
    document.storage_key = f"cases/{document.case_id}/{document.id}/v{document.version}.{ext}"
    get_storage().put(document.storage_key, data, content_type)

    document.filename = filename
    document.content_type = content_type
    document.size = len(data)
    document.status = DocStatus.SUBMITTED
    document.reason = ""
    db.commit()
    # Session dùng expire_on_commit=False nên phải refresh() để đối tượng đang
    # giữ trong tay phản ánh đúng dữ liệu vừa commit — không thao tác tay.
    db.refresh(document)
    return document
