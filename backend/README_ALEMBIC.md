# Alembic Database Migrations

## Overview

Alembic is set up to manage database schema migrations for the Trenergram project.

## Configuration

- **alembic.ini** - Main configuration file
- **alembic/env.py** - Environment configuration, imports all models
- **alembic/versions/** - Migration files directory

## Database Connection

The connection string is configured in `alembic.ini`:

```ini
sqlalchemy.url = postgresql://trenergram_user:trenergram_pass@db:5432/trenergram_db
```

**Note:** This URL is for Docker environment. For local development, you may need to change `@db:` to `@localhost:`.

## Common Commands

### Create a new migration (auto-generate)

```bash
cd backend
alembic revision --autogenerate -m "Add new field to users table"
```

This will:
1. Compare current database schema with models
2. Generate migration file with detected changes
3. Save to `alembic/versions/`

### Create an empty migration

```bash
alembic revision -m "Custom migration"
```

Use this when you need full control over migration logic.

### Apply migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Apply specific number of migrations
alembic upgrade +2

# Apply to specific revision
alembic upgrade ae10f4e3c2b4
```

### Downgrade migrations

```bash
# Downgrade one migration
alembic downgrade -1

# Downgrade to specific revision
alembic downgrade ae10f4e3c2b4

# Downgrade all
alembic downgrade base
```

### View migration history

```bash
# Show current version
alembic current

# Show history
alembic history

# Show pending migrations
alembic history --verbose
```

## Migration File Structure

```python
"""Add user timezone field

Revision ID: ae10f4e3c2b4
Revises:
Create Date: 2025-10-25 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'ae10f4e3c2b4'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('users', sa.Column('timezone', sa.String(50), nullable=True))

def downgrade() -> None:
    op.drop_column('users', 'timezone')
```

## Best Practices

### 1. Always review auto-generated migrations

Alembic's autogenerate is smart but not perfect. Always check the generated migration before applying.

### 2. Test migrations locally first

```bash
# Create test database
createdb trenergram_test

# Update alembic.ini with test DB
# sqlalchemy.url = postgresql://user:pass@localhost/trenergram_test

# Run migration
alembic upgrade head

# Test downgrade
alembic downgrade -1

# Test upgrade again
alembic upgrade head
```

### 3. Name migrations descriptively

Good:
```bash
alembic revision -m "Add reminder settings to users"
alembic revision -m "Create clubs table"
```

Bad:
```bash
alembic revision -m "Update"
alembic revision -m "Fix"
```

### 4. One logical change per migration

Don't combine unrelated changes:

❌ Bad:
```bash
alembic revision -m "Add timezone and fix bookings and update clubs"
```

✅ Good:
```bash
alembic revision -m "Add timezone field to users"
alembic revision -m "Add canceled_at field to bookings"
alembic revision -m "Add max_trainers limit to clubs"
```

### 5. Handle data migrations carefully

When changing column types or moving data:

```python
def upgrade():
    # Create new column
    op.add_column('users', sa.Column('price_new', sa.Integer()))

    # Migrate data
    op.execute("UPDATE users SET price_new = CAST(price AS INTEGER)")

    # Drop old column
    op.drop_column('users', 'price')

    # Rename new column
    op.alter_column('users', 'price_new', new_column_name='price')

def downgrade():
    # Reverse the process
    ...
```

## Common Operations

### Add a new column

```python
def upgrade():
    op.add_column('users',
        sa.Column('new_field', sa.String(100), nullable=True)
    )

def downgrade():
    op.drop_column('users', 'new_field')
```

### Create a new table

```python
def upgrade():
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )

def downgrade():
    op.drop_table('notifications')
```

### Add an index

```python
def upgrade():
    op.create_index('idx_users_telegram_id', 'users', ['telegram_id'])

def downgrade():
    op.drop_index('idx_users_telegram_id')
```

### Modify column

```python
def upgrade():
    op.alter_column('users', 'email',
        existing_type=sa.String(100),
        type_=sa.String(200),
        nullable=False
    )

def downgrade():
    op.alter_column('users', 'email',
        existing_type=sa.String(200),
        type_=sa.String(100),
        nullable=True
    )
```

## Troubleshooting

### "Can't locate revision identified by 'xxxx'"

Reset alembic_version table:

```sql
DELETE FROM alembic_version;
```

Then apply migrations from scratch:

```bash
alembic upgrade head
```

### "Target database is not up to date"

Check current version:

```bash
alembic current
```

Apply pending migrations:

```bash
alembic upgrade head
```

### Auto-generate not detecting changes

Make sure all models are imported in `alembic/env.py`:

```python
from models import (
    User, UserRole, TrainerClient,
    Club, ClubTariff,
    Booking, BookingStatus,
    Schedule, TimeSlot
)
```

### Migration conflicts

If multiple developers create migrations:

1. Pull latest changes
2. If conflict in version chain, use `alembic merge`:

```bash
alembic merge heads -m "Merge branch migrations"
```

## Production Deployment

### Using Docker

Migrations are automatically applied in docker-compose:

```yaml
backend:
  command: >
    sh -c "alembic upgrade head &&
           uvicorn main:app --host 0.0.0.0 --port 8000"
```

### Manual deployment

```bash
# SSH to server
ssh user@server

# Navigate to project
cd /opt/trenergram/backend

# Apply migrations
docker-compose exec backend alembic upgrade head

# Or without Docker:
# cd /opt/trenergram/backend
# alembic upgrade head
```

### Rollback in production

```bash
# Check current version
alembic current

# Downgrade one step
alembic downgrade -1

# Verify
alembic current
```

## Initial Setup (Already Done)

For reference, here's how Alembic was initialized:

```bash
cd backend
pip install alembic
alembic init alembic
```

Then configured:
- `alembic.ini` with database URL
- `alembic/env.py` with model imports
- Created initial migration structure
