"""
Booking model for training sessions
"""

from enum import Enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from db.base_sync import Base


class BookingStatus(str, Enum):
    PENDING = "pending"          # Ожидает подтверждения
    CONFIRMED = "confirmed"      # Подтверждено
    COMPLETED = "completed"      # Завершено
    CANCELLED = "cancelled"      # Отменено
    NO_SHOW = "no_show"         # Клиент не пришел


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)

    # Main relations
    trainer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    club_id = Column(Integer, ForeignKey("clubs.id"))

    # Booking details
    datetime = Column(DateTime(timezone=True), nullable=False, index=True)
    duration = Column(Integer, default=60)  # Duration in minutes
    price = Column(Integer)  # Price at the time of booking
    status = Column(SQLEnum(BookingStatus), default=BookingStatus.PENDING)

    # Additional info
    notes = Column(Text)  # Notes from trainer or client
    cancellation_reason = Column(Text)

    # Payment info
    is_paid = Column(Boolean, default=False)
    payment_method = Column(String(50))  # 'balance', 'cash', 'card'

    # Reminder status
    reminder_24h_sent = Column(Boolean, default=False)
    reminder_2h_sent = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    confirmed_at = Column(DateTime(timezone=True))
    cancelled_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))

    # Relationships
    trainer = relationship("User", foreign_keys=[trainer_id], back_populates="trainer_bookings")
    client = relationship("User", foreign_keys=[client_id], back_populates="client_bookings")
    club = relationship("Club", back_populates="bookings")

    def __repr__(self):
        return f"<Booking {self.datetime} trainer:{self.trainer_id} client:{self.client_id} status:{self.status}>"

    @property
    def is_upcoming(self):
        """Check if booking is in the future"""
        from datetime import datetime
        return self.datetime > datetime.now() and self.status == BookingStatus.CONFIRMED

    @property
    def can_cancel(self):
        """Check if booking can be cancelled"""
        from datetime import datetime, timedelta
        # Can cancel if more than 24 hours before training
        return (
            self.status in [BookingStatus.PENDING, BookingStatus.CONFIRMED] and
            self.datetime > datetime.now() + timedelta(hours=24)
        )

    @property
    def can_reschedule(self):
        """Check if booking can be rescheduled"""
        from datetime import datetime, timedelta
        # Can reschedule if more than 24 hours before training
        return (
            self.status in [BookingStatus.PENDING, BookingStatus.CONFIRMED] and
            self.datetime > datetime.now() + timedelta(hours=24)
        )