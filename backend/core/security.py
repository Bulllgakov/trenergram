"""
Security utilities
"""

from typing import Optional
from fastapi import HTTPException, Query
from db.session import SessionLocal
from models import User


def get_current_user(telegram_id: str = Query(...)) -> User:
    """Get current user from telegram_id"""
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(telegram_id=telegram_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    finally:
        db.close()