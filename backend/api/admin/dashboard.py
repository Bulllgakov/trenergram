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
def get_dashboard_stats(
    admin: ClubAdmin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get dashboard statistics

    For super_admin (role='super_admin' with no club_id): shows all data
    For club_admin: shows only data for their club
    """
    # Determine if super_admin or club_admin
    is_super_admin = admin.role == "super_admin" and admin.club_id is None

    # Count trainers (users with role=TRAINER)
    if is_super_admin:
        total_trainers = db.query(User).filter(User.role == UserRole.TRAINER).count()
        active_trainers = db.query(User).filter(
            User.role == UserRole.TRAINER,
            User.is_active == True
        ).count()
    else:
        if not admin.club_id:
            raise HTTPException(status_code=403, detail="Access denied")
        total_trainers = db.query(User).filter(
            User.role == UserRole.TRAINER,
            User.club_id == admin.club_id
        ).count()
        active_trainers = db.query(User).filter(
            User.role == UserRole.TRAINER,
            User.club_id == admin.club_id,
            User.is_active == True
        ).count()

    # Count clients (users with role=CLIENT)
    if is_super_admin:
        total_clients = db.query(User).filter(User.role == UserRole.CLIENT).count()
        active_clients = db.query(User).filter(
            User.role == UserRole.CLIENT,
            User.is_active == True
        ).count()
    else:
        # For club admin, count clients who have bookings with club's trainers
        trainer_ids = [u.id for u in db.query(User.id).filter(
            User.role == UserRole.TRAINER,
            User.club_id == admin.club_id
        ).all()]

        total_clients = db.query(User).filter(
            User.role == UserRole.CLIENT,
            User.id.in_(
                db.query(Booking.client_id).filter(
                    Booking.trainer_id.in_(trainer_ids)
                ).distinct()
            )
        ).count()
        active_clients = total_clients

    # Count bookings
    if is_super_admin:
        total_bookings = db.query(Booking).count()
        confirmed_bookings = db.query(Booking).filter(Booking.status == BookingStatus.CONFIRMED).count()
        pending_bookings = db.query(Booking).filter(Booking.status == BookingStatus.PENDING).count()
        completed_bookings = db.query(Booking).filter(Booking.status == BookingStatus.COMPLETED).count()
        cancelled_bookings = db.query(Booking).filter(Booking.status == BookingStatus.CANCELLED).count()
    else:
        trainer_ids = [u.id for u in db.query(User.id).filter(
            User.role == UserRole.TRAINER,
            User.club_id == admin.club_id
        ).all()]

        total_bookings = db.query(Booking).filter(Booking.trainer_id.in_(trainer_ids)).count()
        confirmed_bookings = db.query(Booking).filter(
            Booking.trainer_id.in_(trainer_ids),
            Booking.status == BookingStatus.CONFIRMED
        ).count()
        pending_bookings = db.query(Booking).filter(
            Booking.trainer_id.in_(trainer_ids),
            Booking.status == BookingStatus.PENDING
        ).count()
        completed_bookings = db.query(Booking).filter(
            Booking.trainer_id.in_(trainer_ids),
            Booking.status == BookingStatus.COMPLETED
        ).count()
        cancelled_bookings = db.query(Booking).filter(
            Booking.trainer_id.in_(trainer_ids),
            Booking.status == BookingStatus.CANCELLED
        ).count()

    # Count clubs
    if is_super_admin:
        total_clubs = db.query(Club).count()
        active_clubs = db.query(Club).filter(Club.is_active == True).count()
    else:
        total_clubs = 1
        club = db.query(Club).filter(Club.id == admin.club_id).first()
        active_clubs = 1 if (club and club.is_active) else 0

    # Time-based bookings
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    if is_super_admin:
        bookings_today = db.query(Booking).filter(
            Booking.datetime >= today_start,
            Booking.datetime < today_start + timedelta(days=1)
        ).count()
        bookings_this_week = db.query(Booking).filter(Booking.datetime >= week_start).count()
        bookings_this_month = db.query(Booking).filter(Booking.datetime >= month_start).count()
    else:
        trainer_ids = [u.id for u in db.query(User.id).filter(
            User.role == UserRole.TRAINER,
            User.club_id == admin.club_id
        ).all()]

        bookings_today = db.query(Booking).filter(
            Booking.trainer_id.in_(trainer_ids),
            Booking.datetime >= today_start,
            Booking.datetime < today_start + timedelta(days=1)
        ).count()
        bookings_this_week = db.query(Booking).filter(
            Booking.trainer_id.in_(trainer_ids),
            Booking.datetime >= week_start
        ).count()
        bookings_this_month = db.query(Booking).filter(
            Booking.trainer_id.in_(trainer_ids),
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
