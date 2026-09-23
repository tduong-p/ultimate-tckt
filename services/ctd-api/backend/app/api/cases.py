from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import current_user
from app.models.case import Case
from app.models.identity import User
from app.models.workflow import StatusDef, TransitionDef
from app.schemas.case import (
    ActionIn,
    ActionOut,
    CaseDetailIn,
    CaseDetailOut,
    CaseEventOut,
    CaseOut,
    CreateCaseIn,
    DocumentOut,
)
from app.services import case_detail as detail_service
from app.services import cases as case_service
from app.services import workflow
from app.services.scope import visible_cases

router = APIRouter(prefix="/api/cases", tags=["cases"])


def _to_out(db: Session, case: Case, user: User) -> CaseOut:
    status_def = db.get(StatusDef, case.status)
    entered = case.state_entered_at
    days = (datetime.now(timezone.utc) - entered).days if entered else 0
    return CaseOut(
        id=case.id,
        code=case.code,
        case_type=case.case_type.value,
        status=case.status,
        status_label=status_def.label if status_def else case.status,
        unit_name=case.unit.name if case.unit else "",
        applicant_name=case.applicant.full_name if case.applicant else "",
        state_entered_at=entered,
        days_in_status=days,
        documents=[DocumentOut.model_validate(d) for d in case.documents],
        available_actions=[
            ActionOut(action_code=t.action_code, label=t.label, requires_reason=t.requires_reason)
            for t in workflow.available_actions(db, case, user)
        ],
    )


def _lay_ho_so_trong_pham_vi(db: Session, case_id: int, user: User) -> Case:
    case = db.scalars(visible_cases(db, user).where(Case.id == case_id)).first()
    if case is None:
        # Trả 404 chứ không phải 403 — không tiết lộ hồ sơ đó có tồn tại hay không.
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ.")
    return case


@router.post("", status_code=201, response_model=CaseOut)
def tao_ho_so(
    payload: CreateCaseIn, db: Session = Depends(get_db), user: User = Depends(current_user)
) -> CaseOut:
    case = case_service.create_draft(db, user, payload.case_type, payload.batch_id)
    return _to_out(db, case, user)


@router.get("", response_model=list[CaseOut])
def danh_sach(
    status: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> list[CaseOut]:
    query = visible_cases(db, user)
    if status:
        query = query.where(Case.status == status)
    return [_to_out(db, case, user) for case in db.scalars(query.order_by(Case.id.desc()))]


@router.get("/{case_id}", response_model=CaseOut)
def chi_tiet(
    case_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)
) -> CaseOut:
    return _to_out(db, _lay_ho_so_trong_pham_vi(db, case_id, user), user)


@router.post("/{case_id}/actions", response_model=CaseOut)
def thuc_hien_hanh_dong(
    case_id: int,
    payload: ActionIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> CaseOut:
    case = _lay_ho_so_trong_pham_vi(db, case_id, user)
    # Không đặc cách mã hành động nào ở router — điều kiện của từng bước là
    # việc của service (xem `case_service.perform_action`).
    case = case_service.perform_action(db, case, payload.action_code, user, payload.reason)
    return _to_out(db, case, user)


@router.get("/{case_id}/events", response_model=list[CaseEventOut])
def lich_su(
    case_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)
) -> list[CaseEventOut]:
    case = _lay_ho_so_trong_pham_vi(db, case_id, user)
    out = []
    for ev in case_service.events_for(db, case):
        transition = db.scalars(
            select(TransitionDef).where(
                TransitionDef.from_status == ev.from_status, TransitionDef.action_code == ev.action_code
            )
        ).first()
        to_status_def = db.get(StatusDef, ev.to_status)
        actor = db.get(User, ev.actor_id) if ev.actor_id else None
        out.append(
            CaseEventOut(
                created_at=ev.created_at,
                action_label=transition.label if transition else ev.action_code,
                to_status_label=to_status_def.label if to_status_def else ev.to_status,
                actor_name=actor.full_name if actor else "Hệ thống",
                reason=ev.reason,
            )
        )
    return out


@router.put("/{case_id}/detail", response_model=CaseDetailOut)
def cap_nhat_thong_tin(
    case_id: int,
    payload: CaseDetailIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> CaseDetailOut:
    case = _lay_ho_so_trong_pham_vi(db, case_id, user)
    detail = detail_service.update_detail(db, case, payload.model_dump(), user)
    return CaseDetailOut.model_validate(detail)
