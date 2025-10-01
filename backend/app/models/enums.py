"""
Enum definitions for models
"""
from enum import Enum


class BookingStatus(str, Enum):
    """Booking status enum"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"


class InvitationStatus(str, Enum):
    """Invitation status enum"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"