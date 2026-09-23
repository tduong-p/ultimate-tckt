import pytest
from sqlalchemy import select

from app.errors import PermissionDenied
from app.models.case import Case, CaseType
from app.models.identity import Role, Unit, UnitKind, User
from app.models.workflow import TransitionDef
from app.seeds.workflow_seed import seed_workflow
from app.services.workflow import apply_action

# `quan_tri` NẰM TRONG danh sách này: quyền của quản trị cũng phải do dữ liệu
# `transition_def.allowed_roles` quyết định như mọi vai trò khác (spec §6.2 chỉ
# cấp cho quản trị các ô "Thêm đầu mục phát sinh" / "Huỷ hồ sơ"). Loại nó ra
# khỏi vòng kiểm phủ định chính là thứ đã che lỗ hổng "quản trị tự duyệt".
MOI_VAI_TRO = ["sinh_vien", "can_bo_don_vi", "tckt", "vp_doan", "chi_bo", "quan_tri"]


@pytest.fixture()
def bo_khung(db):
    seed_workflow(db)
    unit = Unit(name="LCĐ Khoa CNTT", kind=UnitKind.LIEN_CHI_DOAN)
    db.add(unit)
    db.flush()
    applicant = User(email="sv@sis.hust.edu.vn", role=Role.SINH_VIEN, unit_id=unit.id)
    db.add(applicant)
    db.flush()
    actors = {}
    for role in MOI_VAI_TRO:
        actor = applicant if role == "sinh_vien" else User(
            email=f"{role}@sis.hust.edu.vn", role=Role(role), unit_id=unit.id
        )
        if actor is not applicant:
            db.add(actor)
        actors[role] = actor
    db.commit()
    return {"unit": unit, "applicant": applicant, "actors": actors}


def _tao_ho_so(db, bo_khung, status: str, stt: int) -> Case:
    case = Case(
        code=f"KN-{stt}",
        applicant_id=bo_khung["applicant"].id,
        unit_id=bo_khung["unit"].id,
        case_type=CaseType.KET_NAP,
        status=status,
    )
    db.add(case)
    db.commit()
    return case


def test_moi_dong_transition_def_deu_chay_duoc_voi_vai_tro_dung(db, bo_khung):
    transitions = list(db.scalars(select(TransitionDef)))
    stt = 0
    for transition in transitions:
        for role in transition.allowed_roles:
            stt += 1
            case = _tao_ho_so(db, bo_khung, transition.from_status, stt)
            actor = bo_khung["actors"][role]
            apply_action(db, case, transition.action_code, actor, reason="lý do kiểm thử")
            assert case.status == transition.to_status, (transition.action_code, role)
            case.status = "cancelled"  # giải phóng ràng buộc một-hồ-sơ-đang-chạy
            db.commit()


def test_moi_dong_transition_def_deu_chan_vai_tro_sai(db, bo_khung):
    transitions = list(db.scalars(select(TransitionDef)))
    stt = 1000
    for transition in transitions:
        sai_vai_tro = [r for r in MOI_VAI_TRO if r not in transition.allowed_roles]
        for role in sai_vai_tro:
            stt += 1
            case = _tao_ho_so(db, bo_khung, transition.from_status, stt)
            with pytest.raises(PermissionDenied):
                apply_action(db, case, transition.action_code, bo_khung["actors"][role], reason="x")
            case.status = "cancelled"
            db.commit()


def test_quan_tri_khong_duyet_duoc_ho_so_cua_chinh_minh(db, bo_khung):
    """Spec §6.3 #1: không ai duyệt hồ sơ của chính mình, "kể cả khi vai trò và
    đơn vị đều đúng". Quản trị viên cũng là con người có thể xin vào Đảng."""
    quan_tri = bo_khung["actors"]["quan_tri"]
    case = Case(
        code="KN-9000",
        applicant_id=quan_tri.id,
        unit_id=bo_khung["unit"].id,
        case_type=CaseType.KET_NAP,
        status="dt_checking",
    )
    db.add(case)
    db.commit()
    # `cancel` là hành động quản trị ĐƯỢC phép làm trên hồ sơ người khác —
    # nên nếu bị chặn ở đây thì đúng là do luật "hồ sơ của chính mình".
    with pytest.raises(PermissionDenied):
        apply_action(db, case, "cancel", quan_tri, reason="tự huỷ")
    assert case.status == "dt_checking"


def test_quan_tri_khong_tu_nop_roi_tu_day_ho_so_cua_minh_len(db, bo_khung):
    quan_tri = bo_khung["actors"]["quan_tri"]
    case = Case(
        code="KN-9001",
        applicant_id=quan_tri.id,
        unit_id=bo_khung["unit"].id,
        case_type=CaseType.KET_NAP,
        status="draft",
    )
    db.add(case)
    db.commit()
    with pytest.raises(PermissionDenied):
        apply_action(db, case, "submit", quan_tri)
