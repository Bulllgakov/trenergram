from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey, Date, Time, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.app.db.base import Base


class Trainer(Base):
    __tablename__ = "trainers"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(String(50), unique=True, nullable=False)
    telegram_username = Column(String(100))
    name = Column(String(200), nullable=False)
    club_id = Column(Integer, ForeignKey("clubs.id"))
    specialization = Column(JSON)
    price = Column(Integer, default=2000)
    description = Column(Text)
    rating = Column(Integer, default=50)  # Rating from 0 to 50 (5.0)
    is_active = Column(Boolean, default=True)

    # Reminder settings
    reminder_1_hours = Column(Integer, default=24)
    reminder_1_time = Column(Time, default="20:00")
    reminder_2_delay = Column(Integer, default=2)
    reminder_3_delay = Column(Integer, default=4)
    auto_cancel_delay = Column(Integer, default=5)

    # Transfer rules
    transfer_block_hours = Column(Integer, default=24)

    # Working hours
    working_hours = Column(JSON)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    club = relationship("Club", back_populates="trainers")
    clients = relationship("TrainerClient", back_populates="trainer")
    slots = relationship("TrainerSlot", back_populates="trainer", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="trainer")
    invitations = relationship("Invitation", back_populates="trainer")
    profile_views = relationship("ProfileView", back_populates="trainer")


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(String(50), unique=True, nullable=False)
    telegram_username = Column(String(100))
    name = Column(String(200))
    phone = Column(String(20))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    trainers = relationship("TrainerClient", back_populates="client")
    clubs = relationship("ClubClient", back_populates="client")
    bookings = relationship("Booking", back_populates="client")
    invitations = relationship("Invitation", back_populates="client")


class TrainerClient(Base):
    __tablename__ = "trainer_clients"

    id = Column(Integer, primary_key=True, index=True)
    trainer_id = Column(Integer, ForeignKey("trainers.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    first_booking_date = Column(Date)
    last_booking_date = Column(Date)
    total_bookings = Column(Integer, default=0)
    status = Column(String(20), default="active")
    source = Column(String(50))
    confirmed_at = Column(DateTime(timezone=True))
    invited_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    trainer = relationship("Trainer", back_populates="clients")
    client = relationship("Client", back_populates="trainers")