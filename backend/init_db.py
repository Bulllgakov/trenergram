#!/usr/bin/env python
"""
Initialize database with all tables
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.base_sync import Base
from app.db.session import engine
from app.models import User, UserRole, TrainerClient, Club, Booking, Schedule, TimeSlot

def init_db():
    """Initialize database with tables"""
    print("Creating database tables...")

    # Create all tables
    Base.metadata.create_all(bind=engine)

    print("✅ Database tables created successfully!")
    print("\nCreated tables:")
    for table_name in Base.metadata.tables.keys():
        print(f"  - {table_name}")

if __name__ == "__main__":
    init_db()