"""
Celery application configuration for periodic tasks
"""

from celery import Celery
from celery.schedules import crontab
from core.config import settings

# Initialize Celery app
celery_app = Celery(
    "trenergram",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["tasks.reminders", "tasks.balance"]
)

# Celery configuration
celery_app.conf.update(
    timezone="Europe/Moscow",
    enable_utc=False,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Periodic tasks schedule
celery_app.conf.beat_schedule = {
    "check-and-send-reminders": {
        "task": "tasks.reminders.check_and_send_reminders",
        "schedule": 300.0,  # Run every 5 minutes
    },
    "send-client-reminders": {
        "task": "tasks.reminders.send_client_reminders",
        "schedule": 300.0,  # Run every 5 minutes (checks 2h, 1h, 15m reminders)
    },
    "check-and-charge-bookings": {
        "task": "tasks.balance.check_and_charge_bookings",
        "schedule": 300.0,  # Run every 5 minutes
    },
}

if __name__ == "__main__":
    celery_app.start()
