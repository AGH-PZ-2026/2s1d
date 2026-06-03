"""add items table

Revision ID: b7c2a8f1d4e9
Revises: d0951deb73f1
Create Date: 2026-06-02 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b7c2a8f1d4e9"
down_revision: Union[str, Sequence[str], None] = "d0951deb73f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("system_id", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("manufacturer", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("purchase_date", sa.Date(), nullable=True),
        sa.Column("added_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("status_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
        sa.ForeignKeyConstraint(["status_id"], ["item_status.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_items_system_id"), "items", ["system_id"], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_items_system_id"), table_name="items")
    op.drop_table("items")
