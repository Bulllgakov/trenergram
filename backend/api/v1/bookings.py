"""
Booking API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import asyncio

from db.session import get_db
from models import User, UserRole, Booking, BookingStatus, Club
from core.security import get_current_user
from services.notifications import (
    notify_booking_confirmed,
    notify_booking_cancelled,
    notify_booking_rescheduled,
    notify_booking_created_by_trainer,
    notify_booking_created_by_client
)

router = APIRouter()


# Pydantic models for API
class BookingCreate(BaseModel):
    trainer_telegram_id: str
    client_telegram_id: str
    datetime: datetime
    duration: int = 60
    price: Optional[int] = None
    notes: Optional[str] = None
    created_by: str = "trainer"  # "trainer" or "client"


class BookingUpdate(BaseModel):
    datetime: Optional[datetime] = None
    status: Optional[BookingStatus] = None
    notes: Optional[str] = None
    cancellation_reason: Optional[str] = None


class BookingResponse(BaseModel):
    id: int
    trainer_id: int
    client_id: int
    club_id: Optional[int]
    datetime: datetime
    duration: int
    price: Optional[int]
    status: BookingStatus
    notes: Optional[str]
    is_paid: bool
    created_at: datetime
    trainer_name: Optional[str] = None
    client_name: Optional[str] = None
    club_name: Optional[str] = None
    trainer_telegram_id: Optional[str] = None
    client_telegram_id: Optional[str] = None
    trainer_telegram_username: Optional[str] = None
    trainer_timezone: Optional[str] = "Europe/Moscow"  # Trainer's IANA timezone

    class Config:
        from_attributes = True


@router.post("/", response_model=BookingResponse)
async def create_booking(
    booking: BookingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create a new booking"""
    # DETAILED LOGGING FOR DEBUGGING
    print(f"=" * 80)
    print(f"CREATE_BOOKING API CALLED")
    print(f"=" * 80)
    print(f"Raw booking data: {booking.dict()}")
    print(f"created_by: '{booking.created_by}' (type: {type(booking.created_by)})")
    print(f"status from request: '{booking.dict().get('status', 'NOT_PROVIDED')}'")
    print(f"=" * 80)

    # Get trainer and client
    trainer = db.query(User).filter_by(
        telegram_id=booking.trainer_telegram_id,
        role=UserRole.TRAINER
    ).first()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    client = db.query(User).filter_by(
        telegram_id=booking.client_telegram_id,
        role=UserRole.CLIENT
    ).first()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Check for conflicts
    existing = db.query(Booking).filter(
        Booking.trainer_id == trainer.id,
        Booking.datetime == booking.datetime,
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING])
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Time slot already booked")

    # Create booking
    new_booking = Booking(
        trainer_id=trainer.id,
        client_id=client.id,
        club_id=trainer.club_id,
        datetime=booking.datetime,
        duration=booking.duration or trainer.session_duration or 60,
        price=booking.price or trainer.price,
        status=BookingStatus.PENDING,
        notes=booking.notes
    )

    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    # Send notifications based on who created the booking (TZ 10.6)
    print(f"DEBUG: Creating booking with created_by='{booking.created_by}', booking_id={new_booking.id}")

    if booking.created_by == "trainer":
        # No notifications sent (TZ 10.6: first reminder = first notification)
        print(f"DEBUG: Trainer created booking - NO notifications sent")
        background_tasks.add_task(notify_booking_created_by_trainer, new_booking, db)
    elif booking.created_by == "client":
        # Send notification to trainer for approval
        print(f"DEBUG: Client created booking - sending notification to trainer")
        background_tasks.add_task(notify_booking_created_by_client, new_booking, db)
    else:
        # Should never happen - log error and do NOT send any notifications
        print(f"ERROR: Unknown created_by value: '{booking.created_by}' for booking {new_booking.id}")
        print(f"ERROR: No notifications will be sent (correct behavior per TZ 10.6)")
        # Do NOT send any notifications if created_by is unknown
        pass

    response = BookingResponse.from_orm(new_booking)
    response.trainer_name = trainer.name
    response.client_name = client.name
    response.trainer_telegram_id = trainer.telegram_id
    response.client_telegram_id = client.telegram_id
    response.trainer_telegram_username = trainer.telegram_username
    response.trainer_timezone = trainer.timezone if trainer and hasattr(trainer, 'timezone') else "Europe/Moscow"

    return response


