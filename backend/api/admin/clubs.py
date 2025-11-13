"""
Admin clubs management API (super_admin only)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

from db.session import get_db
from models import Club, ClubAdmin, User, UserRole
from core.password import hash_password
from .auth import get_current_admin

router = APIRouter()


# Dependency to require super_admin role
async def require_super_admin(admin: ClubAdmin = Depends(get_current_admin)):
    """Only allow super_admin (owner with no club_id)"""
    if admin.role != "owner" or admin.club_id is not None:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return admin


# Pydantic models
class ClubListItem(BaseModel):
    id: int
    name: str
    address: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    tariff: str
    tariff_expires_at: Optional[datetime]
    is_active: bool
    total_trainers: int
    total_admins: int
    created_at: datetime

    class Config:
        from_attributes = True


class ClubDetail(BaseModel):
    id: int
    name: str
    address: Optional[str]
    district: Optional[str]
    metro: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    working_hours: Optional[dict]
    tariff: str
    tariff_expires_at: Optional[datetime]
    is_active: bool
    created_at: datetime
    total_trainers: int
    total_admins: int
    total_qr_codes: int
    total_payments: int

    class Config:
        from_attributes = True


class ClubCreate(BaseModel):
    name: str
    address: Optional[str] = None
    district: Optional[str] = None
    metro: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    working_hours: Optional[dict] = None
    tariff: str = "basic"
    tariff_expires_at: Optional[datetime] = None


class ClubUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    metro: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    working_hours: Optional[dict] = None
    tariff: Optional[str] = None
    tariff_expires_at: Optional[datetime] = None
    is_active: Optional[bool] = None


class ClubAdminCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "admin"  # admin, owner, manager


class ClubAdminResponse(BaseModel):
    id: int
    club_id: int
    email: str
    name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[ClubListItem])
async def list_clubs(
    admin: ClubAdmin = Depends(require_super_admin),
    db: Session = Depends(get_db),
    is_active: Optional[bool] = Query(None),
    tariff: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """
    Get list of all clubs (super_admin only)
    """
    query = db.query(Club)

    # Apply filters
    if is_active is not None:
        query = query.filter(Club.is_active == is_active)

    if tariff:
        query = query.filter(Club.tariff == tariff)

    if search:
        query = query.filter(
            or_(
                Club.name.ilike(f"%{search}%"),
                Club.address.ilike(f"%{search}%"),
                Club.email.ilike(f"%{search}%")
            )
        )

    # Apply pagination
    clubs = query.order_by(Club.created_at.desc()).offset(skip).limit(limit).all()

    # Build response with counts
    result = []
    for club in clubs:
        total_trainers = db.query(User).filter(
            User.role == UserRole.TRAINER,
            User.club_id == club.id
        ).count()

        total_admins = db.query(ClubAdmin).filter(
            ClubAdmin.club_id == club.id
        ).count()

        item = ClubListItem(
            id=club.id,
            name=club.name,
            address=club.address,
            phone=club.phone,
            email=club.email,
            tariff=club.tariff,
            tariff_expires_at=club.tariff_expires_at,
            is_active=club.is_active,
            total_trainers=total_trainers,
            total_admins=total_admins,
            created_at=club.created_at
        )
        result.append(item)

    return result


@router.post("/", response_model=ClubDetail)
async def create_club(
    club_data: ClubCreate,
    admin: ClubAdmin = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Create new club (super_admin only)
    """
    # Create club
    new_club = Club(
        name=club_data.name,
        address=club_data.address,
        district=club_data.district,
        metro=club_data.metro,
        phone=club_data.phone,
        email=club_data.email,
        working_hours=club_data.working_hours,
        tariff=club_data.tariff,
        tariff_expires_at=club_data.tariff_expires_at,
        is_active=True
    )

    db.add(new_club)
    db.commit()
    db.refresh(new_club)

    return ClubDetail(
        id=new_club.id,
        name=new_club.name,
        address=new_club.address,
        district=new_club.district,
        metro=new_club.metro,
        phone=new_club.phone,
        email=new_club.email,
        working_hours=new_club.working_hours,
        tariff=new_club.tariff,
        tariff_expires_at=new_club.tariff_expires_at,
        is_active=new_club.is_active,
        created_at=new_club.created_at,
        total_trainers=0,
        total_admins=0,
        total_qr_codes=0,
        total_payments=0
    )


