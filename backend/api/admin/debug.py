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
        return {
            "error": str(e),
            "error_type": type(e).__name__
        }
