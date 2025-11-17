"""
Admin panel models - isolated from old club models to avoid circular dependencies
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, DECIMAL, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from db.base import Base


class ClubAdmin(Base):
    """Admin users for club management panel"""
    __tablename__ = "club_admins"

    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=True)  # NULL for super_admin
    telegram_id = Column(String(50))
    email = Column(String(100), nullable=False, unique=True)
    password_hash = Column(String(255))
    name = Column(String(200))
    role = Column(String(20), default="admin")  # super_admin, club_owner, club_admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Note: No back_populates to avoid circular dependency with Club model


class ClubPayment(Base):
    """Payment history for clubs"""
    __tablename__ = "club_payments"

    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    tariff = Column(String(20), nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    status = Column(String(20), default="pending")  # pending, paid, failed, refunded
    payment_method = Column(String(50))
    transaction_id = Column(String(100))
    paid_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ClubQRCode(Base):
    """QR codes for club tracking"""
    __tablename__ = "club_qr_codes"

    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=False)
    code = Column(String(100), unique=True, nullable=False)
    name = Column(String(200))
    location = Column(String(200))  # Рецепция, Зал 1, Раздевалка
    scans_count = Column(Integer, default=0)
    conversions_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
