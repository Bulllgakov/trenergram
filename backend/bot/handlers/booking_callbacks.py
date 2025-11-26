"""
Callback handlers for booking actions via inline buttons
"""

from telegram import Update
from telegram.ext import ContextTypes
from datetime import datetime, timezone
import asyncio
import logging

from db.session import get_db
from models import User, Booking, BookingStatus
from services.notifications import (
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

    # CRITICAL: Answer callback query IMMEDIATELY to stop loading animation
    try:
        await query.answer()
        logger.info(f"📞 handle_cancel_booking called by user {query.from_user.id}, callback_data: {query.data}")
    except Exception as e:
        logger.error(f"❌ FAILED to answer callback query: {e}")
        try:
            await query.answer()
        except:
            pass
        return

    # Extract booking ID from callback data
    try:
        booking_id = int(query.data.split(":")[1])
        logger.info(f"📞 Extracted booking_id: {booking_id}")
    except (IndexError, ValueError) as e:
        logger.error(f"❌ Failed to parse booking_id from callback_data: {query.data}, error: {e}")
        await query.message.reply_text("❌ Ошибка обработки данных")
        return

    db = next(get_db())
    try:
        # Get booking
        booking = db.query(Booking).filter_by(id=booking_id).first()
        if not booking:
            logger.error(f"❌ Booking {booking_id} not found in database")
            await query.message.reply_text("❌ Запись не найдена")
            return

        logger.info(f"✅ Found booking {booking_id}, status: {booking.status}")

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
        hours_before = (booking.datetime - datetime.now(timezone.utc)).total_seconds() / 3600
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

    # CRITICAL: Answer callback query IMMEDIATELY to stop loading animation
    try:
        await query.answer("✅ Спасибо за подтверждение!")
        logger.info(f"📞 handle_confirm_attendance called by user {query.from_user.id}, callback_data: {query.data}")
    except Exception as e:
        logger.error(f"❌ FAILED to answer callback query: {e}")
        # Try to answer without text
        try:
            await query.answer()
        except:
            pass
        return

    try:
        booking_id = int(query.data.split(":")[1])
        logger.info(f"📞 Extracted booking_id: {booking_id}")
    except (IndexError, ValueError) as e:
        logger.error(f"❌ Failed to parse booking_id from callback_data: {query.data}, error: {e}")
        await query.message.reply_text("❌ Ошибка обработки данных")
        return

    db = next(get_db())
    try:
        # Get booking
        booking = db.query(Booking).filter_by(id=booking_id).first()
        if not booking:
            logger.error(f"❌ Booking {booking_id} not found in database")
            await query.message.reply_text("❌ Запись не найдена")
            return

        logger.info(f"✅ Found booking {booking_id}, status: {booking.status}")

        # Verify user is the client
        client = db.query(User).filter_by(telegram_id=str(query.from_user.id)).first()
        if not client:
            logger.error(f"❌ User {query.from_user.id} not found in database")
            await query.message.reply_text("❌ Пользователь не найден")
            return

        if client.id != booking.client_id:
            logger.error(f"❌ User {client.id} is not the client for booking {booking_id} (client_id={booking.client_id})")
            await query.message.reply_text("❌ Вы не можете подтвердить эту запись")
            return

        logger.info(f"✅ User verified: {client.name} (id={client.id})")

        # If booking is PENDING, change status to CONFIRMED
        if booking.status == BookingStatus.PENDING:
            logger.info(f"📝 Changing booking {booking_id} status from PENDING to CONFIRMED")
            booking.status = BookingStatus.CONFIRMED
            booking.confirmed_at = datetime.now()
            db.commit()
            logger.info(f"✅ Booking {booking_id} confirmed in database")

            # Send notification to trainer
            logger.info(f"📧 Sending confirmation notification to trainer")
            await notify_booking_confirmed(booking, db)
            logger.info(f"✅ Notification sent to trainer")

            await query.edit_message_text(
                query.message.text + "\n\n✅ <b>Тренировка подтверждена</b>",
                parse_mode="HTML"
            )
            logger.info(f"✅ Message edited successfully")
        else:
            # Already confirmed - just acknowledge
            logger.info(f"ℹ️ Booking {booking_id} already has status {booking.status}, just acknowledging")
            await query.edit_message_text(
                query.message.text + "\n\n✅ <b>Присутствие подтверждено</b>",
                parse_mode="HTML"
            )

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error confirming attendance: {e}")
        import traceback
        logger.error(traceback.format_exc())
        await query.message.reply_text(f"❌ Ошибка: {str(e)}")
    finally:
        db.close()
        logger.info(f"✅ handle_confirm_attendance completed")


async def handle_topup_confirm(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle topup confirmation by trainer"""
    query = update.callback_query
    await query.answer()

    # Parse callback data: topup_confirm:trainer_id:client_id:amount
    try:
        parts = query.data.split(":")
        trainer_telegram_id = parts[1]
        client_telegram_id = parts[2]
        amount = int(parts[3])
    except (IndexError, ValueError) as e:
        await query.message.reply_text("❌ Ошибка обработки данных")
        logger.error(f"Error parsing topup callback data: {e}")
        return

    db = next(get_db())
    try:
        # Verify user is the trainer
        trainer = db.query(User).filter_by(telegram_id=trainer_telegram_id).first()
        if not trainer or str(query.from_user.id) != trainer_telegram_id:
            await query.message.reply_text("❌ Вы не можете подтвердить это пополнение")
            return

        # Get client
        client = db.query(User).filter_by(telegram_id=client_telegram_id).first()
        if not client:
            await query.message.reply_text("❌ Клиент не найден")
            return

        # Call existing topup API endpoint logic
        from models import TrainerClient
        trainer_client = db.query(TrainerClient).filter_by(
            trainer_id=trainer.id,
            client_id=client.id,
            is_active=True
        ).first()

        if not trainer_client:
            await query.message.reply_text("❌ Связь с клиентом не найдена")
            return

        # Add to balance
        old_balance = trainer_client.balance
        trainer_client.balance += amount
        db.commit()

        # Update message
        await query.edit_message_text(
            query.message.text + f"\n\n✅ <b>Пополнение подтверждено</b>\n"
            f"Баланс клиента: {old_balance:,}₽ → {trainer_client.balance:,}₽",
            parse_mode="HTML"
        )

        await query.message.reply_text(
            f"✅ Баланс клиента <b>{client.name}</b> пополнен на <b>{amount:,}₽</b>\n"
            f"Новый баланс: <b>{trainer_client.balance:,}₽</b>",
            parse_mode="HTML"
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Error confirming topup: {e}")
        await query.message.reply_text(f"❌ Ошибка при подтверждении пополнения: {str(e)}")
    finally:
        db.close()


async def handle_topup_pending(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle topup pending (money not received yet) by trainer"""
    query = update.callback_query
    await query.answer("ℹ️ Уведомление сохранено")

    # Parse callback data
    try:
        parts = query.data.split(":")
        trainer_telegram_id = parts[1]
        client_telegram_id = parts[2]
        amount = int(parts[3])
    except (IndexError, ValueError) as e:
        await query.message.reply_text("❌ Ошибка обработки данных")
        logger.error(f"Error parsing topup callback data: {e}")
        return

    db = next(get_db())
    try:
        # Get client name for display
        client = db.query(User).filter_by(telegram_id=client_telegram_id).first()
        client_name = client.name if client else "Клиент"

        # Update message
        await query.edit_message_text(
            query.message.text + f"\n\n⏳ <b>Ожидание поступления средств</b>\n"
            f"Вы можете подтвердить пополнение позже, когда деньги поступят.",
            parse_mode="HTML"
        )

        await query.message.reply_text(
            f"ℹ️ Уведомление о пополнении от <b>{client_name}</b> сохранено.\n"
            f"Когда деньги поступят, вы сможете пополнить баланс вручную через Mini App.",
            parse_mode="HTML"
        )

    except Exception as e:
        logger.error(f"Error handling pending topup: {e}")
        await query.message.reply_text(f"❌ Ошибка: {str(e)}")
    finally:
        db.close()