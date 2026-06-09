"""add notifications

Revision ID: b5c6d7e8f901
Revises: a4b8c9d0e1f2
Create Date: 2026-06-09 16:05:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b5c6d7e8f901"
down_revision: Union[str, Sequence[str], None] = "a4b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    channel = postgresql.ENUM(
        "email",
        "push",
        name="notificationchannel",
        create_type=False,
    )
    event_type = postgresql.ENUM(
        "return_due",
        "borrowing_approved",
        name="notificationeventtype",
        create_type=False,
    )
    channel.create(op.get_bind(), checkfirst=True)
    event_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "notification_preferences",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("email_enabled", sa.Boolean(), nullable=False),
        sa.Column("push_enabled", sa.Boolean(), nullable=False),
        sa.Column("return_due_notice_hours", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_table(
        "notification_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("borrowing_id", sa.Integer(), nullable=True),
        sa.Column("event_type", event_type, nullable=False),
        sa.Column("channel", channel, nullable=False),
        sa.Column("payload", sa.String(length=1000), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["borrowing_id"], ["borrowings.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("notification_events")
    op.drop_table("notification_preferences")
    sa.Enum("return_due", "borrowing_approved", name="notificationeventtype").drop(
        op.get_bind(),
        checkfirst=True,
    )
    sa.Enum("email", "push", name="notificationchannel").drop(
        op.get_bind(),
        checkfirst=True,
    )
