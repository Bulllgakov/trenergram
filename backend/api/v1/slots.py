"""
Trainer slots API endpoints for schedule management
"""
from typing import List, Optional
from datetime import datetime, time, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from db.session import SessionLocal
from models import User, UserRole, Schedule, TimeSlot, DayOfWeek, SlotStatus
from schemas.slot import SlotCreate, SlotUpdate, SlotResponse

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/trainer/{telegram_id}/schedule")
def get_trainer_schedule(
    telegram_id: str,
    db: Session = Depends(get_db)
):
    """Get trainer's weekly schedule template"""

    # Get trainer
    trainer = db.query(User).filter_by(
        telegram_id=telegram_id,
        role=UserRole.TRAINER
    ).first()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Get schedule (including inactive ones)
    schedule = db.query(Schedule).filter_by(
        trainer_id=trainer.id
    ).order_by(Schedule.day_of_week, Schedule.start_time).all()

    return [
        {
            "id": s.id,
            "day_of_week": s.day_of_week,
            "start_time": s.start_time.strftime("%H:%M"),
            "end_time": s.end_time.strftime("%H:%M"),
            "is_recurring": s.is_recurring,
            "is_active": s.is_active,
            "is_break": getattr(s, 'is_break', False)
        }
        for s in schedule
    ]


