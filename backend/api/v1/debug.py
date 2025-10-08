"""
DEBUG ENDPOINTS - TEMPORARY FOR TROUBLESHOOTING
DELETE THIS FILE AFTER FIXING THE NOTIFICATION BUG
"""

from fastapi import APIRouter
import subprocess

router = APIRouter()


@router.get("/logs")
async def get_logs():
    """Get last 200 lines of backend logs"""
    try:
        # Run docker-compose logs command
        result = subprocess.run(
            ["docker-compose", "logs", "--tail=200", "backend"],
            cwd="/opt/trenergram",
            capture_output=True,
            text=True,
            timeout=10
        )

        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
    except Exception as e:
        return {
            "error": str(e)
        }


@router.get("/logs/grep/{pattern}")
async def get_logs_grep(pattern: str):
    """Get logs filtered by pattern"""
    try:
        # Run docker-compose logs with grep
        result = subprocess.run(
            f"cd /opt/trenergram && docker-compose logs --tail=300 backend | grep -E '{pattern}'",
            shell=True,
            capture_output=True,
            text=True,
            timeout=10
        )

        return {
            "pattern": pattern,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
    except Exception as e:
        return {
            "error": str(e)
        }