@router.get("/{club_id}", response_model=ClubDetail)
async def get_club(
    club_id: int,
    admin: ClubAdmin = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Get club details (super_admin only)
    """
    club = db.query(Club).filter(Club.id == club_id).first()

    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    # Count related entities
    total_trainers = db.query(User).filter(
        User.role == UserRole.TRAINER,
        User.club_id == club_id
    ).count()

    total_admins = db.query(ClubAdmin).filter(
        ClubAdmin.club_id == club_id
    ).count()

    from models import ClubQRCode, ClubPayment
    total_qr_codes = db.query(ClubQRCode).filter(
        ClubQRCode.club_id == club_id
    ).count()

    total_payments = db.query(ClubPayment).filter(
        ClubPayment.club_id == club_id
    ).count()

    return ClubDetail(
        id=club.id,
        name=club.name,
        address=club.address,
        district=club.district,
        metro=club.metro,
        phone=club.phone,
        email=club.email,
        working_hours=club.working_hours,
        tariff=club.tariff,
        tariff_expires_at=club.tariff_expires_at,
        is_active=club.is_active,
        created_at=club.created_at,
        total_trainers=total_trainers,
        total_admins=total_admins,
        total_qr_codes=total_qr_codes,
        total_payments=total_payments
    )


@router.put("/{club_id}", response_model=ClubDetail)
async def update_club(
    club_id: int,
    update_data: ClubUpdate,
    admin: ClubAdmin = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Update club (super_admin only)
    """
    club = db.query(Club).filter(Club.id == club_id).first()

    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    # Update fields
    if update_data.name is not None:
        club.name = update_data.name
    if update_data.address is not None:
        club.address = update_data.address
    if update_data.district is not None:
        club.district = update_data.district
    if update_data.metro is not None:
        club.metro = update_data.metro
    if update_data.phone is not None:
        club.phone = update_data.phone
    if update_data.email is not None:
        club.email = update_data.email
    if update_data.working_hours is not None:
        club.working_hours = update_data.working_hours
    if update_data.tariff is not None:
        club.tariff = update_data.tariff
    if update_data.tariff_expires_at is not None:
        club.tariff_expires_at = update_data.tariff_expires_at
    if update_data.is_active is not None:
        club.is_active = update_data.is_active

    db.commit()
    db.refresh(club)

    return await get_club(club_id, admin, db)


@router.delete("/{club_id}")
async def delete_club(
    club_id: int,
    admin: ClubAdmin = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Delete club (super_admin only) - soft delete by setting is_active=False
    """
    club = db.query(Club).filter(Club.id == club_id).first()

    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    # Soft delete
    club.is_active = False
    db.commit()

    return {"message": "Club deactivated successfully"}


# Club admins management
@router.post("/{club_id}/admins", response_model=ClubAdminResponse)
async def create_club_admin(
    club_id: int,
    admin_data: ClubAdminCreate,
    admin: ClubAdmin = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Create admin for a club (super_admin only)
    """
    # Check if club exists
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    # Check if email already exists
    existing = db.query(ClubAdmin).filter(ClubAdmin.email == admin_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create admin
    new_admin = ClubAdmin(
        club_id=club_id,
        email=admin_data.email,
        password_hash=hash_password(admin_data.password),
        name=admin_data.name,
        role=admin_data.role,
        is_active=True
    )

    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    return ClubAdminResponse.from_orm(new_admin)


@router.get("/{club_id}/admins", response_model=List[ClubAdminResponse])
async def list_club_admins(
    club_id: int,
    admin: ClubAdmin = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Get list of admins for a club (super_admin only)
    """
    # Check if club exists
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    admins = db.query(ClubAdmin).filter(ClubAdmin.club_id == club_id).all()

    return [ClubAdminResponse.from_orm(a) for a in admins]
