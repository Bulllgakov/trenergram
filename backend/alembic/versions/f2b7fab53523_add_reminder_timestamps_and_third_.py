"""add_reminder_timestamps_and_third_reminder

Revision ID: f2b7fab53523
Revises: 57e0e2feef3e
Create Date: 2025-10-30 18:17:43.978067

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2b7fab53523'
down_revision: Union[str, None] = '57e0e2feef3e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add third reminder flag
    op.add_column('bookings', sa.Column('reminder_3_sent', sa.Boolean(), nullable=False, server_default='false'))

    # Add reminder timestamps for tracking intervals
    op.add_column('bookings', sa.Column('reminder_1_sent_at', sa.DateTime(), nullable=True))
    op.add_column('bookings', sa.Column('reminder_2_sent_at', sa.DateTime(), nullable=True))
    op.add_column('bookings', sa.Column('reminder_3_sent_at', sa.DateTime(), nullable=True))

    # Add client reminder columns if they don't exist
    # These might already exist, so we'll add them safely
    # Note: client_reminder_* columns already exist in production DB, so commenting out
    # op.add_column('bookings', sa.Column('client_reminder_2h_sent', sa.Boolean(), nullable=False, server_default='false'))
    # op.add_column('bookings', sa.Column('client_reminder_1h_sent', sa.Boolean(), nullable=False, server_default='false'))
    # op.add_column('bookings', sa.Column('client_reminder_15m_sent', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    # Remove the added columns
    op.drop_column('bookings', 'reminder_3_sent_at')
    op.drop_column('bookings', 'reminder_2_sent_at')
    op.drop_column('bookings', 'reminder_1_sent_at')
    op.drop_column('bookings', 'reminder_3_sent')

    # Uncomment if client_reminder columns were added in upgrade
    # op.drop_column('bookings', 'client_reminder_15m_sent')
    # op.drop_column('bookings', 'client_reminder_1h_sent')
    # op.drop_column('bookings', 'client_reminder_2h_sent')
