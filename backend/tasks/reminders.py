"""
Celery tasks for sending booking reminders to clients
"""

import asyncio
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from celery_app import celery_app
from db.session import SessionLocal
from models import User, Booking, BookingStatus
from services.notifications import notification_service


@celery_app.task(name="tasks.reminders.check_and_send_reminders")
def check_and_send_reminders():
    """
    Periodic task to check all bookings and send reminders based on trainer settings.

    According to TZ 10.6:
    - First reminder = first notification to client (when trainer creates booking)
    - Reminders sent based on trainer's settings:
      - reminder_1_hours: hours before training (default 24)
      - reminder_1_time: time to send (default 20:00)
      - reminder_2_delay: hours after first reminder (default 2)
      - reminder_3_delay: hours after second reminder (default 4)
    - Auto-cancel if not confirmed within auto_cancel_delay hours
    """
    print(f"[{datetime.now()}] Running check_and_send_reminders task...")

    db: Session = SessionLocal()
    try:
        # Get all upcoming bookings that need reminders
        upcoming_bookings = db.query(Booking).filter(
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
            Booking.datetime > datetime.now()
        ).all()

        print(f"Found {len(upcoming_bookings)} upcoming bookings to check")

        for booking in upcoming_bookings:
            # Get trainer and client
            trainer = db.query(User).filter_by(id=booking.trainer_id).first()
            client = db.query(User).filter_by(id=booking.client_id).first()

            if not trainer or not client:
                print(f"Skipping booking {booking.id}: trainer or client not found")
                continue

            # Calculate time until training
            time_until_training = booking.datetime - datetime.now()
            hours_until_training = time_until_training.total_seconds() / 3600

            # Check if it's time to send first reminder (24h before at 20:00)
            should_send_first = _should_send_first_reminder(
                booking, trainer, hours_until_training
            )

            if should_send_first:
                print(f"Sending first reminder for booking {booking.id}")
                asyncio.run(_send_reminder_async(booking, trainer, client, db, 24))
                booking.reminder_24h_sent = True
                db.commit()
                continue

            # Check if it's time to send second reminder
            if booking.reminder_24h_sent and not booking.reminder_2h_sent:
                hours_since_first = trainer.reminder_2_delay or 2
                if hours_until_training <= (24 - hours_since_first):
                    print(f"Sending second reminder for booking {booking.id}")
                    asyncio.run(_send_reminder_async(booking, trainer, client, db, int(hours_until_training)))
                    booking.reminder_2h_sent = True
                    db.commit()
                    continue

            # Auto-cancel if PENDING and not confirmed within time limit
            if booking.status == BookingStatus.PENDING:
                auto_cancel_hours = trainer.auto_cancel_delay or 5
                if booking.reminder_24h_sent and hours_until_training <= (24 - auto_cancel_hours):
                    print(f"Auto-canceling booking {booking.id} (not confirmed)")
                    booking.status = BookingStatus.CANCELLED
                    booking.cancelled_at = datetime.now()
                    booking.cancellation_reason = "Автоотмена: не подтверждено клиентом"
                    db.commit()

        print(f"[{datetime.now()}] Finished check_and_send_reminders task")

    except Exception as e:
        print(f"Error in check_and_send_reminders: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def _should_send_first_reminder(booking: Booking, trainer: User, hours_until: float) -> bool:
    """
    Check if it's time to send the first reminder.

    Logic:
    - Send at trainer.reminder_1_time (default 20:00) in TRAINER'S timezone
    - When hours_until <= trainer.reminder_1_hours (default 24)
    - Only if not already sent
    """
    if booking.reminder_24h_sent:
        return False

    reminder_hours = trainer.reminder_1_hours or 24
    reminder_time = trainer.reminder_1_time or datetime.strptime("20:00", "%H:%M").time()

    # Check if we're within the reminder window
    if hours_until > reminder_hours:
        return False

    # Get current time in trainer's timezone
    trainer_tz = trainer.timezone or "Europe/Moscow"
    try:
        tz = ZoneInfo(trainer_tz)
        current_time_in_trainer_tz = datetime.now(tz).time()
    except Exception as e:
        print(f"Invalid timezone '{trainer_tz}' for trainer {trainer.id}, using UTC: {e}")
        current_time_in_trainer_tz = datetime.now().time()

    reminder_hour = reminder_time.hour
    reminder_minute = reminder_time.minute

    # Allow 5-minute window around the target time
    is_time_match = (
        current_time_in_trainer_tz.hour == reminder_hour and
        abs(current_time_in_trainer_tz.minute - reminder_minute) <= 5
    )

    return is_time_match


async def _send_reminder_async(
    booking: Booking,
    trainer: User,
    client: User,
    db: Session,
    hours_before: int
):
    """Wrapper to call async send_reminder_to_client function"""
    try:
        await notification_service.send_reminder_to_client(
            booking, trainer, client, hours_before
        )
    except Exception as e:
        print(f"Error sending reminder: {e}")
