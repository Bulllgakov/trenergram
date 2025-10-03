from fastapi import APIRouter

router = APIRouter()

# Import sub-routers when they're created
# from .auth import router as auth_router
# from .clubs import router as clubs_router
# from .users import router as users_router
# from .analytics import router as analytics_router

# router.include_router(auth_router, prefix="/auth", tags=["admin-auth"])
# router.include_router(clubs_router, prefix="/clubs", tags=["admin-clubs"])
# router.include_router(users_router, prefix="/users", tags=["admin-users"])
# router.include_router(analytics_router, prefix="/analytics", tags=["admin-analytics"])

@router.get("/")
async def admin_api_root():
    return {"message": "Trenergram Admin API"}