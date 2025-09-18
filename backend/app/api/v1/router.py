from fastapi import APIRouter

router = APIRouter()

# Import sub-routers when they're created
# from .trainers import router as trainers_router
# from .clients import router as clients_router
# from .bookings import router as bookings_router
# from .clubs import router as clubs_router

# router.include_router(trainers_router, prefix="/trainers", tags=["trainers"])
# router.include_router(clients_router, prefix="/clients", tags=["clients"])
# router.include_router(bookings_router, prefix="/bookings", tags=["bookings"])
# router.include_router(clubs_router, prefix="/clubs", tags=["clubs"])

@router.get("/")
async def api_v1_root():
    return {"message": "Trenergram API v1"}