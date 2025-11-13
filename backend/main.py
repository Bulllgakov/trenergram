from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# from fastapi.staticfiles import StaticFiles
import uvicorn

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import settings
from api.v1 import router as api_v1_router
from api.admin import router as admin_router


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        docs_url="/api/docs" if settings.DEBUG else None,
        redoc_url="/api/redoc" if settings.DEBUG else None,
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Static files - commented for now since we don't have static files yet
    # app.mount("/static", StaticFiles(directory="static"), name="static")

    # API routes
    app.include_router(api_v1_router, prefix="/api/v1")
    app.include_router(admin_router, prefix="/api/admin")

    @app.get("/")
    async def root():
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "running"
        }

    @app.get("/health")
    async def health_check():
        health_status = {
            "status": "healthy",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT
        }

        # Check database connection
        try:
            from db.base import engine
            from sqlalchemy import text
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            health_status["database"] = "connected"
        except Exception as e:
            health_status["database"] = f"error: {str(e)[:100]}"
            health_status["status"] = "degraded"

        # CHECK: Does notifications.py have the exception code?
        import os
        notifications_file = "/app/services/notifications.py"
        if os.path.exists(notifications_file):
            with open(notifications_file, 'r') as f:
                content = f.read()
                health_status["notifications_has_exception_code"] = "raise Exception" in content and "TZ 10.6" in content
        else:
            health_status["notifications_file_missing"] = True

        return health_status

    return app


app = create_app()

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )