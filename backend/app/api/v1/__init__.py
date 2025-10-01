"""
API v1 router
"""

from fastapi import APIRouter
from app.api.v1 import users, bookings, slots

router = APIRouter()

router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
router.include_router(slots.router, prefix="/slots", tags=["slots"])

__all__ = ["router"]