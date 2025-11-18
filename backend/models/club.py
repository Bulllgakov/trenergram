from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, DECIMAL, ForeignKey, Date, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from db.base import Base


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
    # Note: admins, payments, qr_codes relationships removed to avoid conflicts with admin.py models
    trainers = relationship("Trainer", back_populates="club")
    clients = relationship("ClubClient", back_populates="club")


# Note: ClubAdmin, ClubPayment, ClubQRCode models moved to admin.py to avoid circular dependencies
# These old definitions are kept commented out for reference only
# The active models for admin panel are in admin.py

# class ClubAdmin(Base):
#     __tablename__ = "club_admins"
#     ...

# class ClubPayment(Base):
#     __tablename__ = "club_payments"
#     ...

# class ClubQRCode(Base):
#     __tablename__ = "club_qr_codes"
#     ...


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
    # Note: qr_code relationship removed since ClubQRCode moved to admin.py