# Admin panel models (isolated to avoid circular dependencies)
from .admin import ClubAdmin, ClubPayment, ClubQRCode

# Old models (needed for existing Mini Apps)
from .user import Trainer, Client
from .booking import TrainerSlot, Booking as BookingOld, Invitation, ProfileView

# New unified models (for future use)
from .user_v2 import User, UserRole, TrainerClient
from .club_v2 import Club, ClubTariff
from .booking_v2 import Booking, BookingStatus
from .schedule_v2 import Schedule, TimeSlot, DayOfWeek, SlotStatus

__all__ = [
    # Admin models
    "ClubAdmin", "ClubPayment", "ClubQRCode",

    # Old models (for existing Mini Apps)
    "Trainer", "Client", "TrainerSlot", "BookingOld", "Invitation", "ProfileView",

    # New models (v2)
    "User", "UserRole", "TrainerClient",
    "Club", "ClubTariff",
    "Booking", "BookingStatus",
    "Schedule", "TimeSlot", "DayOfWeek", "SlotStatus"
]