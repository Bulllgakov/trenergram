"""
Debug endpoints for admin panel
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from db.base import get_db
from models import ClubAdmin

router = APIRouter()

@router.get("/test-db")
async def test_database(db: AsyncSession = Depends(get_db)):
    """Test database connection and check club_admins table"""

    try:
        # Check if table exists
        result = await db.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'club_admins'
            )
        """))
        table_exists = result.scalar()

        # Count admins
        result = await db.execute(select(ClubAdmin))
        admins = result.scalars().all()

        # Get super admin
        result = await db.execute(
            select(ClubAdmin).filter(ClubAdmin.email == 'admin@trenergram.ru')
        )
        super_admin = result.scalar_one_or_none()

        return {
            "table_exists": table_exists,
            "total_admins": len(admins),
            "super_admin_exists": super_admin is not None,
            "super_admin": {
                "email": super_admin.email,
                "role": super_admin.role,
                "is_active": super_admin.is_active,
                "has_password": bool(super_admin.password_hash)
            } if super_admin else None,
            "all_admins": [
                {
                    "id": a.id,
                    "email": a.email,
                    "role": a.role,
                    "is_active": a.is_active
                } for a in admins
            ]
        }

    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        }


@router.get("/list-tables")
async def list_tables(db: AsyncSession = Depends(get_db)):
    """List all tables in database"""
    from sqlalchemy import text

    try:
        result = await db.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))
        tables = [row[0] for row in result.all()]

        return {
            "success": True,
            "tables": tables,
            "count": len(tables)
        }
    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        }


@router.get("/test-dashboard")
async def test_dashboard(db: AsyncSession = Depends(get_db)):
    """Test dashboard stats query to debug 500 error"""
    from sqlalchemy import select, func
    from models import Trainer, Client, BookingOld, ClubOld

    try:
        # Test simple count
        result = await db.execute(select(func.count(Trainer.id)))
        trainer_count = result.scalar()

        return {
            "success": True,
            "trainer_count": trainer_count,
            "message": "Basic query works"
        }
    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        }


@router.post("/test-login")
async def test_login(db: AsyncSession = Depends(get_db)):
    """Test login flow to debug 500 error"""
    from core.password import verify_password
    from core.jwt import create_access_token
    from pydantic import BaseModel, ConfigDict
    from typing import Optional
    from datetime import datetime

    class AdminUserResponse(BaseModel):
        model_config = ConfigDict(from_attributes=True)
        id: int
        email: str
        name: Optional[str] = None
        role: str
        club_id: Optional[int] = None
        is_active: bool
        created_at: datetime

    try:
        # Find admin
        result = await db.execute(select(ClubAdmin).filter(ClubAdmin.email == 'admin@trenergram.ru'))
        admin = result.scalar_one_or_none()

        if not admin:
            return {"error": "Admin not found"}

        # Verify password
        password_valid = verify_password("changeme", admin.password_hash)

        # Try to create response
        user_response = AdminUserResponse.model_validate(admin)

        # Create token
        token = create_access_token(data={"email": admin.email, "role": admin.role, "club_id": admin.club_id})

        return {
            "success": True,
            "password_valid": password_valid,
            "user": user_response.model_dump(),
            "token": token[:20] + "..."
        }

    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        }
