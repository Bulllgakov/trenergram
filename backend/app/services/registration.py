"""
Registration service for trainers and clients
"""

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models import User, UserRole, TrainerClient, Club
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


async def register_trainer(
    telegram_id: str,
    telegram_username: Optional[str],
    name: str,
    price: int,
    phone: Optional[str] = None,
    club_id: Optional[int] = None,
    specialization: Optional[str] = None,
    telegram_first_name: Optional[str] = None,
    telegram_last_name: Optional[str] = None
) -> User:
    """Register a new trainer"""
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter_by(telegram_id=telegram_id).first()
        if existing_user:
            # Update existing user to trainer
            existing_user.role = UserRole.TRAINER
            existing_user.name = name
            existing_user.phone = phone
            existing_user.price = price
            existing_user.club_id = club_id
            existing_user.specialization = specialization or "fitness"
            db.commit()
            db.refresh(existing_user)
            logger.info(f"Updated existing user {telegram_id} to trainer")
            return existing_user

        # Create new trainer
        trainer = User(
            telegram_id=telegram_id,
            telegram_username=telegram_username,
            telegram_first_name=telegram_first_name,
            telegram_last_name=telegram_last_name,
            name=name,
            phone=phone,
            role=UserRole.TRAINER,
            price=price,
            club_id=club_id,
            specialization=specialization or "fitness",
            description="",
            settings={
                "reminder_hours": 24,
                "work_hours": {"start": "09:00", "end": "21:00"}
            }
        )
        db.add(trainer)
        db.commit()
        db.refresh(trainer)

        logger.info(f"Registered new trainer: {trainer.name} ({telegram_id})")
        return trainer

    except Exception as e:
        logger.error(f"Error registering trainer: {e}")
        db.rollback()
        raise
    finally:
        db.close()


async def register_client(
    telegram_id: str,
    telegram_username: Optional[str],
    name: str,
    trainer_id: Optional[str] = None,
    phone: Optional[str] = None,
    telegram_first_name: Optional[str] = None,
    telegram_last_name: Optional[str] = None
) -> User:
    """Register a new client"""
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter_by(telegram_id=telegram_id).first()
        if existing_user:
            # Update existing user
            existing_user.name = name
            existing_user.phone = phone
            db.commit()
            db.refresh(existing_user)
            logger.info(f"Updated existing client {telegram_id}")
            client = existing_user
        else:
            # Create new client
            client = User(
                telegram_id=telegram_id,
                telegram_username=telegram_username,
                telegram_first_name=telegram_first_name,
                telegram_last_name=telegram_last_name,
                name=name,
                role=UserRole.CLIENT,
                phone=phone,
                settings={"notifications": True}
            )
            db.add(client)
            db.commit()
            db.refresh(client)
            logger.info(f"Registered new client: {client.name} ({telegram_id})")

        # If trainer_id is provided, create relationship
        if trainer_id:
            trainer = db.query(User).filter_by(
                telegram_id=trainer_id,
                role=UserRole.TRAINER
            ).first()

            if trainer:
                # Check if relationship already exists
                existing_rel = db.query(TrainerClient).filter_by(
                    trainer_id=trainer.id,
                    client_id=client.id
                ).first()

                if not existing_rel:
                    relationship = TrainerClient(
                        trainer_id=trainer.id,
                        client_id=client.id,
                        source="link"
                    )
                    db.add(relationship)
                    db.commit()
                    logger.info(f"Created trainer-client relationship: {trainer.id} -> {client.id}")

        return client

    except Exception as e:
        logger.error(f"Error registering client: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def get_user_by_telegram_id(telegram_id: str) -> Optional[User]:
    """Get user by telegram ID"""
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(telegram_id=telegram_id).first()
        return user
    finally:
        db.close()


def get_trainer_clients(trainer_telegram_id: str) -> list[User]:
    """Get all clients of a trainer"""
    db = SessionLocal()
    try:
        trainer = db.query(User).filter_by(
            telegram_id=trainer_telegram_id,
            role=UserRole.TRAINER
        ).first()

        if not trainer:
            return []

        # Get all trainer-client relationships
        relationships = db.query(TrainerClient).filter_by(
            trainer_id=trainer.id,
            is_active=True
        ).all()

        # Get client users
        client_ids = [rel.client_id for rel in relationships]
        clients = db.query(User).filter(User.id.in_(client_ids)).all() if client_ids else []

        return clients

    finally:
        db.close()


def get_client_trainers(client_telegram_id: str) -> list[User]:
    """Get all trainers of a client"""
    db = SessionLocal()
    try:
        client = db.query(User).filter_by(
            telegram_id=client_telegram_id,
            role=UserRole.CLIENT
        ).first()

        if not client:
            return []

        # Get all trainer-client relationships
        relationships = db.query(TrainerClient).filter_by(
            client_id=client.id,
            is_active=True
        ).all()

        # Get trainer users
        trainer_ids = [rel.trainer_id for rel in relationships]
        trainers = db.query(User).filter(User.id.in_(trainer_ids)).all() if trainer_ids else []

        return trainers

    finally:
        db.close()


def get_clubs() -> list[Club]:
    """Get all active clubs"""
    db = SessionLocal()
    try:
        clubs = db.query(Club).filter_by(is_active=True).all()
        return clubs
    finally:
        db.close()