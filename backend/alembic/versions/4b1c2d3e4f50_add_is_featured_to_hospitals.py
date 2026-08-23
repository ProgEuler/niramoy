"""add is_featured to hospitals

Revision ID: 4b1c2d3e4f50
Revises: 08320a78f754
Create Date: 2026-08-19 19:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4b1c2d3e4f50"
down_revision: Union[str, None] = "08320a78f754"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "hospitals",
        sa.Column(
            "is_featured",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.create_index(
        op.f("ix_hospitals_is_featured"),
        "hospitals",
        ["is_featured"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_hospitals_is_featured"), table_name="hospitals")
    op.drop_column("hospitals", "is_featured")
