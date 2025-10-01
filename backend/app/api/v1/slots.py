"""
Trainer slots API endpoints
"""
from typing import List
from datetime import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.db.base import get_db
from app.models.user import Trainer
from app.models.booking import TrainerSlot
from app.schemas.slot import SlotCreate, SlotUpdate, SlotResponse

router = APIRouter()


@router.get("/trainer/{telegram_id}", response_model=List[SlotResponse])
async def get_trainer_slots(
    telegram_id: str,
    db: AsyncSession = Depends(get_db)
) -> List[SlotResponse]:
    """Get all slots for a trainer"""

    # Get trainer
    result = await db.execute(
        select(Trainer).where(Trainer.telegram_id == telegram_id)
    )
    trainer = result.scalar_one_or_none()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Get trainer's slots
    result = await db.execute(
        select(TrainerSlot)
        .where(TrainerSlot.trainer_id == trainer.id)
        .where(TrainerSlot.is_active == True)
        .order_by(TrainerSlot.day_of_week, TrainerSlot.start_time)
    )
    slots = result.scalars().all()

    return [
        SlotResponse(
            id=slot.id,
            day_of_week=slot.day_of_week,
            start_time=slot.start_time.strftime("%H:%M"),
            end_time=slot.end_time.strftime("%H:%M"),
            is_recurring=slot.is_recurring,
            is_active=slot.is_active
        )
        for slot in slots
    ]


@router.post("/trainer/{telegram_id}", response_model=SlotResponse)
async def create_trainer_slot(
    telegram_id: str,
    slot_data: SlotCreate,
    db: AsyncSession = Depends(get_db)
) -> SlotResponse:
    """Create a new slot for trainer"""

    # Get trainer
    result = await db.execute(
        select(Trainer).where(Trainer.telegram_id == telegram_id)
    )
    trainer = result.scalar_one_or_none()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Parse time strings
    start_time = time.fromisoformat(slot_data.start_time)
    end_time = time.fromisoformat(slot_data.end_time)

    # Check if slot already exists
    result = await db.execute(
        select(TrainerSlot)
        .where(
            and_(
                TrainerSlot.trainer_id == trainer.id,
                TrainerSlot.day_of_week == slot_data.day_of_week,
                TrainerSlot.start_time == start_time,
                TrainerSlot.is_active == True
            )
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="Slot already exists")

    # Create new slot
    slot = TrainerSlot(
        trainer_id=trainer.id,
        day_of_week=slot_data.day_of_week,
        start_time=start_time,
        end_time=end_time,
        is_recurring=slot_data.is_recurring,
        is_active=True
    )

    db.add(slot)
    await db.commit()
    await db.refresh(slot)

    return SlotResponse(
        id=slot.id,
        day_of_week=slot.day_of_week,
        start_time=slot.start_time.strftime("%H:%M"),
        end_time=slot.end_time.strftime("%H:%M"),
        is_recurring=slot.is_recurring,
        is_active=slot.is_active
    )


@router.put("/{slot_id}", response_model=SlotResponse)
async def update_slot(
    slot_id: int,
    slot_data: SlotUpdate,
    telegram_id: str,
    db: AsyncSession = Depends(get_db)
) -> SlotResponse:
    """Update a slot"""

    # Get trainer
    result = await db.execute(
        select(Trainer).where(Trainer.telegram_id == telegram_id)
    )
    trainer = result.scalar_one_or_none()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Get slot
    result = await db.execute(
        select(TrainerSlot)
        .where(
            and_(
                TrainerSlot.id == slot_id,
                TrainerSlot.trainer_id == trainer.id
            )
        )
    )
    slot = result.scalar_one_or_none()

    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    # Update slot
    if slot_data.start_time:
        slot.start_time = time.fromisoformat(slot_data.start_time)
    if slot_data.end_time:
        slot.end_time = time.fromisoformat(slot_data.end_time)
    if slot_data.is_recurring is not None:
        slot.is_recurring = slot_data.is_recurring
    if slot_data.is_active is not None:
        slot.is_active = slot_data.is_active

    await db.commit()
    await db.refresh(slot)

    return SlotResponse(
        id=slot.id,
        day_of_week=slot.day_of_week,
        start_time=slot.start_time.strftime("%H:%M"),
        end_time=slot.end_time.strftime("%H:%M"),
        is_recurring=slot.is_recurring,
        is_active=slot.is_active
    )


@router.delete("/{slot_id}")
async def delete_slot(
    slot_id: int,
    telegram_id: str,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Delete (deactivate) a slot"""

    # Get trainer
    result = await db.execute(
        select(Trainer).where(Trainer.telegram_id == telegram_id)
    )
    trainer = result.scalar_one_or_none()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Get slot
    result = await db.execute(
        select(TrainerSlot)
        .where(
            and_(
                TrainerSlot.id == slot_id,
                TrainerSlot.trainer_id == trainer.id
            )
        )
    )
    slot = result.scalar_one_or_none()

    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    # Deactivate slot
    slot.is_active = False
    await db.commit()

    return {"message": "Slot deleted successfully"}