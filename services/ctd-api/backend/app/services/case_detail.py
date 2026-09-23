from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.audit import FieldChange
from app.models.case import Case, CaseDetail
from app.models.identity import User
from app.services.permissions import ThaoTac, kiem_quyen


def _co_thay_doi(cu, moi) -> bool:
    """So sánh giá trị cũ/mới đúng kiểu.

    Không dùng `str(x or "")`: mẹo đó gộp None, 0 và "" thành một, làm mất
    những giá trị biên hợp lệ như GPA 0 hoặc điểm rèn luyện 0.
    """
    if cu is None and moi is None:
        return False
    if cu is None or moi is None:
        return True
    if isinstance(cu, Decimal) or isinstance(moi, Decimal):
        # Numeric(3,2) đọc từ DB ra Decimal('3.40'), giá trị gửi lên là float 3.4
        return Decimal(str(cu)) != Decimal(str(moi))
    return cu != moi


def _ghi_gia_tri(gia_tri) -> str:
    """Chuyển giá trị thành chuỗi để lưu nhật ký.

    Chỉ `None` (chưa khai) mới thành chuỗi rỗng. Số 0 và chuỗi rỗng là những
    giá trị đã khai thật, phải giữ nguyên — "chưa khai" khác "khai bằng 0".
    """
    return "" if gia_tri is None else str(gia_tri)


def update_detail(db: Session, case: Case, payload: dict, user: User) -> CaseDetail:
    # Thông tin trong hồ sơ là do CHÍNH đương sự khai và chịu trách nhiệm —
    # cán bộ không sửa hộ (spec §6.2). Cùng chốt với các thao tác khác.
    kiem_quyen(case, user, ThaoTac.SUA_THONG_TIN)

    detail = db.get(CaseDetail, case.id)
    if detail is None:
        detail = CaseDetail(case_id=case.id)
        db.add(detail)
        db.flush()

    for field, new_value in payload.items():
        old_value = getattr(detail, field, None)
        if not _co_thay_doi(old_value, new_value):
            continue
        db.add(
            FieldChange(
                case_id=case.id,
                field_name=field,
                old_value=_ghi_gia_tri(old_value),
                new_value=_ghi_gia_tri(new_value),
                actor_id=user.id,
            )
        )
        setattr(detail, field, new_value)
    db.commit()
    db.refresh(detail)
    return detail
