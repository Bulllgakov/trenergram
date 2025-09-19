from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Trenergram"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = Field(default=False)
    ENVIRONMENT: str = Field(default="production")

    # Security
    SECRET_KEY: str = Field(..., description="Secret key for JWT encoding")
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=10080)  # 7 days

    # Database
    DATABASE_URL: str = Field(..., description="Database connection URL")

    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    # Telegram Bot
    BOT_TOKEN: str = Field(..., description="Telegram bot token")
    BOT_USERNAME: str = Field(default="trenergram_bot")

    # Domain
    DOMAIN: str = Field(default="trenergram.ru")
    WEBAPP_URL: str = Field(default="https://trenergram.ru")

    # Admin
    SUPER_ADMIN_EMAIL: str = Field(default="admin@trenergram.ru")
    SUPER_ADMIN_PASSWORD: str = Field(default="changeme")

    # Payments
    PAYMENT_PROVIDER_TOKEN: Optional[str] = Field(default=None)

    # Celery
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/1")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/2")

    # CORS
    CORS_ORIGINS: list = Field(default=["*"])

    # File uploads
    MAX_UPLOAD_SIZE: int = Field(default=10 * 1024 * 1024)  # 10 MB
    UPLOAD_DIR: str = Field(default="static/uploads")

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Игнорировать лишние переменные


settings = Settings()