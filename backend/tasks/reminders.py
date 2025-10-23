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

    New simplified system:
    - First reminder: sent X days before at reminder_1_time (1, 2, or 3 days)
    - Second reminder: sent Y hours after first (1, 2, or 3 hours)
    - Third reminder: sent Z hours after second (1, 2, or 3 hours)
    - Auto-cancel: W hours after third if not confirmed (1, 2, or 3 hours)
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

            # Track when reminders were sent
            if not hasattr(booking, 'reminder_1_sent_at'):
                booking.reminder_1_sent_at = None
            if not hasattr(booking, 'reminder_2_sent_at'):
                booking.reminder_2_sent_at = None
            if not hasattr(booking, 'reminder_3_sent_at'):
                booking.reminder_3_sent_at = None

            # Check if it's time to send first reminder (X days before at specific time)
            if not booking.reminder_24h_sent:
                if _should_send_first_reminder(booking, trainer):
                    print(f"Sending first reminder for booking {booking.id}")
                    asyncio.run(_send_reminder_async(booking, trainer, client, db, "first"))
                    booking.reminder_24h_sent = True
                    booking.reminder_1_sent_at = datetime.now()
                    db.commit()
                    continue

            # Check if it's time to send second reminder (Y hours after first)
            if booking.reminder_24h_sent and not booking.reminder_2h_sent:
                hours_after_first = trainer.reminder_2_hours_after or 1
                if booking.reminder_1_sent_at:
                    hours_since_first = (datetime.now() - booking.reminder_1_sent_at).total_seconds() / 3600
                    if hours_since_first >= hours_after_first:
                        print(f"Sending second reminder for booking {booking.id}")
                        asyncio.run(_send_reminder_async(booking, trainer, client, db, "second"))
                        booking.reminder_2h_sent = True
                        booking.reminder_2_sent_at = datetime.now()
                        db.commit()
                        continue

            # Check if it's time to send third reminder (Z hours after second)
            if booking.reminder_2h_sent and not hasattr(booking, 'reminder_3_sent'):
                hours_after_second = trainer.reminder_3_hours_after or 1
                if booking.reminder_2_sent_at:
                    hours_since_second = (datetime.now() - booking.reminder_2_sent_at).total_seconds() / 3600
                    if hours_since_second >= hours_after_second:
                        print(f"Sending third reminder for booking {booking.id}")
                        asyncio.run(_send_reminder_async(booking, trainer, client, db, "third"))
                        booking.reminder_3_sent = True
                        booking.reminder_3_sent_at = datetime.now()
                        db.commit()
                        continue

            # Auto-cancel if PENDING and W hours passed after third reminder
            if booking.status == BookingStatus.PENDING:
                if hasattr(booking, 'reminder_3_sent') and booking.reminder_3_sent:
                    auto_cancel_hours = trainer.auto_cancel_hours_after or 1
                    if booking.reminder_3_sent_at:
                        hours_since_third = (datetime.now() - booking.reminder_3_sent_at).total_seconds() / 3600
                        if hours_since_third >= auto_cancel_hours:
                            print(f"Auto-canceling booking {booking.id} (not confirmed)")
                            booking.status = BookingStatus.CANCELLED
                            booking.cancelled_at = datetime.now()
                            booking.cancellation_reason = "Автоотмена: не подтверждено клиентом"

                            # Send auto-cancel notification to client
                            asyncio.run(_send_auto_cancel_notification(booking, trainer, client, db))

                            db.commit()

        print(f"[{datetime.now()}] Finished check_and_send_reminders task")

    except Exception as e:
        print(f"Error in check_and_send_reminders: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def _should_send_first_reminder(booking: Booking, trainer: User) -> bool:
    """
    Check if it's time to send the first reminder.

    New logic:
    - Send X days before training (1, 2, or 3 days)
    - At specific time (reminder_1_time, default 20:00) in TRAINER'S timezone
    - Example: training on Oct 10, reminder_1_days_before=2 → send on Oct 8 at 20:00
    """
    # Get trainer timezone for consistent date/time calculations
    trainer_tz = getattr(trainer, 'timezone', None) or "Europe/Moscow"
    try:
        tz = ZoneInfo(trainer_tz)
        current_datetime_in_trainer_tz = datetime.now(tz)
        current_date_in_trainer_tz = current_datetime_in_trainer_tz.date()
        current_time_in_trainer_tz = current_datetime_in_trainer_tz.time()
    except Exception as e:
        print(f"Invalid timezone '{trainer_tz}' for trainer {trainer.id}, using UTC: {e}")
        current_date_in_trainer_tz = datetime.now().date()
        current_time_in_trainer_tz = datetime.now().time()

    # Calculate days until training using trainer's timezone
    days_until_training = (booking.datetime.date() - current_date_in_trainer_tz).days

    # Get trainer settings
    days_before = trainer.reminder_1_days_before or 1
    reminder_time_str = trainer.reminder_1_time or "20:00"

    # Parse reminder time
    try:
        if isinstance(reminder_time_str, str):
            reminder_time = datetime.strptime(reminder_time_str, "%H:%M").time()
        else:
            reminder_time = reminder_time_str
    except:
        reminder_time = datetime.strptime("20:00", "%H:%M").time()

    # Check if we're on the right day
    if days_until_training != days_before:
        return False

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
    reminder_type: str
):
    """Wrapper to call async send_reminder_to_client function

    Args:
        reminder_type: 'first', 'second', or 'third'
    """
    try:
        # Map reminder type to number
        reminder_number = {
            'first': 1,
            'second': 2,
            'third': 3
        }.get(reminder_type, 1)

        await notification_service.send_reminder_to_client(
            booking, trainer, client, reminder_number
        )
    except Exception as e:
        print(f"Error sending reminder: {e}")


