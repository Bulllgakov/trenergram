from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, DECIMAL, ForeignKey, Date, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Club(Base):
    __tablename__ = "clubs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    address = Column(Text)
    district = Column(String(100))
    metro = Column(String(100))
    phone = Column(String(20))
    email = Column(String(100))
    working_hours = Column(JSON)
    tariff = Column(String(20), default="basic")  # basic, standard, premium
    tariff_expires_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    admins = relationship("ClubAdmin", back_populates="club", cascade="all, delete-orphan")
    trainers = relationship("Trainer", back_populates="club")
    payments = relationship("ClubPayment", back_populates="club")
    qr_codes = relationship("ClubQRCode", back_populates="club", cascade="all, delete-orphan")
    clients = relationship("ClubClient", back_populates="club")


class ClubAdmin(Base):
    __tablename__ = "club_admins"

    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=False)
    telegram_id = Column(String(50))
    email = Column(String(100), nullable=False, unique=True)
    password_hash = Column(String(255))
    name = Column(String(200))
    role = Column(String(20), default="admin")  # owner, admin, manager
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    club = relationship("Club", back_populates="admins")


class ClubPayment(Base):
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

    # Relationships
    club = relationship("Club", back_populates="payments")


class ClubQRCode(Base):
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

    # Relationships
    club = relationship("Club", back_populates="qr_codes")
    scanned_by = relationship("ClubClient", back_populates="qr_code")


class ClubClient(Base):
    __tablename__ = "club_clients"

    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    source = Column(String(50))  # qr_code, trainer_link, web_catalog
    qr_code_id = Column(Integer, ForeignKey("club_qr_codes.id"))
    first_visit_date = Column(Date)
    total_bookings = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    club = relationship("Club", back_populates="clients")
    client = relationship("Client", back_populates="clubs")
    qr_code = relationship("ClubQRCode", back_populates="scanned_by")