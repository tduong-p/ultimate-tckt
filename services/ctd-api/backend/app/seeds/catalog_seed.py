from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import DocumentType

# Danh mục DỰ THẢO — chưa đối chiếu văn bản hướng dẫn.
# Xem BA/GHI-CHU-DANH-MUC-GIAY-TO.md; cập nhật sau khi khảo sát BA.
# (code, name, applies_to, is_required, allow_not_applicable, ext, max_mb)
DOCUMENT_TYPES = [
    ("don_xin_vao_dang", "Đơn xin vào Đảng", ["ket_nap"], True, False, ["pdf", "jpg", "png"], 5),
    ("ly_lich", "Lý lịch của người xin vào Đảng", ["ket_nap"], True, False, ["pdf", "jpg", "png"], 5),
    ("chung_nhan_boi_duong", "Giấy chứng nhận lớp bồi dưỡng nhận thức về Đảng",
     ["ket_nap"], True, False, ["pdf", "jpg", "png"], 5),
    ("bang_diem_ky1", "Bảng điểm học kỳ 1", ["ket_nap"], True, False, ["jpg", "png", "pdf"], 5),
    ("bang_diem_ky2", "Bảng điểm học kỳ 2", ["ket_nap"], True, True, ["jpg", "png", "pdf"], 5),
    ("xac_nhan_chi_hoi", "Xác nhận của chi hội sinh viên", ["ket_nap"], True, False, ["pdf", "jpg", "png"], 5),
    ("anh_3x4", "Ảnh 3x4", ["ket_nap", "chuyen_chinh_thuc"], True, False, ["jpg", "png"], 5),
]


def seed_catalog(db: Session) -> None:
    """Idempotent."""
    for order, (code, name, applies, required, allow_na, ext, max_mb) in enumerate(DOCUMENT_TYPES):
        row = db.scalars(select(DocumentType).where(DocumentType.code == code)).first()
        if row is None:
            row = DocumentType(code=code)
            db.add(row)
        row.name, row.applies_to, row.is_required = name, applies, required
        row.allow_not_applicable, row.accepted_ext, row.max_size_mb = allow_na, ext, max_mb
        row.sort_order, row.is_active = order, True
    db.commit()