async def _send_auto_cancel_notification(
    booking: Booking,
    trainer: User,
    client: User,
    db: Session
):
    """Wrapper to send auto-cancel notification to client"""
    try:
        await notification_service.send_auto_cancel_notification(
            booking, trainer, client
        )
    except Exception as e:
        print(f"Error sending auto-cancel notification: {e}")


@celery_app.task(name="tasks.reminders.send_client_reminders")
def send_client_reminders():
    """
    Periodic task to send reminders to clients about CONFIRMED trainings.

    Sends reminders at:
    - 2 hours before training (if enabled by client)
    - 1 hour before training (if enabled by client)
    - 15 minutes before training (if enabled by client)
    """
    from datetime import timezone

    now = datetime.now(timezone.utc)
    print(f"[{now}] Running send_client_reminders task...")

    db: Session = SessionLocal()
    try:
        # Get all confirmed bookings happening in the next 3 hours
        window_end = now + timedelta(hours=3)

        confirmed_bookings = db.query(Booking).filter(
            Booking.status == BookingStatus.CONFIRMED,
            Booking.datetime > now,
            Booking.datetime <= window_end
        ).all()

        print(f"Found {len(confirmed_bookings)} confirmed bookings to check for reminders")
        for booking in confirmed_bookings:
            time_until = (booking.datetime - now).total_seconds() / 60
            print(f"  Booking {booking.id}: {time_until:.1f} minutes until training")

        sent_count = 0

        for booking in confirmed_bookings:
            # Get trainer and client
            trainer = db.query(User).filter_by(id=booking.trainer_id).first()
            client = db.query(User).filter_by(id=booking.client_id).first()

            if not trainer or not client:
                print(f"Skipping booking {booking.id}: trainer or client not found")
                continue

            # Calculate time until training
            time_until_training = (booking.datetime - now).total_seconds() / 60  # in minutes

            # Check 2-hour reminder (115-125 minutes before, 5-minute window)
            if (115 <= time_until_training <= 125 and
                not booking.client_reminder_2h_sent and
                getattr(client, 'client_reminder_2h_enabled', True)):

                print(f"✅ Sending 2h reminder for booking {booking.id} (time_until={time_until_training:.1f}m)")
                asyncio.run(_send_client_reminder_async(booking, trainer, client, "2h"))
                booking.client_reminder_2h_sent = True
                db.commit()
                sent_count += 1

            # Check 1-hour reminder (55-65 minutes before, 5-minute window)
            if (55 <= time_until_training <= 65 and
                not booking.client_reminder_1h_sent and
                getattr(client, 'client_reminder_1h_enabled', True)):

                print(f"✅ Sending 1h reminder for booking {booking.id} (time_until={time_until_training:.1f}m)")
                asyncio.run(_send_client_reminder_async(booking, trainer, client, "1h"))
                booking.client_reminder_1h_sent = True
                db.commit()
                sent_count += 1

            # Check 15-minute reminder (13-17 minutes before, 2-minute window)
            if (13 <= time_until_training <= 17 and
                not booking.client_reminder_15m_sent and
                getattr(client, 'client_reminder_15m_enabled', True)):

                print(f"✅ Sending 15m reminder for booking {booking.id} (time_until={time_until_training:.1f}m)")
                asyncio.run(_send_client_reminder_async(booking, trainer, client, "15m"))
                booking.client_reminder_15m_sent = True
                db.commit()
                sent_count += 1

            # Log status
            if not (115 <= time_until_training <= 125 or 55 <= time_until_training <= 65 or 13 <= time_until_training <= 17):
                if booking.client_reminder_2h_sent and booking.client_reminder_1h_sent and booking.client_reminder_15m_sent:
                    print(f"  Booking {booking.id}: all reminders already sent")
                else:
                    print(f"  Booking {booking.id}: time_until={time_until_training:.1f}m, outside reminder windows")

        print(f"[{now}] Finished send_client_reminders: sent {sent_count} reminders")

    except Exception as e:
        print(f"Error in send_client_reminders: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


async def _send_client_reminder_async(
    booking: Booking,
    trainer: User,
    client: User,
    time_before: str
):
    """Wrapper to call async send_client_training_reminder function

    Args:
        time_before: "2h", "1h", or "15m"
    """
    try:
        await notification_service.send_client_training_reminder(
            booking, trainer, client, time_before
        )
    except Exception as e:
        print(f"Error sending client reminder: {e}")
