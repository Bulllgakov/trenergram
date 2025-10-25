"""
Security utilities
"""

from typing import Optional
from fastapi import HTTPException, Query, Depends, Header
from sqlalchemy.orm import Session
from db.session import get_db
from models import User, UserRole
from core.telegram_auth import get_user_id_from_header


def get_current_user(telegram_id: str = Query(...), db: Session = Depends(get_db)) -> User:
    """
    Get current user from telegram_id query parameter

    DEPRECATED: Use get_current_user_from_telegram() instead for better security

    This method is kept for backward compatibility with existing endpoints
    """
    user = db.query(User).filter_by(telegram_id=telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def get_current_user_from_telegram(
    telegram_id: str = Depends(get_user_id_from_header),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current user from Telegram WebApp init_data (secure method)

    Validates X-Telegram-Init-Data header and extracts user ID

    Usage:
        @app.get("/my-profile")
        def get_my_profile(current_user: User = Depends(get_current_user_from_telegram)):
            return current_user
    """
    user = db.query(User).filter_by(telegram_id=telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def get_current_trainer(
    current_user: User = Depends(get_current_user_from_telegram)
) -> User:
    """
    Ensure current user is a trainer

    Usage:
        @app.get("/trainer/clients")
        def get_my_clients(trainer: User = Depends(get_current_trainer)):
            ...
    """
    if current_user.role != UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Only trainers can access this resource")
    return current_user


def get_current_client(
    current_user: User = Depends(get_current_user_from_telegram)
) -> User:
    """
    Ensure current user is a client

    Usage:
        @app.get("/client/bookings")
        def get_my_bookings(client: User = Depends(get_current_client)):
            ...
    """
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can access this resource")
    return current_user