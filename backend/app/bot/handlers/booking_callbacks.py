"""
Callback handlers for booking actions via inline buttons
"""

from telegram import Update
from telegram.ext import ContextTypes
from datetime import datetime
import asyncio
import logging

from app.db.session import get_db
from app.models import User, Booking, BookingStatus
from app.services.notifications import (
    notify_booking_confirmed,
    notify_booking_cancelled
)

logger = logging.getLogger(__name__)


async def handle_confirm_booking(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle booking confirmation by trainer"""
    query = update.callback_query
    await query.answer()

    # Extract booking ID from callback data
    booking_id = int(query.data.split(":")[1])

    db = next(get_db())
    try:
        # Get booking
        booking = db.query(Booking).filter_by(id=booking_id).first()
        if not booking:
            await query.message.reply_text("❌ Запись не найдена")
            return

        # Check if the user is the trainer for this booking
        trainer = db.query(User).filter_by(telegram_id=str(query.from_user.id)).first()
        if not trainer or trainer.id != booking.trainer_id:
            await query.message.reply_text("❌ Вы не можете подтвердить эту запись")
            return

        # Check if booking can be confirmed
        if booking.status != BookingStatus.PENDING:
            await query.message.reply_text("ℹ️ Запись уже обработана")
            return

        # Confirm booking
        booking.status = BookingStatus.CONFIRMED
        booking.confirmed_at = datetime.now()
        db.commit()

        # Send notification to client
        await notify_booking_confirmed(booking, db)

        # Update message
        await query.edit_message_text(
            query.message.text + "\n\n✅ <b>Запись подтверждена</b>",
            parse_mode="HTML"
        )

        await query.message.reply_text("✅ Запись успешно подтверждена!")

    except Exception as e:
        db.rollback()
        logger.error(f"Error confirming booking: {e}")
        await query.message.reply_text(f"❌ Ошибка при подтверждении: {str(e)}")
    finally:
        db.close()


async def handle_cancel_booking(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle booking cancellation"""
    query = update.callback_query
    await query.answer()

    # Extract booking ID from callback data
    booking_id = int(query.data.split(":")[1])

    db = next(get_db())
    try:
        # Get booking
        booking = db.query(Booking).filter_by(id=booking_id).first()
        if not booking:
            await query.message.reply_text("❌ Запись не найдена")
            return

        # Check if the user is the trainer or client for this booking
        user = db.query(User).filter_by(telegram_id=str(query.from_user.id)).first()
        if not user:
            await query.message.reply_text("❌ Пользователь не найден")
            return

        is_trainer = user.id == booking.trainer_id
        is_client = user.id == booking.client_id

        if not is_trainer and not is_client:
            await query.message.reply_text("❌ Вы не можете отменить эту запись")
            return

        # Check if booking can be cancelled
        if booking.status in [BookingStatus.CANCELLED, BookingStatus.COMPLETED]:
            await query.message.reply_text("ℹ️ Запись уже отменена или завершена")
            return

        # Check 24-hour rule
        hours_before = (booking.datetime - datetime.now()).total_seconds() / 3600
        if hours_before < 24:
            await query.message.reply_text(
                "⚠️ Отмена менее чем за 24 часа до тренировки.\n"
                "Обратитесь к тренеру для согласования отмены.",
                parse_mode="HTML"
            )
            # For now, still allow cancellation

        # Cancel booking
        booking.status = BookingStatus.CANCELLED
        booking.cancelled_at = datetime.now()
        booking.cancellation_reason = "Отменено через Telegram"
        db.commit()

        # Send notification to the other party
        await notify_booking_cancelled(
            booking, db,
            reason="Отменено через Telegram",
            cancelled_by_trainer=is_trainer
        )

        # Update message
        await query.edit_message_text(
            query.message.text + "\n\n❌ <b>Запись отменена</b>",
            parse_mode="HTML"
        )

        await query.message.reply_text("✅ Запись успешно отменена!")

    except Exception as e:
        db.rollback()
        logger.error(f"Error cancelling booking: {e}")
        await query.message.reply_text(f"❌ Ошибка при отмене: {str(e)}")
    finally:
        db.close()


async def handle_accept_reschedule(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle rescheduled booking acceptance by client"""
    query = update.callback_query
    await query.answer()

    booking_id = int(query.data.split(":")[1])

    db = next(get_db())
    try:
        booking = db.query(Booking).filter_by(id=booking_id).first()
        if not booking:
            await query.message.reply_text("❌ Запись не найдена")
            return

        # Verify user is the client
        client = db.query(User).filter_by(telegram_id=str(query.from_user.id)).first()
        if not client or client.id != booking.client_id:
            await query.message.reply_text("❌ Вы не можете подтвердить эту запись")
            return

        # Confirm the rescheduled booking
        booking.status = BookingStatus.CONFIRMED
        booking.confirmed_at = datetime.now()
        db.commit()

        await query.edit_message_text(
            query.message.text + "\n\n✅ <b>Новое время подтверждено</b>",
            parse_mode="HTML"
        )

        await query.message.reply_text("✅ Новое время тренировки подтверждено!")

    except Exception as e:
        db.rollback()
        logger.error(f"Error accepting reschedule: {e}")
        await query.message.reply_text(f"❌ Ошибка: {str(e)}")
    finally:
        db.close()


async def handle_decline_reschedule(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle rescheduled booking decline by client"""
    query = update.callback_query
    await query.answer()

    booking_id = int(query.data.split(":")[1])

    db = next(get_db())
    try:
        booking = db.query(Booking).filter_by(id=booking_id).first()
        if not booking:
            await query.message.reply_text("❌ Запись не найдена")
            return

        # Verify user is the client
        client = db.query(User).filter_by(telegram_id=str(query.from_user.id)).first()
        if not client or client.id != booking.client_id:
            await query.message.reply_text("❌ Вы не можете отменить эту запись")
            return

        # Cancel the rescheduled booking
        booking.status = BookingStatus.CANCELLED
        booking.cancelled_at = datetime.now()
        booking.cancellation_reason = "Новое время не подходит клиенту"
        db.commit()

        # Notify trainer
        await notify_booking_cancelled(
            booking, db,
            reason="Новое время не подходит клиенту",
            cancelled_by_trainer=False
        )

        await query.edit_message_text(
            query.message.text + "\n\n❌ <b>Новое время отклонено</b>",
            parse_mode="HTML"
        )

        await query.message.reply_text(
            "❌ Новое время отклонено. Свяжитесь с тренером для выбора другого времени."
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Error declining reschedule: {e}")
        await query.message.reply_text(f"❌ Ошибка: {str(e)}")
    finally:
        db.close()


async def handle_confirm_attendance(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle attendance confirmation for reminders"""
    query = update.callback_query
    await query.answer("✅ Спасибо за подтверждение!")

    booking_id = int(query.data.split(":")[1])

    # Just acknowledge - no database changes needed
    await query.edit_message_text(
        query.message.text + "\n\n✅ <b>Присутствие подтверждено</b>",
        parse_mode="HTML"
    )