#!/usr/bin/env python
"""Startup script for TimeWeb deployment"""

import os
import sys
import uvicorn

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting Trenergram on port {port}...")

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=True
    )