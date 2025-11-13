"""
Admin clients management API
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from db.session import get_db
from models import User, UserRole, Booking, TrainerClient, ClubAdmin
from .auth import get_current_admin

router = APIRouter()


# Pydantic models
class ClientListItem(BaseModel):
    id: int
    telegram_id: str
    name: str
    phone: Optional[str]
    is_active: bool
    total_trainers: int
    total_bookings: int
    last_booking_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class TrainerInfo(BaseModel):
    id: int
    name: str
    telegram_id: str
    club_name: Optional[str]
    total_bookings: int
    status: str
    first_booking_date: Optional[datetime]
    last_booking_date: Optional[datetime]


class ClientDetail(BaseModel):
    id: int
    telegram_id: str
    telegram_username: Optional[str]
    name: str
    phone: Optional[str]
    is_active: bool
    created_at: datetime
    trainers: List[TrainerInfo]
    total_bookings: int
    confirmed_bookings: int
    completed_bookings: int
    cancelled_bookings: int

    class Config:
        from_attributes = True


@router.get("/", response_model=List[ClientListItem])
async def list_clients(
    admin: ClubAdmin = Depends(get_current_admin),
    db: Session = Depends(get_db),
    trainer_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """
    Get list of clients with filters

    For super_admin: can see all clients
    For club_admin: can only see clients who have bookings with trainers from their club
    """
    # Check permissions
    is_super_admin = admin.role == "owner" and admin.club_id is None

    query = db.query(User).filter(User.role == UserRole.CLIENT)

    # Apply club filter for club admins
    if not is_super_admin:
        if not admin.club_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get trainer IDs from admin's club
        trainer_ids = db.query(User.id).filter(
            User.role == UserRole.TRAINER,
            User.club_id == admin.club_id
        ).all()
        trainer_ids = [t[0] for t in trainer_ids]

        # Filter clients who have bookings with these trainers
        client_ids = db.query(Booking.client_id).filter(
            Booking.trainer_id.in_(trainer_ids)
        ).distinct().all()
        client_ids = [c[0] for c in client_ids]

        query = query.filter(User.id.in_(client_ids))

    # Apply trainer filter
    if trainer_id is not None:
        # Filter clients who have bookings with this trainer
        client_ids = db.query(Booking.client_id).filter(
            Booking.trainer_id == trainer_id
        ).distinct().all()
        client_ids = [c[0] for c in client_ids]
        query = query.filter(User.id.in_(client_ids))

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

    # Apply pagination
    clients = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    # Build response with additional data
    result = []
    for client in clients:
        # Count trainers
        total_trainers = db.query(TrainerClient).filter(
            TrainerClient.client_id == client.id
        ).count()

        # Count bookings
        total_bookings = db.query(Booking).filter(
            Booking.client_id == client.id
        ).count()

        # Get last booking date
        last_booking = db.query(Booking).filter(
            Booking.client_id == client.id
        ).order_by(Booking.datetime.desc()).first()
        last_booking_date = last_booking.datetime if last_booking else None

        item = ClientListItem(
            id=client.id,
            telegram_id=client.telegram_id,
            name=client.name,
            phone=client.phone,
            is_active=client.is_active,
            total_trainers=total_trainers,
            total_bookings=total_bookings,
            last_booking_date=last_booking_date,
            created_at=client.created_at
        )
        result.append(item)

    return result


@router.get("/{client_id}", response_model=ClientDetail)
async def get_client(
    client_id: int,
    admin: ClubAdmin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get detailed client information
    """
    client = db.query(User).filter(
        User.id == client_id,
        User.role == UserRole.CLIENT
    ).first()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Check permissions for club admins
    is_super_admin = admin.role == "owner" and admin.club_id is None
    if not is_super_admin:
        # Check if client has bookings with trainers from admin's club
        trainer_ids = db.query(User.id).filter(
            User.role == UserRole.TRAINER,
            User.club_id == admin.club_id
        ).all()
        trainer_ids = [t[0] for t in trainer_ids]

        has_booking = db.query(Booking).filter(
            Booking.client_id == client_id,
            Booking.trainer_id.in_(trainer_ids)
        ).first()

        if not has_booking:
            raise HTTPException(status_code=403, detail="Access denied")

    # Get trainers list with details
    trainer_clients = db.query(TrainerClient).filter(
        TrainerClient.client_id == client_id
    ).all()

    trainers_info = []
    for tc in trainer_clients:
        trainer = db.query(User).filter(User.id == tc.trainer_id).first()
        if not trainer:
            continue

        # Get club name
        club_name = None
        if trainer.club_id:
            from models import Club
            club = db.query(Club).filter(Club.id == trainer.club_id).first()
            club_name = club.name if club else None

        trainers_info.append(TrainerInfo(
            id=trainer.id,
            name=trainer.name,
            telegram_id=trainer.telegram_id,
            club_name=club_name,
            total_bookings=tc.total_bookings or 0,
            status=tc.status or "active",
            first_booking_date=tc.first_booking_date,
            last_booking_date=tc.last_booking_date
        ))

    # Count bookings by status
    total_bookings = db.query(Booking).filter(
        Booking.client_id == client_id
    ).count()

    confirmed_bookings = db.query(Booking).filter(
        Booking.client_id == client_id,
        Booking.status == "confirmed"
    ).count()

    completed_bookings = db.query(Booking).filter(
        Booking.client_id == client_id,
        Booking.status == "completed"
    ).count()

    cancelled_bookings = db.query(Booking).filter(
        Booking.client_id == client_id,
        Booking.status == "cancelled"
    ).count()

    return ClientDetail(
        id=client.id,
        telegram_id=client.telegram_id,
        telegram_username=client.telegram_username,
        name=client.name,
        phone=client.phone,
        is_active=client.is_active,
        created_at=client.created_at,
        trainers=trainers_info,
        total_bookings=total_bookings,
        confirmed_bookings=confirmed_bookings,
        completed_bookings=completed_bookings,
        cancelled_bookings=cancelled_bookings
    )
