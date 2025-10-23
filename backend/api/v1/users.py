"""
User API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from db.session import get_db
from models import User, UserRole, TrainerClient, Booking, BookingStatus
from core.security import get_current_user

router = APIRouter()


# Pydantic models for API
class UserResponse(BaseModel):
    id: int
    telegram_id: str
    telegram_username: Optional[str]
    name: str
    role: str
    phone: Optional[str]
    email: Optional[str]
    club_id: Optional[int]
    specialization: Optional[str]
    price: Optional[int]
    session_duration: Optional[int]
    description: Optional[str]
    rating: Optional[int]
    is_active: bool
    created_at: datetime
    timezone: Optional[str] = "Europe/Moscow"  # IANA timezone (for trainers)
    # Reminder settings (for trainers)
    reminder_1_days_before: Optional[int] = None
    reminder_1_time: Optional[str] = None
    reminder_2_hours_after: Optional[int] = None
    reminder_3_hours_after: Optional[int] = None
    auto_cancel_hours_after: Optional[int] = None

    class Config:
        from_attributes = True


class TrainerResponse(UserResponse):
    total_clients: int = 0
    total_bookings: int = 0


class TrainerWithBalanceResponse(BaseModel):
    """Trainer info with balance for client's view"""
    id: int
    telegram_id: str
    telegram_username: Optional[str]
    name: str
    phone: Optional[str]
    email: Optional[str]
    specialization: Optional[str]
    price: Optional[int]
    session_duration: Optional[int]
    description: Optional[str]
    rating: Optional[int]
    timezone: Optional[str] = "Europe/Moscow"
    # Balance from TrainerClient relationship
    balance: int

    class Config:
        from_attributes = True


class ClientResponse(UserResponse):
    trainers: List[TrainerWithBalanceResponse] = []


class ClientWithBalanceResponse(BaseModel):
    """Client info with balance and statistics for trainer's view"""
    id: int
    telegram_id: str
    telegram_username: Optional[str]
    name: str
    phone: Optional[str]
    email: Optional[str]
    # Balance and stats from TrainerClient relationship
    balance: int
    remaining_trainings: int
    total_bookings: int
    completed_bookings: int
    cancelled_bookings: int
    total_spent: int
    avg_bookings_per_month: float
    created_at: datetime

    class Config:
        from_attributes = True


class TopupBalanceRequest(BaseModel):
    """Request model for topping up client balance"""
    amount: int


class TopupRequestData(BaseModel):
    """Request model for client reporting topup to trainer"""
    client_telegram_id: str
    trainer_name: str
    amount: int


class ClientReminderSettingsUpdate(BaseModel):
    """Request model for updating client reminder settings"""
    reminder_2h: Optional[bool] = None
    reminder_1h: Optional[bool] = None
    reminder_15m: Optional[bool] = None


