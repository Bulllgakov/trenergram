"""
Admin trainers management API
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from db.session import get_db
from models import User, UserRole, Booking, TrainerClient, Club, ClubAdmin
from .auth import get_current_admin

router = APIRouter()


# Pydantic models
class TrainerListItem(BaseModel):
    id: int
    telegram_id: str
    name: str
    phone: Optional[str]
    club_id: Optional[int]
    club_name: Optional[str]
    specialization: Optional[dict]
    price: Optional[int]
    rating: Optional[float]
    is_active: bool
    total_clients: int
    total_bookings: int
    created_at: datetime

    class Config:
        from_attributes = True


class TrainerDetail(BaseModel):
    id: int
    telegram_id: str
    telegram_username: Optional[str]
    name: str
    phone: Optional[str]
    club_id: Optional[int]
    club_name: Optional[str]
    specialization: Optional[dict]
    description: Optional[str]
    price: Optional[int]
    session_duration: Optional[int]
    rating: Optional[float]
    is_active: bool
    timezone: str
    working_hours: Optional[dict]
    reminder_1_days_before: Optional[int]
    reminder_1_time: Optional[str]
    reminder_2_hours_after: Optional[int]
    reminder_3_hours_after: Optional[int]
    auto_cancel_hours_after: Optional[int]
    total_clients: int
    total_bookings: int
    confirmed_bookings: int
    completed_bookings: int
    created_at: datetime

    class Config:
        from_attributes = True


class TrainerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[dict] = None
    description: Optional[str] = None
    price: Optional[int] = None
    session_duration: Optional[int] = None
    is_active: Optional[bool] = None
    timezone: Optional[str] = None


@router.get("/", response_model=List[TrainerListItem])
async def list_trainers(
    admin: ClubAdmin = Depends(get_current_admin),
    db: Session = Depends(get_db),
    club_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """
    Get list of trainers with filters

    For super_admin: can see all trainers and filter by club_id
    For club_admin: can only see trainers from their club
    """
    # Check permissions
    is_super_admin = admin.role == "super_admin" and admin.club_id is None

    query = db.query(User).filter(User.role == UserRole.TRAINER)

    # Apply club filter
    if not is_super_admin:
        # Club admin can only see their club's trainers
        if not admin.club_id:
            raise HTTPException(status_code=403, detail="Access denied")
        query = query.filter(User.club_id == admin.club_id)
    elif club_id is not None:
        # Super admin can filter by club_id
        query = query.filter(User.club_id == club_id)

    # Apply active filter
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    # Apply search filter
    if search:
        query = query.filter(
            or_(
                User.name.ilike(f"%{search}%"),
                User.telegram_id.ilike(f"%{search}%"),
                User.phone.ilike(f"%{search}%")
            )
        )

    # Get total count before pagination
    total_count = query.count()

    # Apply pagination
    trainers = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    # Build response with additional data
    result = []
    for trainer in trainers:
        # Get club name
        club_name = None
        if trainer.club_id:
            club = db.query(Club).filter(Club.id == trainer.club_id).first()
            club_name = club.name if club else None

        # Count clients
        total_clients = db.query(TrainerClient).filter(
            TrainerClient.trainer_id == trainer.id
        ).count()

        # Count bookings
        total_bookings = db.query(Booking).filter(
            Booking.trainer_id == trainer.id
        ).count()

        item = TrainerListItem(
            id=trainer.id,
            telegram_id=trainer.telegram_id,
            name=trainer.name,
            phone=trainer.phone,
            club_id=trainer.club_id,
            club_name=club_name,
            specialization=trainer.specialization,
            price=trainer.price,
            rating=trainer.rating,
            is_active=trainer.is_active,
            total_clients=total_clients,
            total_bookings=total_bookings,
            created_at=trainer.created_at
        )
        result.append(item)

    return result


@router.get("/{trainer_id}", response_model=TrainerDetail)
async def get_trainer(
    trainer_id: int,
    admin: ClubAdmin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get detailed trainer information
    """
    trainer = db.query(User).filter(
        User.id == trainer_id,
        User.role == UserRole.TRAINER
    ).first()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Check permissions
    is_super_admin = admin.role == "super_admin" and admin.club_id is None
    if not is_super_admin:
        if trainer.club_id != admin.club_id:
            raise HTTPException(status_code=403, detail="Access denied")

    # Get club name
    club_name = None
    if trainer.club_id:
        club = db.query(Club).filter(Club.id == trainer.club_id).first()
        club_name = club.name if club else None

    # Count clients
    total_clients = db.query(TrainerClient).filter(
        TrainerClient.trainer_id == trainer.id
    ).count()

    # Count bookings
    total_bookings = db.query(Booking).filter(
        Booking.trainer_id == trainer.id
    ).count()

    confirmed_bookings = db.query(Booking).filter(
        Booking.trainer_id == trainer.id,
        Booking.status == "confirmed"
    ).count()

    completed_bookings = db.query(Booking).filter(
        Booking.trainer_id == trainer.id,
        Booking.status == "completed"
    ).count()

    return TrainerDetail(
        id=trainer.id,
        telegram_id=trainer.telegram_id,
        telegram_username=trainer.telegram_username,
        name=trainer.name,
        phone=trainer.phone,
        club_id=trainer.club_id,
        club_name=club_name,
        specialization=trainer.specialization,
        description=trainer.description,
        price=trainer.price,
        session_duration=trainer.session_duration,
        rating=trainer.rating,
        is_active=trainer.is_active,
        timezone=trainer.timezone,
        working_hours=trainer.working_hours,
        reminder_1_days_before=trainer.reminder_1_days_before,
        reminder_1_time=str(trainer.reminder_1_time) if trainer.reminder_1_time else None,
        reminder_2_hours_after=trainer.reminder_2_hours_after,
        reminder_3_hours_after=trainer.reminder_3_hours_after,
        auto_cancel_hours_after=trainer.auto_cancel_hours_after,
        total_clients=total_clients,
        total_bookings=total_bookings,
        confirmed_bookings=confirmed_bookings,
        completed_bookings=completed_bookings,
        created_at=trainer.created_at
    )


@router.put("/{trainer_id}", response_model=TrainerDetail)
async def update_trainer(
    trainer_id: int,
    update_data: TrainerUpdate,
    admin: ClubAdmin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Update trainer information
    """
    trainer = db.query(User).filter(
        User.id == trainer_id,
        User.role == UserRole.TRAINER
    ).first()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Check permissions
    is_super_admin = admin.role == "super_admin" and admin.club_id is None
    if not is_super_admin:
        if trainer.club_id != admin.club_id:
            raise HTTPException(status_code=403, detail="Access denied")

    # Update fields
    if update_data.name is not None:
        trainer.name = update_data.name
    if update_data.phone is not None:
        trainer.phone = update_data.phone
    if update_data.specialization is not None:
        trainer.specialization = update_data.specialization
    if update_data.description is not None:
        trainer.description = update_data.description
    if update_data.price is not None:
        trainer.price = update_data.price
    if update_data.session_duration is not None:
        trainer.session_duration = update_data.session_duration
    if update_data.is_active is not None:
        trainer.is_active = update_data.is_active
    if update_data.timezone is not None:
        trainer.timezone = update_data.timezone

    db.commit()
    db.refresh(trainer)

    # Return updated trainer detail
    return await get_trainer(trainer_id, admin, db)
