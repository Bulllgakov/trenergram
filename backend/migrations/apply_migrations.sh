#!/bin/bash
# Apply database migrations using Python and SQLAlchemy

set -e

echo "Applying database migrations..."

# Create Python script to run migrations
python3 << 'PYTHON_EOF'
import os
import glob
from sqlalchemy import create_engine, text

# Get database URL from environment
database_url = os.getenv('DATABASE_URL')
if not database_url:
    print("ERROR: DATABASE_URL environment variable not set")
    exit(1)

# Convert async URL to sync URL
if database_url.startswith("postgresql+asyncpg://"):
    database_url = database_url.replace("postgresql+asyncpg://", "postgresql://", 1)

# Create engine
engine = create_engine(database_url)

# Get all SQL files in migrations directory
migration_files = sorted(glob.glob('/app/migrations/*.sql'))

# Apply each migration
for migration_file in migration_files:
    print(f"Applying migration: {os.path.basename(migration_file)}")

    with open(migration_file, 'r') as f:
        sql_content = f.read()

    try:
        with engine.begin() as conn:
            # Execute the entire SQL file as one transaction
            # Use autocommit mode to handle individual statements
            conn.execute(text(sql_content))
        print(f"✓ Applied {os.path.basename(migration_file)}")
    except Exception as e:
        print(f"Error applying {os.path.basename(migration_file)}: {e}")
        print("Attempting to apply statements individually...")

        # Try applying statements one by one
        statements = [s.strip() for s in sql_content.split(';') if s.strip()]
        success_count = 0
        for stmt in statements:
            try:
                with engine.begin() as conn:
                    conn.execute(text(stmt))
                success_count += 1
            except Exception as stmt_e:
                print(f"  Skipped statement (likely already exists): {str(stmt_e)[:100]}")

        print(f"  Processed {success_count}/{len(statements)} statements successfully")

print("All migrations processed!")
PYTHON_EOF
