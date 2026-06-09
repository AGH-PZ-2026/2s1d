"""add locations to items

Revision ID: 7f4e2b9c8d1a
Revises: 533e74d956e2, a568afb1e530
Create Date: 2026-06-09 14:45:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "7f4e2b9c8d1a"
down_revision: Union[str, Sequence[str], None] = (
    "533e74d956e2",
    "a568afb1e530",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    location_kind = sa.Enum("internal", "external", name="locationkind")
    location_kind.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "locations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("kind", location_kind, nullable=False),
        sa.Column("building", sa.String(length=80), nullable=True),
        sa.Column("room", sa.String(length=80), nullable=True),
        sa.Column("cabinet", sa.String(length=80), nullable=True),
        sa.Column("shelf", sa.String(length=80), nullable=True),
        sa.Column("map_x", sa.Float(), nullable=True),
        sa.Column("map_y", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.add_column("items", sa.Column("location_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_items_location_id_locations",
        "items",
        "locations",
        ["location_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_items_location_id_locations", "items", type_="foreignkey")
    op.drop_column("items", "location_id")
    op.drop_table("locations")
    sa.Enum("internal", "external", name="locationkind").drop(
        op.get_bind(),
        checkfirst=True,
    )
