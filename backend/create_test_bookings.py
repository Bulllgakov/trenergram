#!/usr/bin/env python3
"""
Create test bookings for testing the Mini App
"""
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import text
from app.db.base import async_session
from app.db.base import engine


async def create_test_bookings():
    """Create test bookings for user with telegram_id 236692046"""

    async with async_session() as db:
        try:
            # First, get the trainer and client IDs
            result = await db.execute(
                text("SELECT id FROM users WHERE telegram_id = '236692046' AND role = 'trainer'")
            )
            trainer = result.fetchone()

            if not trainer:
                print("Trainer with telegram_id 236692046 not found!")
                return

            trainer_id = trainer[0]
            print(f"Found trainer with ID: {trainer_id}")

            # Create test clients
            test_clients = [
                ('111111111', 'maria_sidorova', 'Мария Сидорова', '+79991234567'),
                ('222222222', 'alex_petrov', 'Александр Петров', '+79992345678'),
                ('333333333', 'elena_kozlova', 'Елена Козлова', '+79993456789'),
                ('444444444', 'ivan_ivanov', 'Иван Иванов', '+79994567890'),
                ('555555555', 'olga_smirnova', 'Ольга Смирнова', '+79995678901'),
            ]

            # Create or update clients
            client_ids = []
            for tg_id, username, name, phone in test_clients:
                # Check if client exists
                result = await db.execute(
                    text("SELECT id FROM users WHERE telegram_id = :tg_id AND role = 'client'"),
                    {"tg_id": tg_id}
                )
                client = result.fetchone()

                if not client:
                    await db.execute(
                        text("""
                            INSERT INTO users (telegram_id, telegram_username, name, role, phone, created_at)
                            VALUES (:tg_id, :username, :name, 'client', :phone, NOW())
                        """),
                        {"tg_id": tg_id, "username": username, "name": name, "phone": phone}
                    )
                    await db.commit()

                    result = await db.execute(
                        text("SELECT id FROM users WHERE telegram_id = :tg_id"),
                        {"tg_id": tg_id}
                    )
                    client = result.fetchone()
                    print(f"Created client: {name}")
                else:
                    # Update client name
                    await db.execute(
                        text("UPDATE users SET name = :name WHERE id = :client_id"),
                        {"name": name, "client_id": client[0]}
                    )
                    print(f"Updated client: {name}")

                client_ids.append((client[0], name))

            await db.commit()

            # Create bookings for today and next few days
            now = datetime.now()

            # Create varied bookings
            bookings_data = [
                # Today's bookings
                (client_ids[0][0], now.replace(hour=9, minute=0, second=0, microsecond=0), 'confirmed'),
                (client_ids[1][0], now.replace(hour=11, minute=0, second=0, microsecond=0), 'confirmed'),
                (client_ids[2][0], now.replace(hour=15, minute=0, second=0, microsecond=0), 'pending'),
                (client_ids[3][0], now.replace(hour=17, minute=0, second=0, microsecond=0), 'confirmed'),

                # Tomorrow's bookings
                (client_ids[4][0], (now + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0), 'confirmed'),
                (client_ids[0][0], (now + timedelta(days=1)).replace(hour=14, minute=0, second=0, microsecond=0), 'pending'),
                (client_ids[1][0], (now + timedelta(days=1)).replace(hour=16, minute=0, second=0, microsecond=0), 'confirmed'),

                # Day after tomorrow
                (client_ids[2][0], (now + timedelta(days=2)).replace(hour=9, minute=0, second=0, microsecond=0), 'confirmed'),
                (client_ids[3][0], (now + timedelta(days=2)).replace(hour=11, minute=0, second=0, microsecond=0), 'pending'),

                # Next week
                (client_ids[4][0], (now + timedelta(days=5)).replace(hour=12, minute=0, second=0, microsecond=0), 'confirmed'),
                (client_ids[0][0], (now + timedelta(days=7)).replace(hour=15, minute=0, second=0, microsecond=0), 'confirmed'),
            ]

            # Insert or update bookings
            for client_id, booking_time, status in bookings_data:
                # Check if booking already exists
                result = await db.execute(
                    text("""
                        SELECT id FROM bookings
                        WHERE trainer_id = :trainer_id
                        AND client_id = :client_id
                        AND datetime = :datetime
                    """),
                    {
                        "trainer_id": trainer_id,
                        "client_id": client_id,
                        "datetime": booking_time
                    }
                )
                existing = result.fetchone()

                if not existing:
                    await db.execute(
                        text("""
                            INSERT INTO bookings
                            (trainer_id, client_id, datetime, duration, price, status, is_paid, created_at)
                            VALUES
                            (:trainer_id, :client_id, :datetime, 60, 2000, :status, false, NOW())
                        """),
                        {
                            "trainer_id": trainer_id,
                            "client_id": client_id,
                            "datetime": booking_time,
                            "status": status
                        }
                    )
                    # Find client name
                    client_name = next((name for cid, name in client_ids if cid == client_id), "Unknown")
                    print(f"Created booking for {client_name} at {booking_time.strftime('%Y-%m-%d %H:%M')}")
                else:
                    # Update existing booking
                    await db.execute(
                        text("""
                            UPDATE bookings
                            SET status = :status
                            WHERE id = :booking_id
                        """),
                        {
                            "status": status,
                            "booking_id": existing[0]
                        }
                    )
                    print(f"Updated booking at {booking_time.strftime('%Y-%m-%d %H:%M')}")

            await db.commit()
            print("\nTest bookings created successfully!")

            # Show created bookings
            result = await db.execute(
                text("""
                    SELECT b.datetime, b.status, u.name
                    FROM bookings b
                    JOIN users u ON b.client_id = u.id
                    WHERE b.trainer_id = :trainer_id
                    ORDER BY b.datetime
                """),
                {"trainer_id": trainer_id}
            )

            print("\nCurrent bookings:")
            for row in result:
                print(f"  {row[0].strftime('%Y-%m-%d %H:%M')} - {row[2]} ({row[1]})")

        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()


if __name__ == "__main__":
    asyncio.run(create_test_bookings())