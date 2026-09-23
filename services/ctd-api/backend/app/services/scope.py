from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models.case import Case, DRAFT_STATUS, FORWARDED_STATUS
from app.models.identity import Role, User


def visible_cases(db: Session, user: User) -> Select:
    """Câu truy vấn hồ sơ user được phép thấy. Router thêm bộ lọc lên trên.

    Một luật cho mọi vai trò — không có ngoại lệ rải rác trong router."""
    query = select(Case)
    if user.role == Role.SINH_VIEN:
        return query.where(Case.applicant_id == user.id)
    if user.role == Role.CAN_BO_DON_VI:
        # Hồ sơ "draft" là bản sinh viên chưa gửi — cán bộ đơn vị không có lý
        # do nghiệp vụ nào để thấy nó trước khi sinh viên chủ động nộp.
        return query.where(Case.unit_id == user.unit_id, Case.status != DRAFT_STATUS)
    if user.role == Role.CHI_BO:
        # Chi bộ chỉ thấy hồ sơ đã chuyển đến mình, không thấy hồ sơ đang xử lý dở.
        return query.where(Case.status == FORWARDED_STATUS)
    if user.role in (Role.TCKT, Role.VP_DOAN):
        # Cùng lý do như cán bộ đơn vị: hồ sơ chưa gửi thì chưa ai ngoài người
        # nộp có quyền thấy.
        return query.where(Case.status != DRAFT_STATUS)
    if user.role == Role.QUAN_TRI:
        return query
    return query.where(False)
