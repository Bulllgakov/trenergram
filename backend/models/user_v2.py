"""
Unified User model for Trenergram platform
Supports both trainers and clients with role-based functionality
"""

from enum import Enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from db.base_sync import Base


class UserRole(str, Enum):
    TRAINER = "trainer"
    CLIENT = "client"
    CLUB_ADMIN = "club_admin"
    SUPER_ADMIN = "super_admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # Telegram data
    telegram_id = Column(String(50), unique=True, nullable=False, index=True)
    telegram_username = Column(String(100))
    telegram_first_name = Column(String(100))
    telegram_last_name = Column(String(100))

    # User info
    name = Column(String(200), nullable=False)  # Display name
    role = Column(SQLEnum(UserRole), nullable=False)
    phone = Column(String(20))
    email = Column(String(100))

    # Trainer specific fields (null for clients)
    club_id = Column(Integer, ForeignKey("clubs.id"))
    specialization = Column(String(100))  # fitness, yoga, boxing, etc.
    price = Column(Integer)  # Price per training session
    session_duration = Column(Integer, default=60)  # Training session duration in minutes
    description = Column(Text)
    rating = Column(Integer, default=50)  # 0-50 (displayed as 0-5.0)
    cancellation_hours = Column(Integer, default=24)  # Hours before training when money is charged from client balance
    timezone = Column(String(50), default="Europe/Moscow")  # IANA timezone for trainer

    # Trainer reminder settings (for unconfirmed bookings)
    reminder_1_days_before = Column(Integer, default=1)  # Days before training: 1, 2, or 3
    reminder_1_time = Column(String(10), default="20:00")  # Time to send first reminder (HH:MM)
    reminder_2_hours_after = Column(Integer, default=1)  # Hours after first: 1, 2, or 3
    reminder_3_hours_after = Column(Integer, default=1)  # Hours after second: 1, 2, or 3
    auto_cancel_hours_after = Column(Integer, default=1)  # Hours after third: 1, 2, or 3

    # Client reminder settings (for confirmed bookings)
    client_reminder_2h_enabled = Column(Boolean, default=True)  # Reminder 2 hours before training
    client_reminder_1h_enabled = Column(Boolean, default=True)  # Reminder 1 hour before training
    client_reminder_15m_enabled = Column(Boolean, default=True)  # Reminder 15 minutes before training

    # Settings (stored as JSON)
    settings = Column(JSON, default={})
    # For trainers: work_hours, etc.
    # For clients: notifications, preferences, etc.

    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_seen_at = Column(DateTime(timezone=True))

    # Relationships
    club = relationship("Club", back_populates="users")

    # For trainers
    trainer_clients = relationship(
        "TrainerClient",
        foreign_keys="TrainerClient.trainer_id",
        back_populates="trainer",
        cascade="all, delete-orphan"
    )
    trainer_bookings = relationship(
        "Booking",
        foreign_keys="Booking.trainer_id",
        back_populates="trainer",
        cascade="all, delete-orphan"
    )
    schedules = relationship(
        "Schedule",
        back_populates="trainer",
        cascade="all, delete-orphan"
    )

    # For clients
    client_trainers = relationship(
        "TrainerClient",
        foreign_keys="TrainerClient.client_id",
        back_populates="client"
    )
    client_bookings = relationship(
        "Booking",
        foreign_keys="Booking.client_id",
        back_populates="client"
    )

    def __repr__(self):
        return f"<User {self.name} ({self.role})>"

    @property
    def is_trainer(self):
        return self.role == UserRole.TRAINER

    @property
    def is_client(self):
        return self.role == UserRole.CLIENT

    @property
    def is_admin(self):
        return self.role in [UserRole.CLUB_ADMIN, UserRole.SUPER_ADMIN]


class TrainerClient(Base):
    """Many-to-many relationship between trainers and clients"""
    __tablename__ = "trainer_clients"

    id = Column(Integer, primary_key=True, index=True)
    trainer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Connection info
    source = Column(String(50))  # 'link', 'qr', 'direct', 'club'

    # Stats
    total_bookings = Column(Integer, default=0)
    completed_bookings = Column(Integer, default=0)
    cancelled_bookings = Column(Integer, default=0)

    # Balance (client's balance with this trainer)
    balance = Column(Integer, default=0)

    # Status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_booking_at = Column(DateTime(timezone=True))

    # Relationships
    trainer = relationship("User", foreign_keys=[trainer_id], back_populates="trainer_clients")
    client = relationship("User", foreign_keys=[client_id], back_populates="client_trainers")

    def __repr__(self):
        return f"<TrainerClient trainer:{self.trainer_id} client:{self.client_id}>"