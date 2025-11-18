from fastapi import APIRouter

router = APIRouter()

# Import sub-routers (lazy import to avoid circular dependencies)
def setup_routers():
    from .auth import router as auth_router
    from .clubs import router as clubs_router
    from .trainers import router as trainers_router
    from .clients import router as clients_router
    from .dashboard import router as dashboard_router
    from .debug import router as debug_router

    router.include_router(auth_router, prefix="/auth", tags=["admin-auth"])
    router.include_router(clubs_router, prefix="/clubs", tags=["admin-clubs"])
    router.include_router(trainers_router, prefix="/trainers", tags=["admin-trainers"])
    router.include_router(clients_router, prefix="/clients", tags=["admin-clients"])
    router.include_router(dashboard_router, prefix="/dashboard", tags=["admin-dashboard"])
    router.include_router(debug_router, prefix="/debug", tags=["admin-debug"])

# Setup routers on module load
setup_routers()

@router.get("/")
async def admin_api_root():
    return {"message": "Trenergram Admin API"}