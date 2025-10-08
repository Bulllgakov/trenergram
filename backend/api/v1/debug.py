"""
DEBUG ENDPOINTS - TEMPORARY FOR TROUBLESHOOTING
DELETE THIS FILE AFTER FIXING THE NOTIFICATION BUG
"""

from fastapi import APIRouter
import os

router = APIRouter()


@router.get("/version")
async def get_version():
    """Check which version of notifications.py is deployed"""
    try:
        # Read the notifications.py file from disk
        file_path = "/app/services/notifications.py"
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                content = f.read()

            # Check for version marker
            has_version_marker = "VERSION 2025-10-08-v3" in content
            has_pass_only = "notify_booking_created_by_trainer" in content

            # Get the actual function
            lines = content.split('\n')
            function_start = None
            function_lines = []

            for i, line in enumerate(lines):
                if 'async def notify_booking_created_by_trainer' in line:
                    function_start = i
                if function_start is not None and i >= function_start:
                    function_lines.append(line)
                    if i > function_start and line and not line.startswith(' '):
                        break
                    if len(function_lines) > 20:
                        break

            return {
                "file_exists": True,
                "has_version_marker": has_version_marker,
                "has_correct_function": has_pass_only,
                "function_code": '\n'.join(function_lines[:15]),
                "file_size": len(content)
            }
        else:
            return {
                "file_exists": False,
                "error": f"File not found: {file_path}"
            }
    except Exception as e:
        return {
            "error": str(e),
            "type": type(e).__name__
        }


@router.get("/bookings-code")
async def get_bookings_code():
    """Check bookings.py notification routing"""
    try:
        file_path = "/app/api/v1/bookings.py"
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                lines = f.readlines()

            # Find the notification routing section (around line 126-136)
            relevant_lines = []
            for i in range(max(0, 115), min(len(lines), 145)):
                relevant_lines.append(f"{i+1}: {lines[i].rstrip()}")

            return {
                "file_exists": True,
                "notification_routing": '\n'.join(relevant_lines)
            }
        else:
            return {
                "file_exists": False,
                "error": f"File not found: {file_path}"
            }
    except Exception as e:
        return {
            "error": str(e)
        }
