"""
Trainers API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.models import User, UserRole, Booking, BookingStatus, Club

router = APIRouter()


class TrainerPublicInfo(BaseModel):
    id: int
    telegram_id: str
    telegram_username: Optional[str]
    name: str
    specialization: Optional[str]
    price: Optional[int]
    description: Optional[str]
    rating: Optional[float]
    club_id: Optional[int]
    club_name: Optional[str]
    total_clients: int
    total_sessions: int
    is_active: bool

    class Config:
        from_attributes = True


@router.get("/", response_model=List[TrainerPublicInfo])
def get_trainers(
    club_id: Optional[int] = None,
    is_active: bool = True,
    db: Session = Depends(get_db)
) -> List[TrainerPublicInfo]:
    """Get list of all trainers"""

    query = db.query(User).filter(
        User.role == UserRole.TRAINER,
        User.is_active == is_active
    )

    if club_id:
        query = query.filter(User.club_id == club_id)

    trainers = query.all()

    response = []
    for trainer in trainers:
        # Get trainer statistics
        total_clients = db.query(func.count(func.distinct(Booking.client_id))).filter(
            Booking.trainer_id == trainer.id,
            Booking.status.in_([BookingStatus.COMPLETED, BookingStatus.CONFIRMED])
        ).scalar() or 0

        total_sessions = db.query(func.count(Booking.id)).filter(
            Booking.trainer_id == trainer.id,
            Booking.status == BookingStatus.COMPLETED
        ).scalar() or 0

        # Get club name if exists
        club_name = None
        if trainer.club_id:
            club = db.query(Club).filter(Club.id == trainer.club_id).first()
            club_name = club.name if club else None

        # Convert rating from 0-50 to 0.0-5.0
        rating = float(trainer.rating / 10) if trainer.rating else None

        trainer_info = TrainerPublicInfo(
            id=trainer.id,
            telegram_id=trainer.telegram_id,
            telegram_username=trainer.telegram_username,
            name=trainer.name,
            specialization=trainer.specialization,
            price=trainer.price,
            description=trainer.description,
            rating=rating,
            club_id=trainer.club_id,
            club_name=club_name,
            total_clients=total_clients,
            total_sessions=total_sessions,
            is_active=trainer.is_active
        )
        response.append(trainer_info)

    return response


@router.get("/{telegram_id}", response_model=TrainerPublicInfo)
def get_trainer(
    telegram_id: str,
    db: Session = Depends(get_db)
) -> TrainerPublicInfo:
    """Get trainer details by telegram ID"""

    trainer = db.query(User).filter(
        User.telegram_id == telegram_id,
        User.role == UserRole.TRAINER
    ).first()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Get trainer statistics
    total_clients = db.query(func.count(func.distinct(Booking.client_id))).filter(
        Booking.trainer_id == trainer.id,
        Booking.status.in_([BookingStatus.COMPLETED, BookingStatus.CONFIRMED])
    ).scalar() or 0

    total_sessions = db.query(func.count(Booking.id)).filter(
        Booking.trainer_id == trainer.id,
        Booking.status == BookingStatus.COMPLETED
    ).scalar() or 0

    # Get club name if exists
    club_name = None
    if trainer.club_id:
        club = db.query(Club).filter(Club.id == trainer.club_id).first()
        club_name = club.name if club else None

    # Convert rating from 0-50 to 0.0-5.0
    rating = float(trainer.rating / 10) if trainer.rating else None

    return TrainerPublicInfo(
        id=trainer.id,
        telegram_id=trainer.telegram_id,
        telegram_username=trainer.telegram_username,
        name=trainer.name,
        specialization=trainer.specialization,
        price=trainer.price,
        description=trainer.description,
        rating=rating,
        club_id=trainer.club_id,
        club_name=club_name,
        total_clients=total_clients,
        total_sessions=total_sessions,
        is_active=trainer.is_active
    )