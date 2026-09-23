"""CHỐT KIỂM QUYỀN DUY NHẤT cho mọi thao tác đổi NỘI DUNG hồ sơ.

Trước đây mỗi hàm tự kiểm quyền theo kiểu riêng, và luôn cùng một hình dạng:

    if user.role == Role.SINH_VIEN:
        ...luật...          # không có else → mọi vai trò khác lọt hết

Hình dạng đó đã bị phát hiện và vá lẻ ba lần, mỗi lần ở một hàm khác nhau, và
mỗi lần lại mọc lại ở hàm kế tiếp. Nên ở đây quyền được khai theo DANH SÁCH
TRẮNG — "vai trò nào được làm gì, trên hồ sơ ở trạng thái nào" — thay cho chuỗi
`if` loại trừ: thêm một thao tác mới mà quên khai luật thì nó bị TỪ CHỐI, chứ
không phải được cho qua.

Hai loại lỗi tách bạch theo quy ước dự án:
  * sai vai trò / không phải hồ sơ của mình → `PermissionDenied` (403)
  * đúng quyền nhưng hồ sơ ở trạng thái không cho sửa → `BusinessError` (400)

Đây KHÔNG phải nơi kiểm chuyển trạng thái hồ sơ — việc đó vẫn của
`services/workflow.apply_action`, nơi duy nhất được gán `case.status`.
"""

import enum
from dataclasses import dataclass

from app.errors import BusinessError, PermissionDenied
from app.models.case import Case, EDITABLE_BY_APPLICANT_STATUSES, TERMINAL_STATUSES
from app.models.identity import Role, User

# Cán bộ các cấp — những vai trò xử lý hồ sơ của người khác.
VAI_TRO_CAN_BO = (Role.CAN_BO_DON_VI, Role.TCKT, Role.VP_DOAN, Role.QUAN_TRI)

HO_SO_DA_KET_THUC = "Hồ sơ đã kết thúc, không thể thay đổi nội dung."
HO_SO_DANG_O_CAP_TREN = "Hồ sơ đang được cấp trên xử lý, không thể chỉnh sửa."


class ThaoTac(enum.StrEnum):
    """Mọi thao tác đổi nội dung hồ sơ đều phải có tên ở đây."""

    DINH_FILE = "dinh_file"
    KHAI_KHONG_AP_DUNG = "khai_khong_ap_dung"
    SUA_THONG_TIN = "sua_thong_tin"
    DANH_GIA_GIAY_TO = "danh_gia_giay_to"
    THEM_DAU_MUC = "them_dau_muc"


@dataclass(frozen=True)
class Cap:
    """Một lần cấp quyền: những vai trò này được làm, có buộc phải là chủ hồ sơ hay không."""

    vai_tro: tuple[Role, ...]
    phai_la_chu_ho_so: bool = False


@dataclass(frozen=True)
class Luat:
    cap_quyen: tuple[Cap, ...]
    # None = mọi trạng thái chưa kết thúc. Không liệt kê tay danh sách trạng
    # thái chưa kết thúc ở đây — nó đã là dữ liệu trong bảng `status_def`.
    trang_thai: tuple[str, ...] | None
    thieu_quyen: str
    sai_trang_thai: str = HO_SO_DANG_O_CAP_TREN


# Ba thao tác dưới đây là LỜI KHAI CỦA NGƯỜI NỘP về chính mình (đính file, khai
# "không áp dụng", điền thông tin cá nhân). Chỉ chủ hồ sơ được làm; quản trị
# được thao tác thay khi cần hỗ trợ. Cán bộ muốn hồ sơ đổi thì dùng
# `request_supplement` để yêu cầu chính sinh viên sửa — đó mới là đường đúng.
_CAP_NGUOI_NOP = (
    Cap((Role.SINH_VIEN,), phai_la_chu_ho_so=True),
    Cap((Role.QUAN_TRI,)),
)

LUAT: dict[ThaoTac, Luat] = {
    ThaoTac.DINH_FILE: Luat(
        cap_quyen=_CAP_NGUOI_NOP,
        trang_thai=EDITABLE_BY_APPLICANT_STATUSES,
        thieu_quyen="Chỉ người nộp hồ sơ mới được đính kèm file.",
    ),
    ThaoTac.KHAI_KHONG_AP_DUNG: Luat(
        cap_quyen=_CAP_NGUOI_NOP,
        trang_thai=EDITABLE_BY_APPLICANT_STATUSES,
        thieu_quyen="Chỉ người nộp hồ sơ mới được đánh dấu không áp dụng.",
    ),
    ThaoTac.SUA_THONG_TIN: Luat(
        cap_quyen=_CAP_NGUOI_NOP,
        trang_thai=EDITABLE_BY_APPLICANT_STATUSES,
        thieu_quyen="Bạn không có quyền sửa thông tin hồ sơ này.",
    ),
    # Hai thao tác của cán bộ trên hồ sơ người khác: làm được suốt quá trình xử
    # lý, nhưng hồ sơ đã kết thúc thì thôi (xem `kiem_quyen`).
    ThaoTac.DANH_GIA_GIAY_TO: Luat(
        cap_quyen=(Cap(VAI_TRO_CAN_BO),),
        trang_thai=None,
        thieu_quyen="Chỉ cán bộ mới được đánh giá giấy tờ.",
    ),
    ThaoTac.THEM_DAU_MUC: Luat(
        cap_quyen=(Cap(VAI_TRO_CAN_BO),),
        trang_thai=None,
        thieu_quyen="Chỉ cán bộ mới được thêm đầu mục giấy tờ.",
    ),
}


def kiem_quyen(case: Case, user: User, thao_tac: ThaoTac) -> None:
    """Cửa duy nhất: không qua được thì ném lỗi, qua được thì trả về None."""
    luat = LUAT[thao_tac]

    duoc_phep = any(
        user.role in cap.vai_tro
        and (not cap.phai_la_chu_ho_so or case.applicant_id == user.id)
        for cap in luat.cap_quyen
    )
    if not duoc_phep:
        raise PermissionDenied(luat.thieu_quyen)

    # Hồ sơ đã kết thúc (forwarded/cancelled) thì không ai được đổi nội dung
    # nữa — kể cả quản trị. Đây là ràng buộc toàn vẹn hồ sơ, áp cho MỌI thao
    # tác, không phải chuyện phân quyền.
    if case.status in TERMINAL_STATUSES:
        raise BusinessError(HO_SO_DA_KET_THUC)
    if luat.trang_thai is not None and case.status not in luat.trang_thai:
        raise BusinessError(luat.sai_trang_thai)
