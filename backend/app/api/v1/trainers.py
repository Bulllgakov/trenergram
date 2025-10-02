"""
Trainers API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from pydantic import BaseModel

from app.db.session import get_async_db
from app.models.user import Trainer
from app.models.booking import Booking, BookingStatus
from app.models.club import Club

router = APIRouter()


class TrainerPublicInfo(BaseModel):
    id: int
    telegram_id: str
    telegram_username: str | None
    name: str
    specialization: str | None
    price: int | None
    bio: str | None
    photo_url: str | None
    experience: int | None
    rating: float | None
    club_id: int | None
    club_name: str | None
    total_clients: int
    total_sessions: int
    is_active: bool

    class Config:
        from_attributes = True


@router.get("/", response_model=List[TrainerPublicInfo])
async def get_trainers(
    club_id: int | None = None,
    is_active: bool = True,
    db: AsyncSession = Depends(get_async_db)
) -> List[TrainerPublicInfo]:
    """Get list of all trainers"""

    query = select(Trainer).where(Trainer.is_active == is_active)

    if club_id:
        query = query.where(Trainer.club_id == club_id)

    result = await db.execute(query)
    trainers = result.scalars().all()

    response = []
    for trainer in trainers:
        # Get trainer statistics
        total_clients_query = select(func.count(func.distinct(Booking.client_id))).where(
            Booking.trainer_id == trainer.id,
            Booking.status.in_([BookingStatus.COMPLETED, BookingStatus.CONFIRMED])
        )
        total_clients_result = await db.execute(total_clients_query)
        total_clients = total_clients_result.scalar() or 0

        total_sessions_query = select(func.count(Booking.id)).where(
            Booking.trainer_id == trainer.id,
            Booking.status == BookingStatus.COMPLETED
        )
        total_sessions_result = await db.execute(total_sessions_query)
        total_sessions = total_sessions_result.scalar() or 0

        # Get club name if exists
        club_name = None
        if trainer.club_id:
            club_query = select(Club).where(Club.id == trainer.club_id)
            club_result = await db.execute(club_query)
            club = club_result.scalar_one_or_none()
            club_name = club.name if club else None

        trainer_info = TrainerPublicInfo(
            id=trainer.id,
            telegram_id=trainer.telegram_id,
            telegram_username=trainer.telegram_username,
            name=trainer.name,
            specialization=trainer.specialization,
            price=trainer.price,
            bio=trainer.bio,
            photo_url=trainer.photo_url,
            experience=trainer.experience,
            rating=trainer.rating,
            club_id=trainer.club_id,
            club_name=club_name,
            total_clients=total_clients,
            total_sessions=total_sessions,
            is_active=trainer.is_active
        )
        response.append(trainer_info)

    return response


@router.get("/{telegram_id}", response_model=TrainerPublicInfo)
async def get_trainer(
    telegram_id: str,
    db: AsyncSession = Depends(get_async_db)
) -> TrainerPublicInfo:
    """Get trainer details by telegram ID"""

    query = select(Trainer).where(Trainer.telegram_id == telegram_id)
    result = await db.execute(query)
    trainer = result.scalar_one_or_none()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Get trainer statistics
    total_clients_query = select(func.count(func.distinct(Booking.client_id))).where(
        Booking.trainer_id == trainer.id,
        Booking.status.in_([BookingStatus.COMPLETED, BookingStatus.CONFIRMED])
    )
    total_clients_result = await db.execute(total_clients_query)
    total_clients = total_clients_result.scalar() or 0

    total_sessions_query = select(func.count(Booking.id)).where(
        Booking.trainer_id == trainer.id,
        Booking.status == BookingStatus.COMPLETED
    )
    total_sessions_result = await db.execute(total_sessions_query)
    total_sessions = total_sessions_result.scalar() or 0

    # Get club name if exists
    club_name = None
    if trainer.club_id:
        club_query = select(Club).where(Club.id == trainer.club_id)
        club_result = await db.execute(club_query)
        club = club_result.scalar_one_or_none()
        club_name = club.name if club else None

    return TrainerPublicInfo(
        id=trainer.id,
        telegram_id=trainer.telegram_id,
        telegram_username=trainer.telegram_username,
        name=trainer.name,
        specialization=trainer.specialization,
        price=trainer.price,
        bio=trainer.bio,
        photo_url=trainer.photo_url,
        experience=trainer.experience,
        rating=trainer.rating,
        club_id=trainer.club_id,
        club_name=club_name,
        total_clients=total_clients,
        total_sessions=total_sessions,
        is_active=trainer.is_active
    )