"""
User API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.models import User, UserRole, TrainerClient, Booking, BookingStatus
from app.core.security import get_current_user

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
    description: Optional[str]
    rating: Optional[int]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TrainerResponse(UserResponse):
    total_clients: int = 0
    total_bookings: int = 0


class ClientResponse(UserResponse):
    trainers: List[UserResponse] = []


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


@router.get("/trainer/{telegram_id}/clients", response_model=List[UserResponse])
async def get_trainer_clients(
    telegram_id: str,
    db: Session = Depends(get_db)
):
    """Get all clients of a trainer"""
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

    # Get client users
    client_ids = [rel.client_id for rel in relationships]
    clients = db.query(User).filter(User.id.in_(client_ids)).all() if client_ids else []

    return clients


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

    # Get all trainers
    relationships = db.query(TrainerClient).filter_by(
        client_id=client.id,
        is_active=True
    ).all()

    trainer_ids = [rel.trainer_id for rel in relationships]
    trainers = db.query(User).filter(User.id.in_(trainer_ids)).all() if trainer_ids else []

    response = ClientResponse.from_orm(client)
    response.trainers = trainers

    return response


@router.put("/profile")
async def update_profile(
    telegram_id: str = Query(...),
    name: Optional[str] = None,
    phone: Optional[str] = None,
    specialization: Optional[str] = None,
    price: Optional[int] = None,
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
    if description and user.role == UserRole.TRAINER:
        user.description = description

    db.commit()
    db.refresh(user)

    return {"message": "Profile updated successfully", "user": UserResponse.from_orm(user)}