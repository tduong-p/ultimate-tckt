from alembic.config import Config
from alembic.script import ScriptDirectory


def test_chi_co_mot_dau_migration():
    """Hai nhánh migration song song sẽ làm deploy hỏng âm thầm."""
    script = ScriptDirectory.from_config(Config("alembic.ini"))
    assert len(script.get_heads()) == 1
