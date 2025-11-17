"""
Debug endpoint to check database tables
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from db.base import get_db

router = APIRouter()

@router.get("/db-tables")
async def check_db_tables(db: AsyncSession = Depends(get_db)):
    """Check which tables exist and their row counts"""

    # Get all tables
    result = await db.execute(text("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
    """))
    tables = [row[0] for row in result.fetchall()]

    # Count rows in each table
    counts = {}
    for table in tables:
        try:
            result = await db.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.scalar()
            counts[table] = count
        except Exception as e:
            counts[table] = f"Error: {str(e)[:50]}"

    return {
        "total_tables": len(tables),
        "tables": counts
    }
