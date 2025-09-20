"""
Schedule model for trainer's availability
"""

from enum import Enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Date, Time, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base_sync import Base


class DayOfWeek(str, Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


class SlotStatus(str, Enum):
    AVAILABLE = "available"    # Свободно для записи
    BOOKED = "booked"         # Занято
    BLOCKED = "blocked"       # Заблокировано тренером
    BREAK = "break"          # Перерыв


class Schedule(Base):
    """Regular weekly schedule template for trainer"""
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    trainer_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Day and time
    day_of_week = Column(SQLEnum(DayOfWeek), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    # Settings
    is_active = Column(Boolean, default=True)
    is_recurring = Column(Boolean, default=True)  # Repeats every week

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    trainer = relationship("User", back_populates="schedules")

    def __repr__(self):
        return f"<Schedule trainer:{self.trainer_id} {self.day_of_week} {self.start_time}-{self.end_time}>"


class TimeSlot(Base):
    """Specific time slot for a specific date"""
    __tablename__ = "time_slots"

    id = Column(Integer, primary_key=True, index=True)
    trainer_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Date and time
    date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    # Status
    status = Column(SQLEnum(SlotStatus), default=SlotStatus.AVAILABLE)

    # Linked booking (if booked)
    booking_id = Column(Integer, ForeignKey("bookings.id"))

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    trainer = relationship("User")
    booking = relationship("Booking")

    def __repr__(self):
        return f"<TimeSlot trainer:{self.trainer_id} {self.date} {self.start_time} status:{self.status}>"

    @property
    def is_available(self):
        return self.status == SlotStatus.AVAILABLE

    @property
    def datetime(self):
        """Combine date and time"""
        from datetime import datetime
        return datetime.combine(self.date, self.start_time)