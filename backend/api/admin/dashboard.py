"""
Admin dashboard statistics API
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, and_, select
from pydantic import BaseModel
from datetime import datetime, timedelta

from db.base import get_db
from models import Trainer, Client, BookingOld, ClubOld, ClubAdmin
from .auth import get_current_admin

router = APIRouter()


class DashboardStats(BaseModel):
    total_trainers: int
    active_trainers: int
    total_clients: int
    active_clients: int
    total_bookings: int
    confirmed_bookings: int
    pending_bookings: int
    completed_bookings: int
    cancelled_bookings: int
    total_clubs: int
    active_clubs: int
    bookings_today: int
    bookings_this_week: int
    bookings_this_month: int


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    admin: ClubAdmin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get dashboard statistics

    For super_admin (role='super_admin' with no club_id): shows all data
    For club_admin: shows only data for their club
    """
    # Determine if super_admin or club_admin
    is_super_admin = admin.role == "super_admin" and admin.club_id is None

    # Count trainers
    if is_super_admin:
        result = await db.execute(select(func.count(Trainer.id)))
        total_trainers = result.scalar() or 0
        result = await db.execute(select(func.count(Trainer.id)).filter(Trainer.is_active == True))
        active_trainers = result.scalar() or 0
    else:
        if not admin.club_id:
            raise HTTPException(status_code=403, detail="Access denied")
        result = await db.execute(select(func.count(Trainer.id)).filter(Trainer.club_id == admin.club_id))
        total_trainers = result.scalar() or 0
        result = await db.execute(select(func.count(Trainer.id)).filter(
            Trainer.club_id == admin.club_id,
            Trainer.is_active == True
        ))
        active_trainers = result.scalar() or 0

    # Count clients (all clients for now, filtering by club is complex)
    result = await db.execute(select(func.count(Client.id)))
    total_clients = result.scalar() or 0
    active_clients = total_clients  # Clients don't have is_active in old model

    # Count bookings
    if is_super_admin:
        result = await db.execute(select(func.count(BookingOld.id)))
        total_bookings = result.scalar() or 0
        result = await db.execute(select(func.count(BookingOld.id)).filter(BookingOld.status == "confirmed"))
        confirmed_bookings = result.scalar() or 0
        result = await db.execute(select(func.count(BookingOld.id)).filter(BookingOld.status == "pending"))
        pending_bookings = result.scalar() or 0
        result = await db.execute(select(func.count(BookingOld.id)).filter(BookingOld.status == "completed"))
        completed_bookings = result.scalar() or 0
        result = await db.execute(select(func.count(BookingOld.id)).filter(BookingOld.status == "cancelled"))
        cancelled_bookings = result.scalar() or 0
    else:
        # Get trainer IDs for this club
        result = await db.execute(select(Trainer.id).filter(Trainer.club_id == admin.club_id))
        trainer_ids = [row[0] for row in result.all()]

        result = await db.execute(select(func.count(BookingOld.id)).filter(BookingOld.trainer_id.in_(trainer_ids)))
        total_bookings = result.scalar() or 0
        result = await db.execute(select(func.count(BookingOld.id)).filter(
            BookingOld.trainer_id.in_(trainer_ids),
            BookingOld.status == "confirmed"
        ))
        confirmed_bookings = result.scalar() or 0
        result = await db.execute(select(func.count(BookingOld.id)).filter(
            BookingOld.trainer_id.in_(trainer_ids),
            BookingOld.status == "pending"
        ))
        pending_bookings = result.scalar() or 0
        result = await db.execute(select(func.count(BookingOld.id)).filter(
            BookingOld.trainer_id.in_(trainer_ids),
            BookingOld.status == "completed"
        ))
        completed_bookings = result.scalar() or 0
        result = await db.execute(select(func.count(BookingOld.id)).filter(
            BookingOld.trainer_id.in_(trainer_ids),
            BookingOld.status == "cancelled"
        ))
        cancelled_bookings = result.scalar() or 0

    # Count clubs
    if is_super_admin:
        result = await db.execute(select(func.count(ClubOld.id)))
        total_clubs = result.scalar() or 0
        result = await db.execute(select(func.count(ClubOld.id)).filter(ClubOld.is_active == True))
        active_clubs = result.scalar() or 0
    else:
        total_clubs = 1
        result = await db.execute(select(ClubOld.is_active).filter(ClubOld.id == admin.club_id))
        club_active = result.scalar()
        active_clubs = 1 if club_active else 0

    # Time-based bookings (simplified - just return 0 for now)
    bookings_today = 0
    bookings_this_week = 0
    bookings_this_month = 0

    return DashboardStats(
        total_trainers=total_trainers,
        active_trainers=active_trainers,
        total_clients=total_clients,
        active_clients=active_clients,
        total_bookings=total_bookings,
        confirmed_bookings=confirmed_bookings,
        pending_bookings=pending_bookings,
        completed_bookings=completed_bookings,
        cancelled_bookings=cancelled_bookings,
        total_clubs=total_clubs,
        active_clubs=active_clubs,
        bookings_today=bookings_today,
        bookings_this_week=bookings_this_week,
        bookings_this_month=bookings_this_month
    )
