#!/usr/bin/env python3
"""
Clean up all test bookings from database
"""
import asyncio
from sqlalchemy import text
from app.db.base import async_session


async def cleanup_bookings():
    """Delete all test bookings and keep only real users"""

    async with async_session() as db:
        try:
            # Delete ALL bookings - we'll create real ones manually
            result = await db.execute(text("DELETE FROM bookings"))
            await db.commit()
            print(f"Deleted {result.rowcount} bookings")

            # Check remaining data
            result = await db.execute(text("SELECT COUNT(*) FROM bookings"))
            count = result.scalar()
            print(f"Remaining bookings: {count}")

            # Show trainers
            result = await db.execute(
                text("SELECT id, name, telegram_id FROM users WHERE role = 'trainer'")
            )
            trainers = result.fetchall()
            print("\nTrainers in database:")
            for trainer in trainers:
                print(f"  ID: {trainer[0]}, Name: {trainer[1]}, Telegram ID: {trainer[2]}")

            # Show clients
            result = await db.execute(
                text("SELECT id, name, telegram_id FROM users WHERE role = 'client'")
            )
            clients = result.fetchall()
            print("\nClients in database:")
            for client in clients:
                print(f"  ID: {client[0]}, Name: {client[1]}, Telegram ID: {client[2]}")

            print("\n✅ Database cleaned up. Ready for real bookings!")

        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()


if __name__ == "__main__":
    asyncio.run(cleanup_bookings())