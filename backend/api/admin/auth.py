"""
Admin authentication API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta

from db.session import get_db
from models import ClubAdmin
from core.password import hash_password, verify_password
from core.jwt import create_access_token, decode_access_token

router = APIRouter()
security = HTTPBearer()


# Pydantic models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "AdminUserResponse"


class AdminUserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    club_id: Optional[int] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


# Dependency to get current admin user from JWT token
async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> ClubAdmin:
    """
    Validate JWT token and return current admin user
    """
    token = credentials.credentials

    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    admin = db.query(ClubAdmin).filter(ClubAdmin.email == email).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    return admin


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login with email and password, returns JWT token
    """
    # Find admin by email
    admin = db.query(ClubAdmin).filter(ClubAdmin.email == request.email).first()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Verify password
    if not verify_password(request.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Check if account is active
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    # Create JWT token
    token_data = {
        "email": admin.email,
        "role": admin.role,
        "club_id": admin.club_id
    }
    access_token = create_access_token(data=token_data)

    return LoginResponse(
        access_token=access_token,
        user=AdminUserResponse.from_orm(admin)
    )


@router.get("/me", response_model=AdminUserResponse)
async def get_current_user(
    admin: ClubAdmin = Depends(get_current_admin)
):
    """
    Get current authenticated user information
    """
    return AdminUserResponse.from_orm(admin)


@router.put("/profile", response_model=AdminUserResponse)
async def update_profile(
    request: UpdateProfileRequest,
    admin: ClubAdmin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile
    """
    if request.name:
        admin.name = request.name

    db.commit()
    db.refresh(admin)

    return AdminUserResponse.from_orm(admin)


@router.put("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    admin: ClubAdmin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Change current user's password
    """
    # Verify old password
    if not verify_password(request.old_password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password"
        )

    # Hash and set new password
    admin.password_hash = hash_password(request.new_password)

    db.commit()

    return {"message": "Password changed successfully"}
