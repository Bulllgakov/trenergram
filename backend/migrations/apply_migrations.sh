#!/bin/bash
# Apply database migrations

set -e

echo "Applying database migrations..."

# Get database connection details from environment
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-trenergram_db}"
DB_USER="${DB_USER:-trenergram_user}"
PGPASSWORD="${DB_PASSWORD:-trenergram_pass}"

export PGPASSWORD

# Apply migrations in order
for migration in /app/migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "Applying migration: $(basename $migration)"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration"
        echo "✓ Applied $(basename $migration)"
    fi
done

echo "All migrations applied successfully!"
