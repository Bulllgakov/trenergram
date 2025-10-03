#!/usr/bin/env python3
"""
Apply database migrations
"""
import asyncio
from sqlalchemy import text
from db.base import async_session
import os


async def apply_migrations():
    """Apply all pending migrations"""

    async with async_session() as db:
        try:
            # Create trainer_slots table
            print("Applying migration: create_trainer_slots...")

            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS trainer_slots (
                    id SERIAL PRIMARY KEY,
                    trainer_id INTEGER NOT NULL REFERENCES users(id),
                    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    is_recurring BOOLEAN DEFAULT TRUE,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))

            # Create indexes
            await db.execute(text("CREATE INDEX IF NOT EXISTS idx_trainer_slots_trainer_id ON trainer_slots(trainer_id)"))
            await db.execute(text("CREATE INDEX IF NOT EXISTS idx_trainer_slots_day_of_week ON trainer_slots(day_of_week)"))
            await db.execute(text("CREATE INDEX IF NOT EXISTS idx_trainer_slots_is_active ON trainer_slots(is_active)"))

            await db.commit()
            print("✅ Migration applied successfully!")

            # Verify table exists
            result = await db.execute(text("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'trainer_slots'
                ORDER BY ordinal_position
            """))
            columns = result.fetchall()

            if columns:
                print("\nTable structure:")
                for col in columns:
                    print(f"  {col[0]}: {col[1]}")
            else:
                print("⚠️  Table not found - might be using SQLite locally")

        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()


if __name__ == "__main__":
    # This will be run on the server after deployment
    asyncio.run(apply_migrations())