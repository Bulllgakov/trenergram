#!/usr/bin/env python3
"""
Script to check trainer reminder settings in the database
Run this on the server: python backend/check_trainers_db.py
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://trenergram_user:trenergram_password@postgres:5432/trenergram_db")

def check_trainers():
    """Check all trainers reminder settings"""
    print("=" * 80)
    print("🔍 Checking trainer reminder settings in database")
    print("=" * 80)

    try:
        # Create engine
        engine = create_engine(DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()

        # Query trainers
        query = text("""
            SELECT
                id,
                telegram_id,
                name,
                reminder_1_days_before,
                reminder_1_time,
                reminder_2_hours_after,
                reminder_3_hours_after,
                auto_cancel_hours_after,
                timezone,
                created_at
            FROM trainers
            ORDER BY id;
        """)

        result = session.execute(query)
        trainers = result.fetchall()

        if not trainers:
            print("❌ No trainers found in database!")
            return

        print(f"\n✅ Found {len(trainers)} trainer(s):\n")

        for trainer in trainers:
            print(f"📋 Trainer ID: {trainer.id}")
            print(f"   Telegram ID: {trainer.telegram_id}")
            print(f"   Name: {trainer.name}")
            print(f"   Timezone: {trainer.timezone}")
            print(f"   Created: {trainer.created_at}")
            print(f"\n   📅 Reminder Settings:")
            print(f"      1️⃣ First reminder:")
            print(f"         - Days before: {trainer.reminder_1_days_before}")
            print(f"         - Time: {trainer.reminder_1_time}")
            print(f"         - Type: {type(trainer.reminder_1_time)}")
            print(f"      2️⃣ Second reminder: {trainer.reminder_2_hours_after} hours after first")
            print(f"      3️⃣ Third reminder: {trainer.reminder_3_hours_after} hours after second")
            print(f"      ❌ Auto-cancel: {trainer.auto_cancel_hours_after} hours after third")

            # Check for issues
            issues = []
            if trainer.reminder_1_time is None:
                issues.append("⚠️  reminder_1_time is NULL (will use default 20:00)")
            if trainer.reminder_1_days_before is None:
                issues.append("⚠️  reminder_1_days_before is NULL (will use default 1)")
            if trainer.timezone is None:
                issues.append("⚠️  timezone is NULL (will use default Europe/Moscow)")

            if issues:
                print(f"\n   🚨 ISSUES FOUND:")
                for issue in issues:
                    print(f"      {issue}")
            else:
                print(f"\n   ✅ All settings are set")

            print("\n" + "-" * 80 + "\n")

        session.close()

    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    check_trainers()
