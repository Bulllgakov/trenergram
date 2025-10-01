#!/usr/bin/env python3
"""
Check database table structure
"""
import asyncio
from sqlalchemy import text, inspect
from app.db.base import async_session, engine


async def check_structure():
    """Check the actual structure of bookings table"""

    async with async_session() as db:
        try:
            # Get table columns info
            result = await db.execute(text("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'bookings'
                ORDER BY ordinal_position
            """))

            columns = result.fetchall()

            if columns:
                print("PostgreSQL bookings table structure:")
                for col in columns:
                    print(f"  {col[0]}: {col[1]}")
            else:
                # Try SQLite approach
                result = await db.execute(text("PRAGMA table_info(bookings)"))
                columns = result.fetchall()

                if columns:
                    print("SQLite bookings table structure:")
                    for col in columns:
                        print(f"  {col[1]}: {col[2]}")
                else:
                    print("No bookings table found")

            # Check if we have any bookings
            result = await db.execute(text("SELECT COUNT(*) FROM bookings"))
            count = result.scalar()
            print(f"\nTotal bookings: {count}")

            # Check sample booking
            result = await db.execute(text("""
                SELECT * FROM bookings LIMIT 1
            """))
            booking = result.fetchone()

            if booking:
                print("\nSample booking:")
                # Get column names
                result = await db.execute(text("""
                    SELECT * FROM bookings WHERE 1=0
                """))
                columns = result.keys()

                for i, col in enumerate(columns):
                    print(f"  {col}: {booking[i]}")

        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(check_structure())