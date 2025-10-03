from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Date, Time, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from db.base import Base


class TrainerSlot(Base):
    __tablename__ = "trainer_slots"

    id = Column(Integer, primary_key=True, index=True)
    trainer_id = Column(Integer, ForeignKey("trainers.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0-6 (Monday-Sunday)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_recurring = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    trainer = relationship("Trainer", back_populates="slots")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    trainer_id = Column(Integer, ForeignKey("trainers.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    datetime = Column(DateTime, nullable=False)  # Combined date and time
    duration = Column(Integer, default=60)  # Duration in minutes
    price = Column(Integer)  # Price in minimal currency units
    status = Column(String(20), default="pending")  # pending, confirmed, cancelled, completed, no_show
    notes = Column(Text)
    is_paid = Column(Boolean, default=False)
    payment_method = Column(String(50))

    # Reminders
    reminder_24h_sent = Column(Boolean, default=False)
    reminder_2h_sent = Column(Boolean, default=False)

    # Cancellation info
    cancellation_reason = Column(Text)
    cancelled_at = Column(DateTime)
    confirmed_at = Column(DateTime)
    completed_at = Column(DateTime)

    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    trainer = relationship("Trainer", back_populates="bookings")
    client = relationship("Client", back_populates="bookings")


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)
    trainer_id = Column(Integer, ForeignKey("trainers.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"))
    datetime = Column(DateTime, nullable=False)  # Combined date and time
    temp_client_username = Column(String(100))
    status = Column(String(20), default="pending")  # pending, accepted, declined, expired
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime)

    # Relationships
    trainer = relationship("Trainer", back_populates="invitations")
    client = relationship("Client", back_populates="invitations")


class ProfileView(Base):
    __tablename__ = "profile_views"

    id = Column(Integer, primary_key=True, index=True)
    trainer_id = Column(Integer, ForeignKey("trainers.id"), nullable=False)
    viewer_telegram_id = Column(String(50))
    source = Column(String(50))  # direct_link, qr_code, web_catalog, club_page
    qr_code_id = Column(Integer, ForeignKey("club_qr_codes.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    trainer = relationship("Trainer", back_populates="profile_views")