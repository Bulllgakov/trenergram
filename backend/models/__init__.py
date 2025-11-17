# Admin panel models (isolated to avoid circular dependencies)
from .admin import ClubAdmin, ClubPayment, ClubQRCode

# Old models (temporarily commented due to async base issue)
# from .club import Club as ClubOld, ClubClient
# from .user import Trainer, Client, TrainerClient as TrainerClientOld
# from .booking import TrainerSlot, Booking as BookingOld, Invitation, ProfileView

# New unified models
from .user_v2 import User, UserRole, TrainerClient
from .club_v2 import Club, ClubTariff
from .booking_v2 import Booking, BookingStatus
from .schedule_v2 import Schedule, TimeSlot, DayOfWeek, SlotStatus

__all__ = [
    # Old models (partially enabled for admin panel)
    "ClubAdmin", "ClubPayment", "ClubQRCode",
    # "ClubOld", "ClubClient",
    # "Trainer", "Client", "TrainerClientOld",
    # "TrainerSlot", "BookingOld", "Invitation", "ProfileView",

    # New models
    "User", "UserRole", "TrainerClient",
    "Club", "ClubTariff",
    "Booking", "BookingStatus",
    "Schedule", "TimeSlot", "DayOfWeek", "SlotStatus"
]