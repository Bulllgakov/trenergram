"""
Club model for fitness clubs
"""

from enum import Enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base_sync import Base


class ClubTariff(str, Enum):
    FREE = "free"            # Базовый (0₽)
    STANDARD = "standard"    # Стандарт (9900₽/мес)
    PREMIUM = "premium"      # Премиум (19900₽/мес)


class Club(Base):
    __tablename__ = "clubs"

    id = Column(Integer, primary_key=True, index=True)

    # Basic info
    name = Column(String(200), nullable=False, unique=True)
    address = Column(String(500))
    phone = Column(String(20))
    email = Column(String(100))
    website = Column(String(200))

    # Location
    city = Column(String(100))
    district = Column(String(100))
    metro = Column(String(100))
    latitude = Column(String(20))
    longitude = Column(String(20))

    # Description
    description = Column(Text)
    working_hours = Column(JSON)  # {"monday": {"from": "07:00", "to": "23:00"}, ...}

    # Images
    logo_url = Column(String(500))
    photos = Column(JSON, default=[])  # List of photo URLs

    # Tariff and limits
    tariff = Column(SQLEnum(ClubTariff), default=ClubTariff.FREE)
    tariff_expires_at = Column(DateTime(timezone=True))
    max_trainers = Column(Integer, default=5)  # Limit based on tariff

    # Settings
    settings = Column(JSON, default={})

    # QR codes
    qr_code = Column(String(100), unique=True)  # Unique QR code for club

    # Statistics
    total_trainers = Column(Integer, default=0)
    total_clients = Column(Integer, default=0)
    total_bookings = Column(Integer, default=0)

    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    users = relationship("User", back_populates="club")
    bookings = relationship("Booking", back_populates="club")

    def __repr__(self):
        return f"<Club {self.name} ({self.tariff})>"

    @property
    def is_paid(self):
        return self.tariff != ClubTariff.FREE

    @property
    def can_add_trainer(self):
        """Check if club can add more trainers based on tariff"""
        if self.tariff == ClubTariff.FREE:
            return self.total_trainers < 5
        elif self.tariff == ClubTariff.STANDARD:
            return self.total_trainers < 20
        else:  # PREMIUM
            return True  # Unlimited

    @property
    def has_crm(self):
        """Check if club has CRM access"""
        return self.tariff in [ClubTariff.STANDARD, ClubTariff.PREMIUM]

    @property
    def has_analytics(self):
        """Check if club has analytics access"""
        return self.tariff in [ClubTariff.STANDARD, ClubTariff.PREMIUM]

    @property
    def has_mailing(self):
        """Check if club has mass mailing access"""
        return self.tariff in [ClubTariff.STANDARD, ClubTariff.PREMIUM]

    @property
    def has_api(self):
        """Check if club has API access"""
        return self.tariff == ClubTariff.PREMIUM