"""
Schemas for trainer slots
"""
from typing import Optional
from pydantic import BaseModel, Field


class SlotBase(BaseModel):
    """Base slot schema"""
    day_of_week: int = Field(..., ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)")
    start_time: str = Field(..., description="Start time in HH:MM format")
    end_time: str = Field(..., description="End time in HH:MM format")
    is_recurring: bool = Field(default=True, description="Is this a recurring slot")


class SlotCreate(SlotBase):
    """Schema for creating a slot"""
    pass


class SlotUpdate(BaseModel):
    """Schema for updating a slot"""
    start_time: Optional[str] = Field(None, description="Start time in HH:MM format")
    end_time: Optional[str] = Field(None, description="End time in HH:MM format")
    is_recurring: Optional[bool] = Field(None, description="Is this a recurring slot")
    is_active: Optional[bool] = Field(None, description="Is slot active")


class SlotResponse(SlotBase):
    """Schema for slot response"""
    id: int
    is_active: bool

    class Config:
        from_attributes = True