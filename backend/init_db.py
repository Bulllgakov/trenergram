import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from backend.app.db.base import Base
from backend.app.core.config import settings
from backend.app.models import *  # Import all models

async def init_db():
    """Initialize database with tables"""
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=True,
    )

    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created successfully!")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_db())