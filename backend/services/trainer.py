"""
Trainer service for database operations
"""
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy import select, and_, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.user import Trainer, Client
from models.booking import Booking
from models.club import Club
from models.enums import BookingStatus


class TrainerService:
    """Service for trainer-related database operations"""

    @staticmethod
    async def get_trainer_by_telegram_id(
        db: AsyncSession,
        telegram_id: str
    ) -> Optional[Trainer]:
        """Get trainer by telegram ID"""
        result = await db.execute(
            select(Trainer)
            .where(Trainer.telegram_id == telegram_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_today_schedule(
        db: AsyncSession,
        trainer_telegram_id: str
    ) -> List[Dict[str, Any]]:
        """Get trainer's schedule for today"""
        trainer = await TrainerService.get_trainer_by_telegram_id(db, trainer_telegram_id)
        if not trainer:
            return []

        today = date.today()
        start_of_day = datetime.combine(today, datetime.min.time())
        end_of_day = datetime.combine(today, datetime.max.time())

        result = await db.execute(
            select(Booking)
            .options(selectinload(Booking.client))
            .where(Booking.trainer_id == trainer.id)
            .where(Booking.datetime >= start_of_day)
            .where(Booking.datetime <= end_of_day)
            .order_by(Booking.datetime)
        )
        bookings = result.scalars().all()

        schedule = []
        for booking in bookings:
            schedule.append({
                'time': booking.datetime.strftime('%H:%M') if booking.datetime else '00:00',
                'client_name': booking.client.name if booking.client else 'Неизвестный',
                'status': booking.status,
                'is_confirmed': booking.status == BookingStatus.CONFIRMED.value
            })

        return schedule

    @staticmethod
    async def get_today_clients(
        db: AsyncSession,
        trainer_telegram_id: str
    ) -> List[Dict[str, Any]]:
        """Get trainer's clients for today"""
        schedule = await TrainerService.get_today_schedule(db, trainer_telegram_id)
        return [
            {
                'time': item['time'],
                'name': item['client_name'],
                'status': item['status']
            }
            for item in schedule
        ]

    @staticmethod
    async def get_tomorrow_clients(
        db: AsyncSession,
        trainer_telegram_id: str
    ) -> List[Dict[str, Any]]:
        """Get trainer's clients for tomorrow"""
        trainer = await TrainerService.get_trainer_by_telegram_id(db, trainer_telegram_id)
        if not trainer:
            return []

        tomorrow = date.today() + timedelta(days=1)
        start_of_tomorrow = datetime.combine(tomorrow, datetime.min.time())
        end_of_tomorrow = datetime.combine(tomorrow, datetime.max.time())

        result = await db.execute(
            select(Booking)
            .options(selectinload(Booking.client))
            .where(Booking.trainer_id == trainer.id)
            .where(Booking.datetime >= start_of_tomorrow)
            .where(Booking.datetime <= end_of_tomorrow)
            .order_by(Booking.datetime)
        )
        bookings = result.scalars().all()

        clients = []
        for booking in bookings:
            clients.append({
                'time': booking.datetime.strftime('%H:%M') if booking.datetime else '00:00',
                'name': booking.client.name if booking.client else 'Неизвестный',
                'status': booking.status
            })

        return clients

    @staticmethod
    async def get_trainer_stats(
        db: AsyncSession,
        trainer_telegram_id: str
    ) -> Dict[str, Any]:
        """Get trainer statistics"""
        trainer = await TrainerService.get_trainer_by_telegram_id(db, trainer_telegram_id)
        if not trainer:
            return {
                'month_completed': 0,
                'month_cancelled': 0,
                'month_new_clients': 0,
                'month_revenue': 0,
                'total_clients': 0,
                'total_completed': 0
            }

        # Current month boundaries
        today = date.today()
        month_start = date(today.year, today.month, 1)
        month_start_datetime = datetime.combine(month_start, datetime.min.time())

        # Count completed trainings this month
        result = await db.execute(
            select(func.count(Booking.id))
            .where(Booking.trainer_id == trainer.id)
            .where(Booking.datetime >= month_start_datetime)
            .where(Booking.status == BookingStatus.COMPLETED.value)
        )
        month_completed = result.scalar() or 0

        # Count cancelled trainings this month
        result = await db.execute(
            select(func.count(Booking.id))
            .where(Booking.trainer_id == trainer.id)
            .where(Booking.datetime >= month_start_datetime)
            .where(Booking.status == BookingStatus.CANCELLED.value)
        )
        month_cancelled = result.scalar() or 0

        # Count new clients this month (first booking in this month)
        result = await db.execute(
            select(func.count(func.distinct(Booking.client_id)))
            .where(Booking.trainer_id == trainer.id)
            .where(Booking.created_at >= month_start_datetime)
        )
        month_new_clients = result.scalar() or 0

        # Calculate revenue this month
        month_revenue = month_completed * (trainer.price or 2000)

        # Count total unique clients
        result = await db.execute(
            select(func.count(func.distinct(Booking.client_id)))
            .where(Booking.trainer_id == trainer.id)
        )
        total_clients = result.scalar() or 0

        # Count total completed trainings
        result = await db.execute(
            select(func.count(Booking.id))
            .where(Booking.trainer_id == trainer.id)
            .where(Booking.status == BookingStatus.COMPLETED.value)
        )
        total_completed = result.scalar() or 0

        return {
            'month_completed': month_completed,
            'month_cancelled': month_cancelled,
            'month_new_clients': month_new_clients,
            'month_revenue': month_revenue,
            'total_clients': total_clients,
            'total_completed': total_completed
        }

    @staticmethod
    async def get_trainer_club(
        db: AsyncSession,
        trainer_telegram_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get trainer's club information"""
        trainer = await TrainerService.get_trainer_by_telegram_id(db, trainer_telegram_id)
        if not trainer or not trainer.club_id:
            return None

        result = await db.execute(
            select(Club)
            .where(Club.id == trainer.club_id)
        )
        club = result.scalar_one_or_none()

        if not club:
            return None

        # Count trainers in club
        result = await db.execute(
            select(func.count(Trainer.id))
            .where(Trainer.club_id == club.id)
        )
        trainer_count = result.scalar() or 0

        return {
            'name': club.name,
            'address': club.address,
            'phone': club.phone,
            'working_hours': club.working_hours or '07:00 - 23:00',
            'tariff': club.tariff,
            'trainer_count': trainer_count
        }