class TrainerSettingsUpdate(BaseModel):
    session_duration: Optional[int] = None
    price: Optional[int] = None
    specialization: Optional[str] = None
    description: Optional[str] = None
    # Reminder settings
    reminder_1_days_before: Optional[int] = None
    reminder_1_time: Optional[str] = None  # Time as string "HH:MM"
    reminder_2_hours_after: Optional[int] = None
    reminder_3_hours_after: Optional[int] = None
    auto_cancel_hours_after: Optional[int] = None


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    telegram_id: str = Query(..., description="Telegram user ID"),
    db: Session = Depends(get_db)
):
    """Get current user information"""
    user = db.query(User).filter_by(telegram_id=telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/trainer/{telegram_id}", response_model=TrainerResponse)
async def get_trainer_info(
    telegram_id: str,
    db: Session = Depends(get_db)
):
    """Get trainer information with statistics"""
    trainer = db.query(User).filter_by(
        telegram_id=telegram_id,
        role=UserRole.TRAINER
    ).first()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Get statistics
    total_clients = db.query(TrainerClient).filter_by(
        trainer_id=trainer.id,
        is_active=True
    ).count()

    total_bookings = db.query(Booking).filter_by(
        trainer_id=trainer.id
    ).count()

    response = TrainerResponse.from_orm(trainer)
    response.total_clients = total_clients
    response.total_bookings = total_bookings

    return response


@router.get("/trainer/{telegram_id}/clients", response_model=List[ClientWithBalanceResponse])
async def get_trainer_clients(
    telegram_id: str,
    db: Session = Depends(get_db)
):
    """Get all clients of a trainer with balance and statistics"""
    from datetime import datetime, timedelta, timezone

    trainer = db.query(User).filter_by(
        telegram_id=telegram_id,
        role=UserRole.TRAINER
    ).first()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Get all trainer-client relationships
    relationships = db.query(TrainerClient).filter_by(
        trainer_id=trainer.id,
        is_active=True
    ).all()

    # Build response with balance and stats
    result = []
    for rel in relationships:
        client = db.query(User).filter_by(id=rel.client_id).first()
        if not client:
            continue

        # Calculate total spent (sum of all charged bookings)
        charged_bookings = db.query(Booking).filter_by(
            trainer_id=trainer.id,
            client_id=client.id,
            is_charged=True
        ).all()
        total_spent = sum(b.price or 0 for b in charged_bookings)

        # Calculate remaining trainings (balance / trainer price)
        trainer_price = trainer.price or 2000
        remaining_trainings = max(0, rel.balance // trainer_price) if trainer_price > 0 else 0

        # Calculate avg bookings per month based on completed bookings
        if rel.created_at:
            # Use timezone-aware datetime for comparison
            now = datetime.now(timezone.utc)
            # Handle both timezone-aware and naive datetimes
            created_at = rel.created_at
            if created_at.tzinfo is None:
                # If created_at is naive, make it aware (assume UTC)
                from datetime import timezone as tz
                created_at = created_at.replace(tzinfo=tz.utc)

            months_active = max(1, (now - created_at).days / 30)

            # Count confirmed bookings (not just completed)
            confirmed_count = db.query(Booking).filter(
                Booking.trainer_id == trainer.id,
                Booking.client_id == client.id,
                Booking.status == BookingStatus.CONFIRMED
            ).count()

            avg_bookings_per_month = round(confirmed_count / months_active, 1)
        else:
            avg_bookings_per_month = 0.0

        client_data = ClientWithBalanceResponse(
            id=client.id,
            telegram_id=client.telegram_id,
            telegram_username=client.telegram_username,
            name=client.name,
            phone=client.phone,
            email=client.email,
            balance=rel.balance,
            remaining_trainings=remaining_trainings,
            total_bookings=rel.total_bookings,
            completed_bookings=rel.completed_bookings,
            cancelled_bookings=rel.cancelled_bookings,
            total_spent=total_spent,
            avg_bookings_per_month=avg_bookings_per_month,
            created_at=rel.created_at
        )
        result.append(client_data)

    return result


@router.get("/client/{telegram_id}", response_model=ClientResponse)
async def get_client_info(
    telegram_id: str,
    db: Session = Depends(get_db)
):
    """Get client information with trainers"""
    client = db.query(User).filter_by(
        telegram_id=telegram_id,
        role=UserRole.CLIENT
    ).first()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Get all trainers with balance
    relationships = db.query(TrainerClient).filter_by(
        client_id=client.id,
        is_active=True
    ).all()

    # Build trainers list with balance from relationship
    trainers_with_balance = []
    for rel in relationships:
        trainer = db.query(User).filter_by(id=rel.trainer_id).first()
        if trainer:
            trainer_data = TrainerWithBalanceResponse(
                id=trainer.id,
                telegram_id=trainer.telegram_id,
                telegram_username=trainer.telegram_username,
                name=trainer.name,
                phone=trainer.phone,
                email=trainer.email,
                specialization=trainer.specialization,
                price=trainer.price,
                session_duration=trainer.session_duration,
                description=trainer.description,
                rating=trainer.rating,
                timezone=trainer.timezone if hasattr(trainer, 'timezone') else "Europe/Moscow",
                balance=rel.balance  # Balance from TrainerClient relationship
            )
            trainers_with_balance.append(trainer_data)

    response = ClientResponse.from_orm(client)
    response.trainers = trainers_with_balance

    return response


@router.put("/profile")
async def update_profile(
    telegram_id: str = Query(...),
    name: Optional[str] = None,
    phone: Optional[str] = None,
    specialization: Optional[str] = None,
    price: Optional[int] = None,
    session_duration: Optional[int] = None,
    description: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Update user profile"""
    user = db.query(User).filter_by(telegram_id=telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if name:
        user.name = name
    if phone:
        user.phone = phone
    if specialization and user.role == UserRole.TRAINER:
        user.specialization = specialization
    if price and user.role == UserRole.TRAINER:
        user.price = price
    if session_duration and user.role == UserRole.TRAINER:
        # Validate session duration (30-240 minutes)
        if 30 <= session_duration <= 240:
            user.session_duration = session_duration
        else:
            raise HTTPException(status_code=400, detail="Session duration must be between 30 and 240 minutes")
    if description and user.role == UserRole.TRAINER:
        user.description = description

    db.commit()
    db.refresh(user)

    return {"message": "Profile updated successfully", "user": UserResponse.from_orm(user)}


@router.put("/trainer/{telegram_id}/settings", response_model=UserResponse)
async def update_trainer_settings(
    telegram_id: str,
    settings: TrainerSettingsUpdate,
    db: Session = Depends(get_db)
):
    """Update trainer-specific settings"""
    trainer = db.query(User).filter_by(
        telegram_id=telegram_id,
        role=UserRole.TRAINER
    ).first()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Update fields if provided
    if settings.session_duration is not None:
        if 30 <= settings.session_duration <= 240:
            trainer.session_duration = settings.session_duration
        else:
            raise HTTPException(status_code=400, detail="Session duration must be between 30 and 240 minutes")

    if settings.price is not None:
        trainer.price = settings.price

    if settings.specialization is not None:
        trainer.specialization = settings.specialization

    if settings.description is not None:
        trainer.description = settings.description

    # Update reminder settings if provided
    if settings.reminder_1_days_before is not None:
        if 1 <= settings.reminder_1_days_before <= 3:
            trainer.reminder_1_days_before = settings.reminder_1_days_before
        else:
            raise HTTPException(status_code=400, detail="reminder_1_days_before must be 1, 2, or 3")

    if settings.reminder_1_time is not None:
        from datetime import datetime
        try:
            # Parse time string and convert to time object
            time_obj = datetime.strptime(settings.reminder_1_time, "%H:%M").time()
            trainer.reminder_1_time = time_obj
        except ValueError:
            raise HTTPException(status_code=400, detail="reminder_1_time must be in HH:MM format")

    if settings.reminder_2_hours_after is not None:
        if 1 <= settings.reminder_2_hours_after <= 3:
            trainer.reminder_2_hours_after = settings.reminder_2_hours_after
        else:
            raise HTTPException(status_code=400, detail="reminder_2_hours_after must be 1, 2, or 3")

    if settings.reminder_3_hours_after is not None:
        if 1 <= settings.reminder_3_hours_after <= 3:
            trainer.reminder_3_hours_after = settings.reminder_3_hours_after
        else:
            raise HTTPException(status_code=400, detail="reminder_3_hours_after must be 1, 2, or 3")

    if settings.auto_cancel_hours_after is not None:
        if 1 <= settings.auto_cancel_hours_after <= 3:
            trainer.auto_cancel_hours_after = settings.auto_cancel_hours_after
        else:
            raise HTTPException(status_code=400, detail="auto_cancel_hours_after must be 1, 2, or 3")

    db.commit()
    db.refresh(trainer)

    return trainer


@router.post("/trainer/{trainer_telegram_id}/client/{client_telegram_id}/topup")
async def topup_client_balance(
    trainer_telegram_id: str,
    client_telegram_id: str,
    topup_data: TopupBalanceRequest,
    db: Session = Depends(get_db)
):
    """Top up client balance with specified amount"""
    # Validate amount
    if topup_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    # Get trainer
    trainer = db.query(User).filter_by(
        telegram_id=trainer_telegram_id,
        role=UserRole.TRAINER
    ).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Get client
    client = db.query(User).filter_by(
        telegram_id=client_telegram_id,
        role=UserRole.CLIENT
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Get trainer-client relationship
    trainer_client = db.query(TrainerClient).filter_by(
        trainer_id=trainer.id,
        client_id=client.id,
        is_active=True
    ).first()

    if not trainer_client:
        raise HTTPException(status_code=404, detail="Client relationship not found")

    # Add to balance
    trainer_client.balance += topup_data.amount
    db.commit()
    db.refresh(trainer_client)

    return {
        "message": "Balance topped up successfully",
        "client_name": client.name,
        "amount": topup_data.amount,
        "new_balance": trainer_client.balance
    }


@router.post("/topup-request")
async def request_topup_from_trainer(
    request_data: TopupRequestData,
    db: Session = Depends(get_db)
):
    """Client reports topup payment to trainer (trainer needs to confirm)"""
    # Validate amount
    if request_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    # Get client
    client = db.query(User).filter_by(
        telegram_id=request_data.client_telegram_id,
        role=UserRole.CLIENT
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Find trainer by name (from trainer profile opened by client)
    # We need to find the trainer_client relationship to get the exact trainer
    relationships = db.query(TrainerClient).filter_by(
        client_id=client.id,
        is_active=True
    ).all()

    trainer = None
    for rel in relationships:
        t = db.query(User).filter_by(id=rel.trainer_id).first()
        if t and t.name == request_data.trainer_name:
            trainer = t
            break

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Send notification to trainer using NotificationService
    from services.notifications import NotificationService
    notification_service = NotificationService()

    try:
        await notification_service.send_topup_request_to_trainer(
            client=client,
            trainer=trainer,
            amount=request_data.amount,
            db=db
        )
    finally:
        await notification_service.close()

    return {
        "message": "Topup request sent to trainer",
        "trainer_name": trainer.name,
        "client_name": client.name,
        "amount": request_data.amount
    }


@router.put("/client/{telegram_id}/reminder-settings", response_model=UserResponse)
async def update_client_reminder_settings(
    telegram_id: str,
    settings: ClientReminderSettingsUpdate,
    db: Session = Depends(get_db)
):
    """Update client reminder settings"""
    client = db.query(User).filter_by(
        telegram_id=telegram_id,
        role=UserRole.CLIENT
    ).first()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Update reminder settings if provided
    if settings.reminder_2h is not None:
        client.client_reminder_2h_enabled = settings.reminder_2h

    if settings.reminder_1h is not None:
        client.client_reminder_1h_enabled = settings.reminder_1h

    if settings.reminder_15m is not None:
        client.client_reminder_15m_enabled = settings.reminder_15m

    db.commit()
    db.refresh(client)

    return client