"""
DEBUG ENDPOINTS - TEMPORARY FOR TROUBLESHOOTING
DELETE THIS FILE AFTER FIXING THE NOTIFICATION BUG
"""

from fastapi import APIRouter
import os
import hashlib

router = APIRouter()


@router.get("/check-file")
async def check_file():
    """Check if the deployed file has the exception-raising code"""
    try:
        file_path = "/app/services/notifications.py"
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                content = f.read()

            # Calculate file hash to compare with local
            file_hash = hashlib.md5(content.encode()).hexdigest()

            # Check for our marker text
            has_exception_code = "raise Exception(\"send_booking_created_to_trainer should NOT be called per TZ 10.6\")" in content
            has_old_notification = "🆕 <b>Новая запись на тренировку!</b>" in content

            # Find the send_booking_created_to_trainer function
            lines = content.split('\n')
            func_lines = []
            in_func = False
            for i, line in enumerate(lines):
                if 'async def send_booking_created_to_trainer' in line:
                    in_func = True
                if in_func:
                    func_lines.append(f"{i+1}: {line}")
                    if len(func_lines) > 15:
                        break

            return {
                "file_exists": True,
                "file_hash": file_hash,
                "file_size": len(content),
                "has_exception_code": has_exception_code,
                "has_old_notification_text": has_old_notification,
                "function_preview": '\n'.join(func_lines)
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
