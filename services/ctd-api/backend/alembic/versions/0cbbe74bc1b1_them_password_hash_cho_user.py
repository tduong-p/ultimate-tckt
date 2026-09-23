"""them_password_hash_cho_user

Revision ID: 0cbbe74bc1b1
Revises: 0fb960b03bcc
Create Date: 2026-09-16 19:40:03.450100

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0cbbe74bc1b1'
down_revision: Union[str, Sequence[str], None] = '0fb960b03bcc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("app_user", sa.Column("password_hash", sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("app_user", "password_hash")
