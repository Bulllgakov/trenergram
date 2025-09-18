#!/bin/bash

# Startup script for TimeWeb

echo "Starting Trenergram application..."

# Debug: Show current directory and structure
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

# Set Python path for different deployment environments
export PYTHONPATH=/app/backend:/opt/build/backend:$(pwd)/backend:$PYTHONPATH

# Navigate to backend directory (try multiple paths)
if [ -d "/app/backend" ]; then
    cd /app/backend
elif [ -d "/opt/build/backend" ]; then
    cd /opt/build/backend
elif [ -d "backend" ]; then
    cd backend
else
    echo "ERROR: Cannot find backend directory!"
    echo "Current directory structure:"
    find . -type d -name backend
    exit 1
fi

echo "Working from: $(pwd)"

# Initialize database (if needed)
echo "Initializing database..."
python -c "
import asyncio
import sys
import os
sys.path.insert(0, os.getcwd())

try:
    from app.db.base import Base, engine

    async def init():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await engine.dispose()
        print('Database initialized successfully')

    asyncio.run(init())
except Exception as e:
    print(f'Database initialization skipped: {e}')
" || echo "Database initialization failed or skipped"

# Start the FastAPI application
echo "Starting FastAPI on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1