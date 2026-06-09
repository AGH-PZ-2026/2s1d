"""add borrowings

Revision ID: 8c3d6f1a2b4e
Revises: 7f4e2b9c8d1a
Create Date: 2026-06-09 15:05:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "8c3d6f1a2b4e"
down_revision: Union[str, Sequence[str], None] = "7f4e2b9c8d1a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    borrowing_mode = sa.Enum(
        "classic",
        "trusted",
        "asynchronous",
        "external",
        name="borrowingmode",
    )
    borrowing_status = sa.Enum(
        "pending",
        "reserved",
        "borrowed",
        "returned",
        "rejected",
        name="borrowingstatus",
    )
    borrowing_mode.create(op.get_bind(), checkfirst=True)
    borrowing_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "borrowings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("borrower_id", sa.Integer(), nullable=True),
        sa.Column("external_borrower", sa.String(length=160), nullable=True),
        sa.Column("mode", borrowing_mode, nullable=False),
        sa.Column("status", borrowing_status, nullable=False),
        sa.Column("planned_return_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("handed_over_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("returned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("return_comment", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["borrower_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["item_id"], ["items.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("borrowings")
    sa.Enum(
        "pending",
        "reserved",
        "borrowed",
        "returned",
        "rejected",
        name="borrowingstatus",
    ).drop(op.get_bind(), checkfirst=True)
    sa.Enum(
        "classic",
        "trusted",
        "asynchronous",
        "external",
        name="borrowingmode",
    ).drop(op.get_bind(), checkfirst=True)
