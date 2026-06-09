"""add user approval

Revision ID: a4b8c9d0e1f2
Revises: 9d2e7a6c5b1f
Create Date: 2026-06-09 15:45:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a4b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "9d2e7a6c5b1f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_approved",
            sa.Boolean(),
            server_default=sa.true(),
            nullable=False,
        ),
    )
    op.alter_column("users", "is_approved", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "is_approved")
