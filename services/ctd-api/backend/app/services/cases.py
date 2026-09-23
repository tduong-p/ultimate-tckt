from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errors import BusinessError
from app.models.case import Case, CaseDetail, CaseType, DRAFT_STATUS, TERMINAL_STATUSES
from app.models.identity import Role, User
from app.models.workflow import CaseEvent, StatusDef, TransitionDef
from app.services import workflow
from app.services.documents import missing_required, snapshot_for_case

PREFIX = {CaseType.KET_NAP: "KN", CaseType.CHUYEN_CHINH_THUC: "CCT"}


def create_draft(db: Session, applicant: User, case_type: CaseType, batch_id: int | None = None) -> Case:
    dang_chay = db.scalars(
        select(Case).where(Case.applicant_id == applicant.id, Case.status.notin_(TERMINAL_STATUSES))
    ).first()
    if dang_chay is not None:
        raise BusinessError("Bạn chỉ được có một hồ sơ đang xử lý tại một thời điểm.")
    if applicant.unit_id is None:
        raise BusinessError("Tài khoản chưa được gán đơn vị. Liên hệ quản trị viên.")

    # `code` NOT NULL nên chưa có case.id để sinh mã thật lúc khởi tạo — gán
    # một giá trị tạm chắc chắn không trùng (uuid4), rồi ghi đè bằng mã thật
    # ngay sau flush() một khi đã có id từ sequence của Postgres.
    case = Case(
        code=f"tmp-{uuid4().hex[:20]}",  # cột code varchar(30): "tmp-" + 20 ký tự hex vẫn còn dư
        applicant_id=applicant.id,
        unit_id=applicant.unit_id,
        batch_id=batch_id,
        case_type=case_type,
        status=DRAFT_STATUS,
    )
    db.add(case)
    try:
        db.flush()
        # Sinh mã từ id (khoá chính lấy từ sequence, không thể trùng) thay vì
        # count(*) — nhờ vậy IntegrityError sau đây chỉ còn một nguyên nhân
        # duy nhất: đụng hồ sơ đang chạy, không phải trùng mã.
        case.code = f"{PREFIX[case_type]}-{datetime.now(timezone.utc).year}-{case.id:04d}"
        db.add(CaseDetail(case_id=case.id))
        db.commit()
    except IntegrityError:
        db.rollback()
        # DB chặn bằng partial unique index khi hai request chạy song song cùng
        # lọt qua kiểm ở tầng ứng dụng. Dịch thành lỗi nghiệp vụ thay vì để lộ 500.
        raise BusinessError("Bạn chỉ được có một hồ sơ đang xử lý tại một thời điểm.")
    snapshot_for_case(db, case)
    db.refresh(case)
    return case


def _la_buoc_nguoi_nop_ban_giao(transition: TransitionDef) -> bool:
    """Bước mà CHÍNH người nộp đẩy hồ sơ lên cấp trên (submit, resubmit).

    Suy ra từ dữ liệu `transition_def` — không viết cứng mã hành động. Trước
    đây router đặc cách riêng chuỗi "submit", nên `resubmit` không kiểm lại
    giấy tờ: sinh viên bị trả về vì thiếu giấy tờ chỉ cần bấm "Nộp lại" là hồ
    sơ quay lại bàn cán bộ nguyên trạng. Và bản sao thứ hai của mã hành động ở
    router nghĩa là đổi mã trong bảng thì việc kiểm giấy tờ im lặng biến mất."""
    return (
        set(transition.allowed_roles) == {Role.SINH_VIEN.value}
        and transition.to_status not in TERMINAL_STATUSES
    )


def perform_action(db: Session, case: Case, action_code: str, user: User, reason: str = "") -> Case:
    """Cửa duy nhất router gọi: kiểm điều kiện nghiệp vụ của hành động (nếu có)
    rồi giao cho `workflow.apply_action` — nơi duy nhất đổi trạng thái hồ sơ."""
    transition = db.scalars(
        select(TransitionDef).where(
            TransitionDef.from_status == case.status,
            TransitionDef.action_code == action_code,
        )
    ).first()
    # `duoc_phep` chạy trước để người KHÔNG có quyền nhận đúng 403, chứ không
    # phải 400 "thiếu giấy tờ" — apply_action vẫn kiểm lại quyền lần nữa.
    if (
        transition is not None
        and workflow.duoc_phep(case, user, transition)
        and _la_buoc_nguoi_nop_ban_giao(transition)
    ):
        thieu = missing_required(db, case)
        if thieu:
            ten = ", ".join(d.name for d in thieu)
            raise BusinessError(f"Hồ sơ còn thiếu giấy tờ bắt buộc: {ten}.")
    return workflow.apply_action(db, case, action_code, user, reason)


def events_for(db: Session, case: Case) -> list[CaseEvent]:
    """Lịch sử xử lý theo thứ tự thời gian, dùng cho màn S2/C2 (dòng thời gian
    + nhật ký). Nhãn hành động/trạng thái tra từ `transition_def`/`status_def`
    ở router — hàm này chỉ lấy dữ liệu thô."""
    return list(
        db.scalars(select(CaseEvent).where(CaseEvent.case_id == case.id).order_by(CaseEvent.id))
    )
