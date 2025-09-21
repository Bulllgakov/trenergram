#!/usr/bin/env python
"""
Test registration flow with contact sharing
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models import User, UserRole

def check_users():
    """Check registered users in database"""
    db = SessionLocal()
    try:
        users = db.query(User).all()

        if not users:
            print("No users found in database")
            return

        print(f"\nFound {len(users)} users in database:\n")
        print("-" * 60)

        for user in users:
            print(f"ID: {user.id}")
            print(f"Name: {user.name}")
            print(f"Role: {user.role}")
            print(f"Phone: {user.phone}")
            print(f"Telegram ID: {user.telegram_id}")
            print(f"Telegram Username: @{user.telegram_username}" if user.telegram_username else "No username")

            if user.role == UserRole.TRAINER:
                print(f"Price: {user.price}₽/час")
                print(f"Club ID: {user.club_id}")
                print(f"Specialization: {user.specialization}")

            print("-" * 60)

    finally:
        db.close()

if __name__ == "__main__":
    check_users()