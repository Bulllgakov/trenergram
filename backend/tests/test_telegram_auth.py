"""
Tests for Telegram WebApp authentication
"""

import pytest
import hmac
import hashlib
import json
from urllib.parse import urlencode
from fastapi import HTTPException

from core.telegram_auth import (
    validate_telegram_web_app_data,
    get_telegram_user_id,
    validate_init_data_header,
    get_user_id_from_header
)


class TestTelegramAuth:
    """Test Telegram WebApp authentication"""

    @pytest.fixture
    def bot_token(self):
        """Test bot token - use actual BOT_TOKEN from settings for consistency"""
        from core.config import settings
        return settings.BOT_TOKEN

    @pytest.fixture
    def user_data(self):
        """Test user data"""
        return {
            "id": 123456789,
            "first_name": "John",
            "last_name": "Doe",
            "username": "johndoe",
            "language_code": "en"
        }

    def generate_init_data(self, user_data, bot_token, query_id="AAH", auth_date=None):
        """
        Generate valid init_data with correct hash

        Args:
            user_data: Dict with user info
            bot_token: Telegram bot token
            query_id: Optional query ID
            auth_date: Optional auth date timestamp

        Returns:
            str: Valid init_data string
        """
        # Prepare data - user must be JSON string
        user_json = json.dumps(user_data, separators=(',', ':'))

        # Create data for hashing (before URL encoding)
        data_for_hash = {
            "auth_date": str(auth_date or 1234567890),
            "query_id": query_id,
            "user": user_json
        }

        # Sort and create data check string
        data_check_arr = [f"{key}={value}" for key, value in sorted(data_for_hash.items())]
        data_check_string = '\n'.join(data_check_arr)

        # Create secret key
        secret_key = hmac.new(
            b"WebAppData",
            bot_token.encode(),
            hashlib.sha256
        ).digest()

        # Calculate hash
        hash_value = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()

        # Return as URL-encoded string with hash
        result_data = {
            "auth_date": str(auth_date or 1234567890),
            "hash": hash_value,
            "query_id": query_id,
            "user": user_json
        }

        return urlencode(result_data)

    def test_validate_valid_init_data(self, user_data, bot_token):
        """Test validation of valid init_data"""
        init_data = self.generate_init_data(user_data, bot_token)
        result = validate_telegram_web_app_data(init_data, bot_token)

        assert 'user' in result
        assert result['user']['id'] == 123456789
        assert result['user']['first_name'] == "John"
        assert 'query_id' in result
        assert 'auth_date' in result

    def test_validate_missing_init_data(self, bot_token):
        """Test validation fails with missing init_data"""
        with pytest.raises(HTTPException) as exc_info:
            validate_telegram_web_app_data("", bot_token)

        assert exc_info.value.status_code == 401
        assert "Missing init_data" in exc_info.value.detail

    def test_validate_missing_hash(self, user_data, bot_token):
        """Test validation fails with missing hash"""
        data = {
            "query_id": "AAH",
            "user": json.dumps(user_data),
            "auth_date": "1234567890"
        }
        init_data = urlencode(data)  # No hash

        with pytest.raises(HTTPException) as exc_info:
            validate_telegram_web_app_data(init_data, bot_token)

        assert exc_info.value.status_code == 401
        assert "Missing hash" in exc_info.value.detail

    def test_validate_invalid_hash(self, user_data, bot_token):
        """Test validation fails with invalid hash"""
        init_data = self.generate_init_data(user_data, bot_token)

        # Tamper with the init_data
        init_data = init_data.replace("123456789", "999999999")

        with pytest.raises(HTTPException) as exc_info:
            validate_telegram_web_app_data(init_data, bot_token)

        assert exc_info.value.status_code == 401
        assert "Invalid init_data hash" in exc_info.value.detail

    def test_validate_wrong_bot_token(self, user_data, bot_token):
        """Test validation fails with wrong bot token"""
        init_data = self.generate_init_data(user_data, bot_token)

        # Use different bot token for validation
        wrong_token = "987654:ZYX-WVU9876tsrqp-xyz12A3b4c5d6ef78"

        with pytest.raises(HTTPException) as exc_info:
            validate_telegram_web_app_data(init_data, wrong_token)

        assert exc_info.value.status_code == 401
        assert "Invalid init_data hash" in exc_info.value.detail

    def test_get_telegram_user_id(self, user_data, bot_token):
        """Test extracting user ID from init_data"""
        init_data = self.generate_init_data(user_data, bot_token)
        user_id = get_telegram_user_id(init_data)

        assert user_id == "123456789"

    def test_get_telegram_user_id_missing_user(self, bot_token):
        """Test extracting user ID fails when user data is missing"""
        # Generate init_data without user
        data = {
            "query_id": "AAH",
            "auth_date": "1234567890"
        }
        data_check_string = '\n'.join([f"{k}={v}" for k, v in sorted(data.items())])
        secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
        hash_value = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        data['hash'] = hash_value
        init_data = urlencode(data)

        with pytest.raises(HTTPException) as exc_info:
            get_telegram_user_id(init_data)

        assert exc_info.value.status_code == 401
        assert "User ID not found" in exc_info.value.detail

    def test_validate_init_data_header_success(self, user_data, bot_token):
        """Test FastAPI dependency validates header successfully"""
        init_data = self.generate_init_data(user_data, bot_token)
        result = validate_init_data_header(init_data)

        assert 'user' in result
        assert result['user']['id'] == 123456789

    def test_validate_init_data_header_missing(self):
        """Test FastAPI dependency fails with missing header"""
        with pytest.raises(HTTPException) as exc_info:
            validate_init_data_header(None)

        assert exc_info.value.status_code == 401
        assert "Missing X-Telegram-Init-Data header" in exc_info.value.detail

    def test_get_user_id_from_header(self, user_data, bot_token):
        """Test FastAPI dependency extracts user ID from header"""
        init_data = self.generate_init_data(user_data, bot_token)
        user_id = get_user_id_from_header(init_data)

        assert user_id == "123456789"

    def test_invalid_json_in_user_data(self, bot_token):
        """Test validation fails with malformed JSON in user data"""
        # Use generate_init_data but with invalid JSON string
        # We need to bypass generate_init_data to inject invalid JSON
        invalid_user = "{invalid json}"  # Malformed JSON

        data_for_hash = {
            "query_id": "AAH",
            "user": invalid_user,
            "auth_date": "1234567890"
        }

        # Create hash on non-encoded data (as Telegram does)
        data_check_string = '\n'.join([f"{k}={v}" for k, v in sorted(data_for_hash.items())])
        secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
        hash_value = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

        # Build init_data with hash
        result_data = {
            "auth_date": "1234567890",
            "hash": hash_value,
            "query_id": "AAH",
            "user": invalid_user
        }
        init_data = urlencode(result_data)

        with pytest.raises(HTTPException) as exc_info:
            validate_telegram_web_app_data(init_data, bot_token)

        assert exc_info.value.status_code == 401
        assert "Invalid user data" in exc_info.value.detail

    def test_special_characters_in_data(self, bot_token):
        """Test validation works with special characters"""
        user_data = {
            "id": 123456789,
            "first_name": "Иван",  # Cyrillic
            "last_name": "Петров",
            "username": "ivan_петров"
        }

        init_data = self.generate_init_data(user_data, bot_token)
        result = validate_telegram_web_app_data(init_data, bot_token)

        assert result['user']['first_name'] == "Иван"
        assert result['user']['last_name'] == "Петров"
