#!/usr/bin/env python3
"""
Create trainer_slots table
"""
import asyncio
from sqlalchemy import text
from app.db.base import async_session


async def create_slots_table():
    """Create trainer_slots table if it doesn't exist"""

    async with async_session() as db:
        try:
            # Create trainer_slots table
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS trainer_slots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    trainer_id INTEGER NOT NULL,
                    day_of_week INTEGER NOT NULL,
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    is_recurring BOOLEAN DEFAULT 1,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (trainer_id) REFERENCES users (id)
                )
            """))

            await db.commit()
            print("✅ trainer_slots table created successfully")

            # Check if table was created
            result = await db.execute(text("PRAGMA table_info(trainer_slots)"))
            columns = result.fetchall()

            print("\nTable structure:")
            for col in columns:
                print(f"  {col[1]}: {col[2]}")

        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()


if __name__ == "__main__":
    asyncio.run(create_slots_table())