"""
Admin dashboard statistics API
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from pydantic import BaseModel
from datetime import datetime, timedelta

from db.session import get_db
from models import User, UserRole, Booking, BookingStatus, Club, ClubAdmin
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
    db: Session = Depends(get_db)
):
    """
    Get dashboard statistics

    For super_admin (role='owner' with no club_id): shows all data
    For club_admin: shows only data for their club
    """
    # Determine if super_admin or club_admin
    is_super_admin = admin.role == "owner" and admin.club_id is None

    # Base queries
    if is_super_admin:
        # Super admin sees all trainers/clients/bookings
        trainers_query = db.query(User).filter(User.role == UserRole.TRAINER)
        clients_query = db.query(User).filter(User.role == UserRole.CLIENT)
        bookings_query = db.query(Booking)
        clubs_query = db.query(Club)
    else:
        # Club admin sees only their club's trainers/bookings
        if not admin.club_id:
            raise HTTPException(status_code=403, detail="Access denied")

        trainers_query = db.query(User).filter(
            User.role == UserRole.TRAINER,
            User.club_id == admin.club_id
        )
        # Clients are independent, but we can filter by trainers from this club
        trainer_ids = [t.id for t in trainers_query.all()]
        clients_query = db.query(User).filter(
            User.role == UserRole.CLIENT,
            User.id.in_(
                db.query(Booking.client_id).filter(
                    Booking.trainer_id.in_(trainer_ids)
                ).distinct()
            )
        )
        bookings_query = db.query(Booking).filter(
            Booking.trainer_id.in_(trainer_ids)
        )
        clubs_query = db.query(Club).filter(Club.id == admin.club_id)

    # Count trainers
    total_trainers = trainers_query.count()
    active_trainers = trainers_query.filter(User.is_active == True).count()

    # Count clients
    total_clients = clients_query.count()
    active_clients = clients_query.filter(User.is_active == True).count()

    # Count bookings by status
    total_bookings = bookings_query.count()
    confirmed_bookings = bookings_query.filter(Booking.status == BookingStatus.CONFIRMED).count()
    pending_bookings = bookings_query.filter(Booking.status == BookingStatus.PENDING).count()
    completed_bookings = bookings_query.filter(Booking.status == BookingStatus.COMPLETED).count()
    cancelled_bookings = bookings_query.filter(Booking.status == BookingStatus.CANCELLED).count()

    # Count clubs
    total_clubs = clubs_query.count()
    active_clubs = clubs_query.filter(Club.is_active == True).count()

    # Time-based bookings
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    bookings_today = bookings_query.filter(
        Booking.datetime >= today_start,
        Booking.datetime < today_start + timedelta(days=1)
    ).count()

    bookings_this_week = bookings_query.filter(
        Booking.datetime >= week_start
    ).count()

    bookings_this_month = bookings_query.filter(
        Booking.datetime >= month_start
    ).count()

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
