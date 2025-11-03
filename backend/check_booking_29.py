#!/usr/bin/env python3
"""
Quick diagnostic script to check booking 29 status
Run: docker exec trenergram-backend-1 python backend/check_booking_29.py
"""

import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://trenergram_user:trenergram_password@postgres:5432/trenergram_db")

def check_booking():
    print("=" * 80)
    print("🔍 Checking Booking 29 Status")
    print("=" * 80)

    try:
        engine = create_engine(DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()

        query = text("""
            SELECT
                id,
                datetime,
                status,
                reminder_24h_sent,
                reminder_2h_sent,
                reminder_3_sent,
                reminder_1_sent_at,
                reminder_2_sent_at,
                reminder_3_sent_at,
                NOW() as current_time,
                EXTRACT(EPOCH FROM (NOW() - reminder_1_sent_at))/3600 as hours_since_first
            FROM bookings
            WHERE id = 29;
        """)

        result = session.execute(query)
        booking = result.fetchone()

        if not booking:
            print("❌ Booking 29 not found!")
            return

        print(f"\n📋 Booking #{booking.id}")
        print(f"   Training datetime: {booking.datetime}")
        print(f"   Status: {booking.status}")
        print(f"   Current server time: {booking.current_time}")
        print(f"\n📨 Reminder Status:")
        print(f"   1st sent: {booking.reminder_24h_sent} at {booking.reminder_1_sent_at}")
        print(f"   2nd sent: {booking.reminder_2h_sent} at {booking.reminder_2_sent_at}")
        print(f"   3rd sent: {booking.reminder_3_sent} at {booking.reminder_3_sent_at}")

        if booking.reminder_1_sent_at:
            print(f"\n⏱️  Hours since 1st reminder: {booking.hours_since_first:.2f}")
            if booking.hours_since_first >= 1:
                if booking.reminder_2h_sent:
                    print("   ✅ 2nd reminder already sent")
                else:
                    print("   ⚠️  2nd reminder SHOULD have been sent (>1 hour passed)!")

        session.close()

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_booking()
