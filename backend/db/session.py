"""
Database session configuration for synchronous operations
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.config import settings

# Create synchronous engine for model operations
# Convert async URL to sync URL
if "sqlite" in settings.DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL.replace("sqlite+aiosqlite", "sqlite")
else:
    # Handle both postgresql:// and postgresql+asyncpg:// URLs
    if "postgresql+asyncpg://" in settings.DATABASE_URL:
        SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    else:
        SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")

# For SQLite, we need special connect_args
connect_args = {"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
    echo=True  # Set to False in production
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()