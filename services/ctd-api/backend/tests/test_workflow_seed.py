from sqlalchemy import func, select

from app.models.workflow import StatusDef, TransitionDef
from app.seeds.workflow_seed import seed_workflow


def test_seed_tao_du_9_trang_thai_va_19_dong_chuyen(db):
    seed_workflow(db)
    assert db.scalar(select(func.count()).select_from(StatusDef)) == 9
    assert db.scalar(select(func.count()).select_from(TransitionDef)) == 19


def test_seed_chay_lai_khong_sinh_dong_trung(db):
    seed_workflow(db)
    seed_workflow(db)
    assert db.scalar(select(func.count()).select_from(StatusDef)) == 9
    assert db.scalar(select(func.count()).select_from(TransitionDef)) == 19


def test_moi_dich_den_cua_buoc_chuyen_deu_la_trang_thai_co_that(db):
    seed_workflow(db)
    codes = set(db.scalars(select(StatusDef.code)))
    for transition in db.scalars(select(TransitionDef)):
        assert transition.from_status in codes
        assert transition.to_status in codes


def test_moi_duong_khong_dat_deu_bat_buoc_ly_do(db):
    seed_workflow(db)
    returning = {"request_supplement", "tckt_return", "meeting_fail", "vp_return", "cancel"}
    for transition in db.scalars(select(TransitionDef)):
        if transition.action_code in returning:
            assert transition.requires_reason is True, transition.action_code


def test_sla_gan_dung_nguoi_giu_ho_so(db):
    seed_workflow(db)
    need_supplement = db.get(StatusDef, "need_supplement")
    assert need_supplement.holder_role == "sinh_vien"
    assert need_supplement.sla_days == 2
    assert db.get(StatusDef, "forwarded").is_terminal is True
    assert db.get(StatusDef, "cancelled").is_terminal is True


def test_moi_trang_thai_chua_ket_thuc_deu_huy_duoc(db):
    """Spec §5.2: huỷ được ở MỌI trạng thái chưa kết thúc — kể cả `draft`.
    Danh sách trạng thái huỷ được phải sinh ra từ chính STATUSES, không chép tay."""
    seed_workflow(db)
    chua_ket_thuc = {s.code for s in db.scalars(select(StatusDef)) if not s.is_terminal}
    huy_duoc = {
        t.from_status for t in db.scalars(select(TransitionDef)) if t.action_code == "cancel"
    }
    assert huy_duoc == chua_ket_thuc
