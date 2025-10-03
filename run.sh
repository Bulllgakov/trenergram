#!/bin/bash

# Startup script for TimeWeb
set -e

echo "Starting Trenergram application..."
echo "PORT: ${PORT:-8000}"

# Set Python path
export PYTHONPATH=/app/backend:$PYTHONPATH

# Navigate to backend directory
cd backend || exit 1

echo "Working directory: $(pwd)"

# Start the FastAPI application directly
echo "Starting FastAPI server..."
exec python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}