"""
Tests for JWT authentication
"""

import pytest
from datetime import timedelta
from fastapi import HTTPException
from jose import jwt

from core.jwt import (
    create_access_token,
    decode_access_token,
    get_current_admin,
    require_super_admin,
    require_club_admin,
    TokenData,
    SECRET_KEY,
    ALGORITHM
)


class TestJWT:
    """Test JWT token generation and validation"""

    @pytest.fixture
    def super_admin_data(self):
        """Test super admin data"""
        return {
            "telegram_id": "123456789",
            "email": "admin@trenergram.ru",
            "role": "super_admin"
        }

    @pytest.fixture
    def club_admin_data(self):
        """Test club admin data"""
        return {
            "telegram_id": "987654321",
            "email": "club@trenergram.ru",
            "role": "club_admin",
            "club_id": 1
        }

    @pytest.fixture
    def trainer_data(self):
        """Test trainer data"""
        return {
            "telegram_id": "111222333",
            "role": "trainer"
        }

    def test_create_access_token(self, super_admin_data):
        """Test creating JWT access token"""
        token = create_access_token(super_admin_data)

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

        # Verify token can be decoded
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["telegram_id"] == "123456789"
        assert payload["email"] == "admin@trenergram.ru"
        assert payload["role"] == "super_admin"
        assert "exp" in payload

    def test_create_access_token_with_custom_expiry(self, super_admin_data):
        """Test creating token with custom expiration time"""
        custom_delta = timedelta(minutes=30)
        token = create_access_token(super_admin_data, expires_delta=custom_delta)

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert "exp" in payload

    def test_decode_access_token_success(self, super_admin_data):
        """Test decoding valid access token"""
        token = create_access_token(super_admin_data)
        token_data = decode_access_token(token)

        assert isinstance(token_data, TokenData)
        assert token_data.telegram_id == "123456789"
        assert token_data.email == "admin@trenergram.ru"
        assert token_data.role == "super_admin"

    def test_decode_access_token_with_club_id(self, club_admin_data):
        """Test decoding token with club_id"""
        token = create_access_token(club_admin_data)
        token_data = decode_access_token(token)

        assert token_data.telegram_id == "987654321"
        assert token_data.role == "club_admin"
        assert token_data.club_id == 1

    def test_decode_invalid_token(self):
        """Test decoding invalid token"""
        invalid_token = "invalid.token.here"

        with pytest.raises(HTTPException) as exc_info:
            decode_access_token(invalid_token)

        assert exc_info.value.status_code == 401
        assert "Could not validate credentials" in exc_info.value.detail

    def test_decode_expired_token(self, super_admin_data):
        """Test decoding expired token"""
        # Create token that expires immediately
        token = create_access_token(super_admin_data, expires_delta=timedelta(seconds=-1))

        with pytest.raises(HTTPException) as exc_info:
            decode_access_token(token)

        assert exc_info.value.status_code == 401

    def test_decode_token_missing_identifier(self):
        """Test decoding token without telegram_id or email"""
        invalid_data = {"role": "admin"}  # Missing identifiers
        token = jwt.encode(invalid_data, SECRET_KEY, algorithm=ALGORITHM)

        with pytest.raises(HTTPException) as exc_info:
            decode_access_token(token)

        assert exc_info.value.status_code == 401
        assert "missing user identifier" in exc_info.value.detail

    def test_get_current_admin_success(self, super_admin_data):
        """Test get_current_admin dependency with valid token"""
        token = create_access_token(super_admin_data)
        authorization = f"Bearer {token}"

        admin = get_current_admin(authorization)

        assert isinstance(admin, TokenData)
        assert admin.email == "admin@trenergram.ru"
        assert admin.role == "super_admin"

    def test_get_current_admin_missing_header(self):
        """Test get_current_admin fails without Authorization header"""
        with pytest.raises(HTTPException) as exc_info:
            get_current_admin(None)

        assert exc_info.value.status_code == 401
        assert "Missing Authorization header" in exc_info.value.detail

    def test_get_current_admin_invalid_scheme(self, super_admin_data):
        """Test get_current_admin fails with invalid auth scheme"""
        token = create_access_token(super_admin_data)
        authorization = f"Basic {token}"  # Wrong scheme

        with pytest.raises(HTTPException) as exc_info:
            get_current_admin(authorization)

        assert exc_info.value.status_code == 401
        assert "Invalid authentication scheme" in exc_info.value.detail

    def test_get_current_admin_malformed_header(self):
        """Test get_current_admin fails with malformed header"""
        authorization = "InvalidFormatNoSpace"

        with pytest.raises(HTTPException) as exc_info:
            get_current_admin(authorization)

        assert exc_info.value.status_code == 401
        assert "Invalid Authorization header format" in exc_info.value.detail

    def test_require_super_admin_success(self, super_admin_data):
        """Test require_super_admin allows super_admin"""
        token = create_access_token(super_admin_data)
        admin = decode_access_token(token)

        result = require_super_admin(admin)

        assert result == admin
        assert result.role == "super_admin"

    def test_require_super_admin_fails_for_club_admin(self, club_admin_data):
        """Test require_super_admin rejects club_admin"""
        token = create_access_token(club_admin_data)
        admin = decode_access_token(token)

        with pytest.raises(HTTPException) as exc_info:
            require_super_admin(admin)

        assert exc_info.value.status_code == 403
        assert "Super admin access required" in exc_info.value.detail

    def test_require_super_admin_fails_for_trainer(self, trainer_data):
        """Test require_super_admin rejects trainer"""
        token = create_access_token(trainer_data)
        admin = decode_access_token(token)

        with pytest.raises(HTTPException) as exc_info:
            require_super_admin(admin)

        assert exc_info.value.status_code == 403

    def test_require_club_admin_success_club_admin(self, club_admin_data):
        """Test require_club_admin allows club_admin"""
        token = create_access_token(club_admin_data)
        admin = decode_access_token(token)

        result = require_club_admin(admin)

        assert result == admin
        assert result.role == "club_admin"
        assert result.club_id == 1

    def test_require_club_admin_success_super_admin(self, super_admin_data):
        """Test require_club_admin allows super_admin"""
        token = create_access_token(super_admin_data)
        admin = decode_access_token(token)

        result = require_club_admin(admin)

        assert result == admin
        assert result.role == "super_admin"

    def test_require_club_admin_fails_for_trainer(self, trainer_data):
        """Test require_club_admin rejects trainer"""
        token = create_access_token(trainer_data)
        admin = decode_access_token(token)

        with pytest.raises(HTTPException) as exc_info:
            require_club_admin(admin)

        assert exc_info.value.status_code == 403
        assert "Club admin access required" in exc_info.value.detail

    def test_require_club_admin_fails_without_club_id(self):
        """Test require_club_admin fails for club_admin without club_id"""
        # Club admin without club_id
        invalid_data = {
            "telegram_id": "999888777",
            "email": "admin@example.com",
            "role": "club_admin"
            # No club_id
        }
        token = create_access_token(invalid_data)
        admin = decode_access_token(token)

        with pytest.raises(HTTPException) as exc_info:
            require_club_admin(admin)

        assert exc_info.value.status_code == 403
        assert "No club associated" in exc_info.value.detail

    def test_token_contains_all_fields(self):
        """Test token preserves all provided fields"""
        full_data = {
            "telegram_id": "123",
            "email": "test@test.com",
            "role": "club_owner",
            "club_id": 5,
            "custom_field": "custom_value"  # Extra field
        }

        token = create_access_token(full_data)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        assert payload["telegram_id"] == "123"
        assert payload["email"] == "test@test.com"
        assert payload["role"] == "club_owner"
        assert payload["club_id"] == 5
        assert payload["custom_field"] == "custom_value"

    def test_token_data_with_only_telegram_id(self):
        """Test TokenData with only telegram_id (no email)"""
        data = {
            "telegram_id": "456",
            "role": "trainer"
        }

        token = create_access_token(data)
        token_data = decode_access_token(token)

        assert token_data.telegram_id == "456"
        assert token_data.email is None
        assert token_data.role == "trainer"

    def test_token_data_with_only_email(self):
        """Test TokenData with only email (no telegram_id)"""
        data = {
            "email": "admin@club.com",
            "role": "club_owner",
            "club_id": 2
        }

        token = create_access_token(data)
        token_data = decode_access_token(token)

        assert token_data.telegram_id is None
        assert token_data.email == "admin@club.com"
        assert token_data.role == "club_owner"
        assert token_data.club_id == 2
