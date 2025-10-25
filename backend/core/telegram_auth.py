"""
Telegram WebApp authentication utilities
Validates init_data from Telegram Mini Apps
"""

import hmac
import hashlib
from typing import Optional, Dict
from urllib.parse import parse_qs, unquote
from fastapi import HTTPException, Header
import json

from core.config import settings


def validate_telegram_web_app_data(init_data: str, bot_token: Optional[str] = None) -> Dict:
    """
    Validate Telegram WebApp init_data

    Args:
        init_data: The init_data string from Telegram.WebApp.initData
        bot_token: Bot token (defaults to settings.BOT_TOKEN)

    Returns:
        Dict with parsed and validated data

    Raises:
        HTTPException: If validation fails
    """
    if not init_data:
        raise HTTPException(status_code=401, detail="Missing init_data")

    if not bot_token:
        bot_token = settings.BOT_TOKEN

    try:
        # Parse init_data
        parsed_data = parse_qs(init_data)

        # Extract hash
        if 'hash' not in parsed_data:
            raise HTTPException(status_code=401, detail="Missing hash in init_data")

        received_hash = parsed_data['hash'][0]
        del parsed_data['hash']

        # Create data check string
        data_check_arr = []
        for key in sorted(parsed_data.keys()):
            value = parsed_data[key][0]
            data_check_arr.append(f"{key}={value}")

        data_check_string = '\n'.join(data_check_arr)

        # Create secret key
        secret_key = hmac.new(
            b"WebAppData",
            bot_token.encode(),
            hashlib.sha256
        ).digest()

        # Calculate hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()

        # Compare hashes
        if not hmac.compare_digest(calculated_hash, received_hash):
            raise HTTPException(status_code=401, detail="Invalid init_data hash")

        # Parse user data
        result = {}
        for key, value in parsed_data.items():
            if key == 'user':
                try:
                    result['user'] = json.loads(unquote(value[0]))
                except json.JSONDecodeError:
                    raise HTTPException(status_code=401, detail="Invalid user data in init_data")
            else:
                result[key] = value[0]

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Failed to validate init_data: {str(e)}")


def get_telegram_user_id(init_data: str) -> str:
    """
    Extract and return Telegram user ID from init_data

    Args:
        init_data: The init_data string from Telegram.WebApp.initData

    Returns:
        str: Telegram user ID

    Raises:
        HTTPException: If validation fails or user ID not found
    """
    validated_data = validate_telegram_web_app_data(init_data)

    if 'user' not in validated_data or 'id' not in validated_data['user']:
        raise HTTPException(status_code=401, detail="User ID not found in init_data")

    return str(validated_data['user']['id'])


def validate_init_data_header(x_telegram_init_data: str = Header(None)) -> Dict:
    """
    FastAPI dependency to validate X-Telegram-Init-Data header

    Usage:
        @app.get("/protected")
        def protected_route(telegram_data: Dict = Depends(validate_init_data_header)):
            user_id = telegram_data['user']['id']
            ...

    Args:
        x_telegram_init_data: Header value

    Returns:
        Dict with validated Telegram data
    """
    if not x_telegram_init_data:
        raise HTTPException(
            status_code=401,
            detail="Missing X-Telegram-Init-Data header"
        )

    return validate_telegram_web_app_data(x_telegram_init_data)


def get_user_id_from_header(x_telegram_init_data: str = Header(None)) -> str:
    """
    FastAPI dependency to extract user ID from X-Telegram-Init-Data header

    Usage:
        @app.get("/my-data")
        def get_my_data(telegram_id: str = Depends(get_user_id_from_header)):
            ...

    Args:
        x_telegram_init_data: Header value

    Returns:
        str: Telegram user ID
    """
    telegram_data = validate_init_data_header(x_telegram_init_data)

    if 'user' not in telegram_data or 'id' not in telegram_data['user']:
        raise HTTPException(status_code=401, detail="User ID not found")

    return str(telegram_data['user']['id'])
