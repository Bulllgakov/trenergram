"""
JWT authentication for admin panel
"""

from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import JWTError, jwt
from fastapi import HTTPException, Depends, Header
from pydantic import BaseModel

from core.config import settings


# JWT settings
SECRET_KEY = settings.SECRET_KEY if hasattr(settings, 'SECRET_KEY') else "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


class TokenData(BaseModel):
    """Token payload data"""
    telegram_id: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    club_id: Optional[int] = None


def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token

    Args:
        data: Dict with user data to encode
        expires_delta: Optional expiration time

    Returns:
        str: Encoded JWT token
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


def decode_access_token(token: str) -> TokenData:
    """
    Decode and validate JWT token

    Args:
        token: JWT token string

    Returns:
        TokenData: Decoded token data

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        telegram_id: Optional[str] = payload.get("telegram_id")
        email: Optional[str] = payload.get("email")
        role: Optional[str] = payload.get("role")
        club_id: Optional[int] = payload.get("club_id")

        if not telegram_id and not email:
            raise HTTPException(
                status_code=401,
                detail="Invalid token: missing user identifier"
            )

        return TokenData(
            telegram_id=telegram_id,
            email=email,
            role=role,
            club_id=club_id
        )

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials"
        )


def get_current_admin(authorization: str = Header(None)) -> TokenData:
    """
    FastAPI dependency to get current admin from JWT token

    Usage:
        @app.get("/admin/dashboard")
        def admin_dashboard(admin: TokenData = Depends(get_current_admin)):
            if admin.role != "super_admin":
                raise HTTPException(403, "Forbidden")
            ...

    Args:
        authorization: Authorization header (Bearer <token>)

    Returns:
        TokenData: Current admin data

    Raises:
        HTTPException: If authentication fails
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header"
        )

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication scheme"
            )

        return decode_access_token(token)

    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid Authorization header format"
        )


def require_super_admin(admin: TokenData = Depends(get_current_admin)) -> TokenData:
    """
    FastAPI dependency to require super_admin role

    Usage:
        @app.get("/admin/users")
        def get_all_users(admin: TokenData = Depends(require_super_admin)):
            ...

    Args:
        admin: Current admin from get_current_admin

    Returns:
        TokenData: Current admin data

    Raises:
        HTTPException: If user is not super_admin
    """
    if admin.role != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Super admin access required"
        )

    return admin


def require_club_admin(admin: TokenData = Depends(get_current_admin)) -> TokenData:
    """
    FastAPI dependency to require club_admin or club_owner role

    Usage:
        @app.get("/admin/club/trainers")
        def get_club_trainers(admin: TokenData = Depends(require_club_admin)):
            club_id = admin.club_id
            ...

    Args:
        admin: Current admin from get_current_admin

    Returns:
        TokenData: Current admin data

    Raises:
        HTTPException: If user is not club admin
    """
    if admin.role not in ["club_admin", "club_owner", "super_admin"]:
        raise HTTPException(
            status_code=403,
            detail="Club admin access required"
        )

    if admin.role != "super_admin" and not admin.club_id:
        raise HTTPException(
            status_code=403,
            detail="No club associated with this admin"
        )

    return admin
