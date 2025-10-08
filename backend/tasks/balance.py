"""
Celery tasks for automatic balance charging before trainings
"""

import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from celery_app import celery_app
from db.session import SessionLocal
from models import User, Booking, BookingStatus, TrainerClient


@celery_app.task(name="tasks.balance.check_and_charge_bookings")
def check_and_charge_bookings():
    """
    Periodic task to check confirmed bookings and charge client balance
    when deadline reaches (based on trainer's cancellation_hours setting).

    Logic:
    1. Find all CONFIRMED bookings that are NOT yet charged
    2. Check if time_until_training <= trainer.cancellation_hours
    3. If yes - charge balance and mark as charged
    4. Balance can go negative
    """
    print(f"[{datetime.now()}] Running check_and_charge_bookings task...")

    db: Session = SessionLocal()
    try:
        # Get all confirmed bookings that haven't been charged yet
        upcoming_bookings = db.query(Booking).filter(
            Booking.status == BookingStatus.CONFIRMED,
            Booking.is_charged == False,
            Booking.datetime > datetime.now()
        ).all()

        print(f"Found {len(upcoming_bookings)} confirmed uncharged bookings to check")

        charged_count = 0

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

            # Get trainer's cancellation policy
            cancellation_hours = trainer.cancellation_hours or 24

            # Check if it's time to charge
            if hours_until_training <= cancellation_hours:
                print(f"Charging booking {booking.id}: {hours_until_training:.2f}h until training, deadline is {cancellation_hours}h")

                # Get trainer-client relationship
                trainer_client = db.query(TrainerClient).filter_by(
                    trainer_id=trainer.id,
                    client_id=client.id
                ).first()

                if not trainer_client:
                    print(f"Error: TrainerClient relationship not found for booking {booking.id}")
                    continue

                # Charge the balance (can go negative)
                amount = booking.price or 0
                trainer_client.balance -= amount

                # Mark booking as charged
                booking.is_charged = True
                booking.charged_at = datetime.now()

                # Commit changes
                db.commit()

                print(f"✓ Charged {amount} ₽ from client {client.name} (balance: {trainer_client.balance}) for booking {booking.id}")
                charged_count += 1

        print(f"[{datetime.now()}] Finished check_and_charge_bookings: charged {charged_count} bookings")

    except Exception as e:
        print(f"Error in check_and_charge_bookings: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