@router.get("/trainer/{telegram_id}/slots")
def get_trainer_slots(
    telegram_id: str,
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """Get trainer's time slots for specific dates"""

    # Get trainer
    trainer = db.query(User).filter_by(
        telegram_id=telegram_id,
        role=UserRole.TRAINER
    ).first()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Parse dates
    start_date = datetime.fromisoformat(from_date).date() if from_date else date.today()
    end_date = datetime.fromisoformat(to_date).date() if to_date else start_date + timedelta(days=7)

    # Get time slots
    slots = db.query(TimeSlot).filter(
        TimeSlot.trainer_id == trainer.id,
        TimeSlot.date >= start_date,
        TimeSlot.date <= end_date
    ).order_by(TimeSlot.date, TimeSlot.start_time).all()

    return [
        {
            "id": slot.id,
            "date": slot.date.isoformat(),
            "start_time": slot.start_time.strftime("%H:%M"),
            "end_time": slot.end_time.strftime("%H:%M"),
            "status": slot.status,
            "booking_id": slot.booking_id
        }
        for slot in slots
    ]


@router.post("/trainer/{telegram_id}/schedule")
def add_schedule_slot(
    telegram_id: str,
    slot_data: dict,
    db: Session = Depends(get_db)
):
    """Add a recurring slot to trainer's schedule"""

    # Get trainer
    trainer = db.query(User).filter_by(
        telegram_id=telegram_id,
        role=UserRole.TRAINER
    ).first()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Parse time
    start_time = time.fromisoformat(slot_data["start_time"])
    end_time = time.fromisoformat(slot_data["end_time"])

    # Check if slot already exists
    existing = db.query(Schedule).filter_by(
        trainer_id=trainer.id,
        day_of_week=slot_data["day_of_week"],
        start_time=start_time,
        is_active=True
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Slot already exists")

    # Create new schedule slot
    schedule = Schedule(
        trainer_id=trainer.id,
        day_of_week=slot_data["day_of_week"],
        start_time=start_time,
        end_time=end_time,
        is_recurring=slot_data.get("is_recurring", True)
    )

    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    return {
        "id": schedule.id,
        "day_of_week": schedule.day_of_week,
        "start_time": schedule.start_time.strftime("%H:%M"),
        "end_time": schedule.end_time.strftime("%H:%M"),
        "is_recurring": schedule.is_recurring
    }


@router.post("/trainer/{telegram_id}/slots")
def create_time_slot(
    telegram_id: str,
    slot_data: dict,
    db: Session = Depends(get_db)
):
    """Create a specific time slot for a date"""

    # Get trainer
    trainer = db.query(User).filter_by(
        telegram_id=telegram_id,
        role=UserRole.TRAINER
    ).first()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Parse date and time
    slot_date = datetime.fromisoformat(slot_data["date"]).date()
    start_time = time.fromisoformat(slot_data["start_time"])
    end_time = time.fromisoformat(slot_data["end_time"])

    # Check if slot already exists
    existing = db.query(TimeSlot).filter_by(
        trainer_id=trainer.id,
        date=slot_date,
        start_time=start_time
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Slot already exists")

    # Create new time slot
    slot = TimeSlot(
        trainer_id=trainer.id,
        date=slot_date,
        start_time=start_time,
        end_time=end_time,
        status=SlotStatus.AVAILABLE
    )

    db.add(slot)
    db.commit()
    db.refresh(slot)

    return {
        "id": slot.id,
        "date": slot.date.isoformat(),
        "start_time": slot.start_time.strftime("%H:%M"),
        "end_time": slot.end_time.strftime("%H:%M"),
        "status": slot.status
    }


@router.put("/slots/{slot_id}")
def update_time_slot(
    slot_id: int,
    telegram_id: str,
    slot_data: dict,
    db: Session = Depends(get_db)
):
    """Update a time slot status"""

    # Get trainer
    trainer = db.query(User).filter_by(
        telegram_id=telegram_id,
        role=UserRole.TRAINER
    ).first()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Get slot
    slot = db.query(TimeSlot).filter_by(
        id=slot_id,
        trainer_id=trainer.id
    ).first()

    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    # Update status
    if "status" in slot_data:
        slot.status = SlotStatus(slot_data["status"])

    db.commit()
    db.refresh(slot)

    return {
        "id": slot.id,
        "date": slot.date.isoformat(),
        "start_time": slot.start_time.strftime("%H:%M"),
        "end_time": slot.end_time.strftime("%H:%M"),
        "status": slot.status
    }


@router.delete("/schedule/{schedule_id}")
def delete_schedule_slot(
    schedule_id: int,
    telegram_id: str,
    db: Session = Depends(get_db)
):
    """Delete a schedule slot"""

    # Get trainer
    trainer = db.query(User).filter_by(
        telegram_id=telegram_id,
        role=UserRole.TRAINER
    ).first()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Get schedule slot
    schedule = db.query(Schedule).filter_by(
        id=schedule_id,
        trainer_id=trainer.id
    ).first()

    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule slot not found")

    # Deactivate
    schedule.is_active = False
    db.commit()

    return {"message": "Schedule slot deleted"}


@router.post("/trainer/{telegram_id}/generate-slots")
def generate_slots_from_schedule(
    telegram_id: str,
    data: dict,
    db: Session = Depends(get_db)
):
    """Generate time slots from schedule for specific dates"""

    # Get trainer
    trainer = db.query(User).filter_by(
        telegram_id=telegram_id,
        role=UserRole.TRAINER
    ).first()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Parse dates
    start_date = datetime.fromisoformat(data["from_date"]).date()
    end_date = datetime.fromisoformat(data["to_date"]).date()

    # Get active schedule
    schedule = db.query(Schedule).filter_by(
        trainer_id=trainer.id,
        is_active=True
    ).all()

    if not schedule:
        return {"message": "No schedule defined", "slots_created": 0}

    # Map day names to weekday numbers
    day_map = {
        DayOfWeek.MONDAY: 0,
        DayOfWeek.TUESDAY: 1,
        DayOfWeek.WEDNESDAY: 2,
        DayOfWeek.THURSDAY: 3,
        DayOfWeek.FRIDAY: 4,
        DayOfWeek.SATURDAY: 5,
        DayOfWeek.SUNDAY: 6
    }

    slots_created = 0
    current_date = start_date

    while current_date <= end_date:
        weekday = current_date.weekday()

        # Find schedule for this day
        for sched in schedule:
            if day_map[sched.day_of_week] == weekday:
                # Check if slot already exists
                existing = db.query(TimeSlot).filter_by(
                    trainer_id=trainer.id,
                    date=current_date,
                    start_time=sched.start_time
                ).first()

                if not existing:
                    # Create time slot
                    slot = TimeSlot(
                        trainer_id=trainer.id,
                        date=current_date,
                        start_time=sched.start_time,
                        end_time=sched.end_time,
                        status=SlotStatus.AVAILABLE
                    )
                    db.add(slot)
                    slots_created += 1

        current_date += timedelta(days=1)

    db.commit()

    return {"message": f"Generated {slots_created} slots", "slots_created": slots_created}


@router.put("/trainer/{telegram_id}/schedule")
def update_trainer_schedule(
    telegram_id: str,
    schedule_data: dict,
    db: Session = Depends(get_db)
):
    """Update trainer's entire weekly schedule"""

    # Get trainer
    trainer = db.query(User).filter_by(
        telegram_id=telegram_id,
        role=UserRole.TRAINER
    ).first()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Delete existing schedule
    db.query(Schedule).filter_by(trainer_id=trainer.id).delete()

    # Add new schedules
    schedules_created = 0
    for schedule_item in schedule_data.get("schedules", []):
        try:
            start_time = time.fromisoformat(schedule_item["start_time"])
            end_time = time.fromisoformat(schedule_item["end_time"])

            schedule = Schedule(
                trainer_id=trainer.id,
                day_of_week=schedule_item["day_of_week"],
                start_time=start_time,
                end_time=end_time,
                is_break=schedule_item.get("is_break", False),
                is_active=schedule_item.get("is_active", True),
                is_recurring=True
            )

            db.add(schedule)
            schedules_created += 1
        except Exception as e:
            print(f"Error creating schedule item: {e}")
            continue

    db.commit()

    return {
        "message": f"Schedule updated with {schedules_created} items",
        "schedules_created": schedules_created
    }