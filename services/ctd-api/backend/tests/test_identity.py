import pytest
from sqlalchemy.exc import IntegrityError

from app.models.identity import Role, Unit, UnitKind, User


def test_unit_kind_phan_biet_cap_don_vi_va_cap_dai_hoc():
    assert UnitKind.DOAN_TRUONG.holds_cases is True
    assert UnitKind.LIEN_CHI_DOAN.holds_cases is True
    assert UnitKind.TCKT.holds_cases is False
    assert UnitKind.VP_DOAN.holds_cases is False


def test_khong_tao_duoc_hai_don_vi_trung_ten(db):
    db.add(Unit(name="LCĐ Khoa CNTT", kind=UnitKind.LIEN_CHI_DOAN))
    db.commit()
    db.add(Unit(name="LCĐ Khoa CNTT", kind=UnitKind.LIEN_CHI_DOAN))
    with pytest.raises(IntegrityError):
        db.commit()


def test_gan_can_bo_vao_don_vi(db):
    unit = Unit(name="LCĐ Khoa Điện", kind=UnitKind.LIEN_CHI_DOAN)
    db.add(unit)
    db.flush()
    user = User(
        email="canbo@sis.hust.edu.vn",
        full_name="Trần Văn Hùng",
        role=Role.CAN_BO_DON_VI,
        unit_id=unit.id,
    )
    db.add(user)
    db.commit()
    assert user.unit.name == "LCĐ Khoa Điện"
