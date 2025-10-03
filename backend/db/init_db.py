"""
Initialize database with tables and initial data
"""

from sqlalchemy.orm import Session
from datetime import datetime

from db.base_sync import Base
from db.session import engine
from models import (
    User, UserRole, Club, ClubTariff,
    Booking, BookingStatus, Schedule, TimeSlot
)


def init_db():
    """Create all tables"""
    # Create tables
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")


def create_test_data(db: Session):
    """Create test data for development"""

    # Create test club
    test_club = Club(
        name="Фитнес ЭНЕРГИЯ",
        address="ул. Пушкина 15",
        city="Москва",
        phone="+7 (999) 123-45-67",
        working_hours={
            "monday": {"from": "07:00", "to": "23:00"},
            "tuesday": {"from": "07:00", "to": "23:00"},
            "wednesday": {"from": "07:00", "to": "23:00"},
            "thursday": {"from": "07:00", "to": "23:00"},
            "friday": {"from": "07:00", "to": "23:00"},
            "saturday": {"from": "09:00", "to": "21:00"},
            "sunday": {"from": "09:00", "to": "21:00"}
        },
        tariff=ClubTariff.STANDARD,
        qr_code="FITNESS_ENERGIA_001"
    )
    db.add(test_club)
    db.commit()
    print(f"✅ Created test club: {test_club.name}")

    # Create test trainer
    test_trainer = User(
        telegram_id="123456789",
        telegram_username="ivan_trainer",
        name="Иван Петров",
        role=UserRole.TRAINER,
        club_id=test_club.id,
        specialization="fitness",
        price=2000,
        description="Персональный тренер с опытом 5 лет",
        settings={
            "reminder_hours": 24,
            "work_hours": {"start": "09:00", "end": "21:00"}
        }
    )
    db.add(test_trainer)
    db.commit()
    print(f"✅ Created test trainer: {test_trainer.name}")

    # Create test client
    test_client = User(
        telegram_id="987654321",
        telegram_username="maria_client",
        name="Мария Сидорова",
        role=UserRole.CLIENT,
        phone="+7 (999) 888-77-66",
        settings={
            "notifications": True
        }
    )
    db.add(test_client)
    db.commit()
    print(f"✅ Created test client: {test_client.name}")

    # Create trainer-client relationship
    from models import TrainerClient
    relationship = TrainerClient(
        trainer_id=test_trainer.id,
        client_id=test_client.id,
        source="link"
    )
    db.add(relationship)
    db.commit()
    print("✅ Created trainer-client relationship")

    # Create test booking
    from datetime import datetime, timedelta
    test_booking = Booking(
        trainer_id=test_trainer.id,
        client_id=test_client.id,
        club_id=test_club.id,
        datetime=datetime.now() + timedelta(days=1, hours=10),
        price=2000,
        status=BookingStatus.CONFIRMED
    )
    db.add(test_booking)
    db.commit()
    print(f"✅ Created test booking for {test_booking.datetime}")

    return {
        "club": test_club,
        "trainer": test_trainer,
        "client": test_client,
        "booking": test_booking
    }


if __name__ == "__main__":
    print("Initializing database...")
    init_db()

    # Optionally create test data
    from db.session import SessionLocal
    db = SessionLocal()
    try:
        # Check if data already exists
        existing_users = db.query(User).count()
        if existing_users == 0:
            print("Creating test data...")
            create_test_data(db)
        else:
            print(f"Database already has {existing_users} users")
    finally:
        db.close()

    print("✅ Database initialization complete!")