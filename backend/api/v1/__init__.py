"""
API v1 router
"""

from fastapi import APIRouter
from api.v1 import users, bookings, slots, trainers, debug

router = APIRouter()

router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
router.include_router(slots.router, prefix="/slots", tags=["slots"])
router.include_router(trainers.router, prefix="/trainers", tags=["trainers"])
router.include_router(debug.router, prefix="/debug", tags=["debug"])

__all__ = ["router"]