from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import InvalidTransition, PermissionDenied, ReasonRequired
from app.models.case import Case
from app.models.identity import Role, User
from app.models.workflow import CaseEvent, TransitionDef
from app.services import events


def duoc_phep(case: Case, user: User, transition: TransitionDef) -> bool:
    """Danh sách trắng cho mọi vai trò, KHÔNG có cửa đi tắt.

    Trước đây `quan_tri` được `return True` ngay dòng đầu, tức là vượt qua cả
    luật "không ai duyệt hồ sơ của chính mình" (spec §6.3 #1 — luật này áp
    dụng "kể cả khi vai trò và đơn vị đều đúng", và §12 liệt nó là quyết định
    đã chốt): quản trị viên tự nộp rồi tự duyệt một mạch draft → forwarded.
    Nó còn trái cả ma trận quyền §6.2, nơi quản trị chỉ có ô "Thêm đầu mục
    phát sinh" và "Huỷ hồ sơ", không có ô duyệt nào. Nay quyền của quản trị
    cũng do dữ liệu `transition_def.allowed_roles` quyết định như mọi vai trò
    khác (seed đã liệt `quan_tri` trong nhóm huỷ hồ sơ)."""
    # Không ai được duyệt hồ sơ của chính mình — kiểm TRƯỚC mọi thứ khác.
    # Sinh viên tự nộp/nộp lại là hành động của người nộp, không phải duyệt.
    if user.role != Role.SINH_VIEN and case.applicant_id == user.id:
        return False
    if user.role.value not in transition.allowed_roles:
        return False
    if user.role == Role.SINH_VIEN and case.applicant_id != user.id:
        return False
    # Cán bộ cấp đơn vị chỉ đụng được hồ sơ của đúng đơn vị mình.
    if user.role == Role.CAN_BO_DON_VI and user.unit_id != case.unit_id:
        return False
    return True


def available_actions(db: Session, case: Case, user: User) -> list[TransitionDef]:
    """Danh sách hành động user được phép làm trên hồ sơ ở trạng thái hiện tại.
    Frontend dựng nút từ đây, không tự suy luận theo trạng thái."""
    candidates = db.scalars(select(TransitionDef).where(TransitionDef.from_status == case.status))
    return [t for t in candidates if duoc_phep(case, user, t)]


def apply_action(db: Session, case: Case, action_code: str, user: User, reason: str = "") -> Case:
    """NƠI DUY NHẤT đổi trạng thái hồ sơ: kiểm quyền → đổi state → ghi nhật ký → phát sự kiện."""
    # Khoá dòng để hai cán bộ bấm cùng lúc không cùng lọt qua. `Case.applicant`
    # và `Case.unit` khai lazy="joined" nên truy vấn này sinh LEFT OUTER JOIN;
    # Postgres từ chối FOR UPDATE trên vế nullable của outer join, nên phải
    # chỉ định `of=Case` để chỉ khoá đúng bảng `case` (được phép vì `case` ở
    # phía trái của join).
    case = db.execute(
        select(Case).where(Case.id == case.id).with_for_update(of=Case)
    ).scalar_one()

    transition = db.scalars(
        select(TransitionDef).where(
            TransitionDef.from_status == case.status,
            TransitionDef.action_code == action_code,
        )
    ).first()
    if transition is None:
        raise InvalidTransition(f"Không thể thực hiện '{action_code}' ở trạng thái hiện tại.")
    if not duoc_phep(case, user, transition):
        raise PermissionDenied("Bạn không có quyền thực hiện hành động này.")
    if transition.requires_reason and not reason.strip():
        raise ReasonRequired("Cần nhập lý do.")

    from_status = case.status
    case.status = transition.to_status
    case.state_entered_at = datetime.now(timezone.utc)
    case.last_reminded_at = None

    db.add(
        CaseEvent(
            case_id=case.id,
            from_status=from_status,
            to_status=case.status,
            action_code=action_code,
            actor_id=user.id,
            actor_role=user.role.value,
            reason=reason.strip(),
        )
    )
    db.flush()
    if transition.event_code:
        events.emit(db, case, transition.event_code, transition)
    db.commit()
    db.refresh(case)
    return case
