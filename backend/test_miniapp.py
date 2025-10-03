#!/usr/bin/env python
"""
Test Mini App integration with real data
Creates test users and bookings for testing
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from db.session import SessionLocal, engine
from models import User, UserRole, Booking, BookingStatus, TrainerClient, Club
from db.base_sync import Base

def init_db():
    """Initialize database with tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")

def create_test_data():
    """Create test data for Mini App testing"""
    db = SessionLocal()

    try:
        # Check if test data already exists
        test_trainer = db.query(User).filter_by(telegram_id="123456789").first()
        if test_trainer:
            print("Test data already exists, skipping creation")
            return

        print("Creating test data...")

        # Create test club
        club = Club(
            name="Фитнес ЭНЕРГИЯ",
            address="ул. Пушкина 15, Москва",
            tariff="basic"
        )
        db.add(club)
        db.commit()

        # Create test trainer
        trainer = User(
            telegram_id="123456789",
            telegram_username="test_trainer",
            name="Иван Петров",
            role=UserRole.TRAINER,
            phone="+7 999 123-45-67",
            club_id=club.id,
            specialization="Силовые тренировки",
            price=3000,
            description="Опытный тренер по силовым тренировкам",
            rating=45  # 4.5 stars
        )
        db.add(trainer)

        # Create test client
        client = User(
            telegram_id="987654321",
            telegram_username="test_client",
            name="Мария Сидорова",
            role=UserRole.CLIENT,
            phone="+7 999 765-43-21"
        )
        db.add(client)

        # Create another trainer
        trainer2 = User(
            telegram_id="111111111",
            telegram_username="yoga_trainer",
            name="Елена Козлова",
            role=UserRole.TRAINER,
            phone="+7 999 111-11-11",
            club_id=club.id,
            specialization="Йога и растяжка",
            price=2500,
            description="Сертифицированный инструктор по йоге",
            rating=50  # 5.0 stars
        )
        db.add(trainer2)

        db.commit()

        # Create trainer-client relationships
        tc1 = TrainerClient(
            trainer_id=trainer.id,
            client_id=client.id,
            source="link",
            total_bookings=5,
            completed_bookings=3
        )
        db.add(tc1)

        tc2 = TrainerClient(
            trainer_id=trainer2.id,
            client_id=client.id,
            source="qr",
            total_bookings=3,
            completed_bookings=2
        )
        db.add(tc2)

        db.commit()

        # Create test bookings
        now = datetime.now()

        # Upcoming bookings
        booking1 = Booking(
            trainer_id=trainer.id,
            client_id=client.id,
            club_id=club.id,
            datetime=now + timedelta(days=1, hours=2),
            duration=60,
            price=3000,
            status=BookingStatus.PENDING,
            notes="Силовая тренировка"
        )
        db.add(booking1)

        booking2 = Booking(
            trainer_id=trainer2.id,
            client_id=client.id,
            club_id=club.id,
            datetime=now + timedelta(days=2, hours=3),
            duration=90,
            price=3750,
            status=BookingStatus.CONFIRMED,
            notes="Йога для начинающих"
        )
        db.add(booking2)

        # Past booking
        booking3 = Booking(
            trainer_id=trainer.id,
            client_id=client.id,
            club_id=club.id,
            datetime=now - timedelta(days=3),
            duration=60,
            price=3000,
            status=BookingStatus.COMPLETED,
            notes="Тренировка завершена",
            is_paid=True
        )
        db.add(booking3)

        db.commit()

        print("✅ Test data created successfully!")
        print("\n📱 Test credentials for Mini App:")
        print(f"Trainer Telegram ID: {trainer.telegram_id}")
        print(f"Client Telegram ID: {client.telegram_id}")
        print(f"\nTrainer URL: https://trenergram.ru/app/trainer/{trainer.telegram_id}")
        print(f"Client URL: https://trenergram.ru/app/client/{client.telegram_id}")

    except Exception as e:
        print(f"❌ Error creating test data: {e}")
        db.rollback()
    finally:
        db.close()

def list_users():
    """List all users in database"""
    db = SessionLocal()

    try:
        trainers = db.query(User).filter_by(role=UserRole.TRAINER).all()
        clients = db.query(User).filter_by(role=UserRole.CLIENT).all()

        print("\n👨‍🏫 Trainers:")
        for trainer in trainers:
            print(f"  - {trainer.name} (ID: {trainer.telegram_id}, @{trainer.telegram_username})")

        print("\n👥 Clients:")
        for client in clients:
            print(f"  - {client.name} (ID: {client.telegram_id}, @{client.telegram_username})")

        bookings = db.query(Booking).all()
        print(f"\n📅 Total bookings: {len(bookings)}")

    finally:
        db.close()

def main():
    print("🚀 Trenergram Mini App Test Setup")
    print("=" * 40)

    # Initialize database
    init_db()

    # Create test data
    create_test_data()

    # List users
    list_users()

    print("\n✨ Setup complete! You can now test the Mini App with the URLs above.")

if __name__ == "__main__":
    main()