@router.get("/trainer/{telegram_id}", response_model=List[BookingResponse])
async def get_trainer_bookings(
    telegram_id: str,
    status: Optional[BookingStatus] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Get all bookings for a trainer"""
    trainer = db.query(User).filter_by(
        telegram_id=telegram_id,
        role=UserRole.TRAINER
    ).first()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    query = db.query(Booking).filter(Booking.trainer_id == trainer.id)

    if status:
        query = query.filter(Booking.status == status)

    if from_date:
        query = query.filter(Booking.datetime >= from_date)

    if to_date:
        query = query.filter(Booking.datetime <= to_date)

    bookings = query.order_by(Booking.datetime.asc()).all()

    # Add names to response
    result = []
    for booking in bookings:
        client = db.query(User).filter_by(id=booking.client_id).first()
        response = BookingResponse.from_orm(booking)
        response.trainer_name = trainer.name
        response.client_name = client.name if client else None
        response.trainer_telegram_id = trainer.telegram_id
        response.trainer_telegram_username = trainer.telegram_username
        response.trainer_timezone = trainer.timezone if trainer and hasattr(trainer, 'timezone') else "Europe/Moscow"
        if client:
            response.client_telegram_id = client.telegram_id
        if booking.club_id:
            club = db.query(Club).filter_by(id=booking.club_id).first()
            response.club_name = club.name if club else None
        result.append(response)

    return result


@router.get("/client/{telegram_id}", response_model=List[BookingResponse])
async def get_client_bookings(
    telegram_id: str,
    status: Optional[BookingStatus] = None,
    upcoming_only: bool = False,
    db: Session = Depends(get_db)
):
    """Get all bookings for a client"""
    client = db.query(User).filter_by(
        telegram_id=telegram_id,
        role=UserRole.CLIENT
    ).first()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    query = db.query(Booking).filter(Booking.client_id == client.id)

    if status:
        query = query.filter(Booking.status == status)

    if upcoming_only:
        query = query.filter(
            Booking.datetime > datetime.now(),
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING])
        )

    bookings = query.order_by(Booking.datetime.asc()).all()

    # Add names to response
    result = []
    for booking in bookings:
        trainer = db.query(User).filter_by(id=booking.trainer_id).first()
        response = BookingResponse.from_orm(booking)
        response.trainer_name = trainer.name if trainer else None
        response.client_name = client.name
        response.client_telegram_id = client.telegram_id
        if trainer:
            response.trainer_telegram_id = trainer.telegram_id
            response.trainer_telegram_username = trainer.telegram_username
            response.trainer_timezone = trainer.timezone if hasattr(trainer, 'timezone') else "Europe/Moscow"
        if booking.club_id:
            club = db.query(Club).filter_by(id=booking.club_id).first()
            response.club_name = club.name if club else None
        result.append(response)

    return result


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: int,
    db: Session = Depends(get_db)
):
    """Get booking details"""
    booking = db.query(Booking).filter_by(id=booking_id).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    trainer = db.query(User).filter_by(id=booking.trainer_id).first()
    client = db.query(User).filter_by(id=booking.client_id).first()

    response = BookingResponse.from_orm(booking)
    response.trainer_name = trainer.name if trainer else None
    response.client_name = client.name if client else None

    if trainer:
        response.trainer_telegram_id = trainer.telegram_id
        response.trainer_telegram_username = trainer.telegram_username
        response.trainer_timezone = trainer.timezone if hasattr(trainer, 'timezone') else "Europe/Moscow"
    if client:
        response.client_telegram_id = client.telegram_id

    if booking.club_id:
        club = db.query(Club).filter_by(id=booking.club_id).first()
        response.club_name = club.name if club else None

    return response


@router.put("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: int,
    update_data: BookingUpdate,
    telegram_id: str = Query(...),
    db: Session = Depends(get_db)
):
    """Update booking (confirm, cancel, reschedule)"""
    booking = db.query(Booking).filter_by(id=booking_id).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Check permissions
    user = db.query(User).filter_by(telegram_id=telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if user is trainer or client of this booking
    if user.id != booking.trainer_id and user.id != booking.client_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this booking")

    # Update fields
    if update_data.datetime:
        # Check for conflicts when rescheduling
        existing = db.query(Booking).filter(
            Booking.trainer_id == booking.trainer_id,
            Booking.datetime == update_data.datetime,
            Booking.id != booking_id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING])
        ).first()

        if existing:
            raise HTTPException(status_code=400, detail="Time slot already booked")

        booking.datetime = update_data.datetime

    if update_data.status:
        booking.status = update_data.status

        if update_data.status == BookingStatus.CONFIRMED:
            booking.confirmed_at = datetime.now()
        elif update_data.status == BookingStatus.CANCELLED:
            booking.cancelled_at = datetime.now()
            if update_data.cancellation_reason:
                booking.cancellation_reason = update_data.cancellation_reason
        elif update_data.status == BookingStatus.COMPLETED:
            booking.completed_at = datetime.now()

    if update_data.notes:
        booking.notes = update_data.notes

    db.commit()
    db.refresh(booking)

    # Send reschedule notification if datetime was changed
    if old_datetime and update_data.datetime:
        background_tasks.add_task(
            notify_booking_rescheduled,
            booking, old_datetime, db, is_trainer
        )

    trainer = db.query(User).filter_by(id=booking.trainer_id).first()
    client = db.query(User).filter_by(id=booking.client_id).first()

    response = BookingResponse.from_orm(booking)
    response.trainer_name = trainer.name if trainer else None
    response.client_name = client.name if client else None

    if trainer:
        response.trainer_telegram_id = trainer.telegram_id
        response.trainer_telegram_username = trainer.telegram_username
        response.trainer_timezone = trainer.timezone if hasattr(trainer, 'timezone') else "Europe/Moscow"
    if client:
        response.client_telegram_id = client.telegram_id

    return response


@router.put("/{booking_id}/confirm")
async def confirm_booking(
    booking_id: int,
    telegram_id: str = Query(...),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Confirm booking by client (no balance check - can go negative)"""
    booking = db.query(Booking).filter_by(id=booking_id).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Get client
    client = db.query(User).filter_by(telegram_id=telegram_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Check if user is the client of this booking
    if client.id != booking.client_id:
        raise HTTPException(status_code=403, detail="Only client can confirm this booking")

    # Check if already confirmed
    if booking.status == BookingStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="Booking is already confirmed")

    # Check if status allows confirmation
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot confirm booking with status {booking.status}"
        )

    # Confirm booking (no balance check - balance can go negative)
    booking.status = BookingStatus.CONFIRMED
    booking.confirmed_at = datetime.now()

    db.commit()
    db.refresh(booking)

    # Send notification to trainer
    if background_tasks:
        background_tasks.add_task(
            notify_booking_confirmed,
            booking, db
        )

    return {"message": "Booking confirmed successfully", "booking_id": booking.id}


@router.delete("/{booking_id}")
async def delete_booking(
    booking_id: int,
    telegram_id: str = Query(...),
    reason: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Cancel booking"""
    booking = db.query(Booking).filter_by(id=booking_id).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Check permissions
    user = db.query(User).filter_by(telegram_id=telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if user is trainer or client of this booking
    if user.id != booking.trainer_id and user.id != booking.client_id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")

    # Check if can be cancelled
    if not booking.can_cancel:
        raise HTTPException(
            status_code=400,
            detail="Booking cannot be cancelled (less than 24 hours before training)"
        )

    booking.status = BookingStatus.CANCELLED
    booking.cancelled_at = datetime.now()
    booking.cancellation_reason = reason

    db.commit()

    return {"message": "Booking cancelled successfully"}