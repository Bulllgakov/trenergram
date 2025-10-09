"""
Telegram notification service for sending booking-related messages
"""

import asyncio
from typing import Optional
from datetime import datetime
from aiogram import Bot
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from sqlalchemy.orm import Session

from core.config import settings
from models import User, Booking, BookingStatus


class NotificationService:
    def __init__(self):
        self.bot = Bot(token=settings.BOT_TOKEN)

    async def send_booking_created_to_trainer(
        self,
        booking: Booking,
        trainer: User,
        client: User,
        db: Session
    ):
        """DEPRECATED - This function should NOT be called when trainer creates booking (TZ 10.6)"""
        print(f"❌❌❌ ERROR: send_booking_created_to_trainer() was called for booking {booking.id}")
        print(f"❌❌❌ This violates TZ 10.6 - NO notifications when trainer creates booking!")
        print(f"❌❌❌ Trainer: {trainer.telegram_id}, Client: {client.telegram_id}")
        raise Exception("send_booking_created_to_trainer should NOT be called per TZ 10.6")

    async def send_booking_created_to_client(
        self,
        booking: Booking,
        trainer: User,
        client: User,
        db: Session
    ):
        """DEPRECATED - This function should NOT be called when trainer creates booking (TZ 10.6)"""
        print(f"❌❌❌ ERROR: send_booking_created_to_client() was called for booking {booking.id}")
        print(f"❌❌❌ This violates TZ 10.6 - NO notifications when trainer creates booking!")
        print(f"❌❌❌ Trainer: {trainer.telegram_id}, Client: {client.telegram_id}")
        raise Exception("send_booking_created_to_client should NOT be called per TZ 10.6")

    async def send_booking_confirmed(
        self,
        booking: Booking,
        trainer: User,
        client: User,
        db: Session
    ):
        """Send confirmation notification to trainer when client confirms booking"""
        try:
            booking_date = booking.datetime.strftime("%d.%m.%Y")
            booking_time = booking.datetime.strftime("%H:%M")

            # Notify TRAINER that client confirmed
            text = (
                "✅ <b>Клиент подтвердил тренировку!</b>\n\n"
                f"👤 Клиент: {client.name}\n"
                f"📅 Дата: {booking_date}\n"
                f"⏰ Время: {booking_time}\n"
                f"💰 Стоимость: {booking.price} ₽\n\n"
                "<i>Тренировка подтверждена</i>"
            )

            await self.bot.send_message(
                chat_id=trainer.telegram_id,
                text=text,
                parse_mode="HTML"
            )

            return True
        except Exception as e:
            print(f"Error sending confirmation to trainer: {e}")
            return False

    async def send_booking_cancelled(
        self,
        booking: Booking,
        trainer: User,
        client: User,
        reason: Optional[str] = None,
        cancelled_by: str = "trainer"
    ):
        """Send cancellation notification"""
        try:
            booking_date = booking.datetime.strftime("%d.%m.%Y")
            booking_time = booking.datetime.strftime("%H:%M")

            if cancelled_by == "trainer":
                # Notification to client
                text = (
                    "❌ <b>Запись отменена тренером</b>\n\n"
                    f"👨‍🏫 Тренер: {trainer.name}\n"
                    f"📅 Дата: {booking_date}\n"
                    f"⏰ Время: {booking_time}\n"
                )

                if reason:
                    text += f"📝 Причина: {reason}\n"

                text += "\n<i>Вы можете записаться на другое время</i>"

                keyboard = InlineKeyboardMarkup(inline_keyboard=[
                    [
                        InlineKeyboardButton(
                            text="📱 Записаться снова",
                            web_app={"url": f"https://trenergram.ru/client/{client.telegram_id}"}
                        )
                    ]
                ])

                await self.bot.send_message(
                    chat_id=client.telegram_id,
                    text=text,
                    parse_mode="HTML",
                    reply_markup=keyboard
                )

            else:
                # Notification to trainer
                text = (
                    "❌ <b>Клиент отменил запись</b>\n\n"
                    f"👤 Клиент: {client.name}\n"
                    f"📅 Дата: {booking_date}\n"
                    f"⏰ Время: {booking_time}\n"
                )

                if reason:
                    text += f"📝 Причина: {reason}\n"

                text += "\n<i>Это время теперь доступно для других клиентов</i>"

                await self.bot.send_message(
                    chat_id=trainer.telegram_id,
                    text=text,
                    parse_mode="HTML"
                )

            return True
        except Exception as e:
            print(f"Error sending cancellation notification: {e}")
            return False

    async def send_booking_rescheduled(
        self,
        booking: Booking,
        old_datetime: datetime,
        trainer: User,
        client: User,
        rescheduled_by: str = "trainer"
    ):
        """Send reschedule notification"""
        try:
            old_date = old_datetime.strftime("%d.%m.%Y")
            old_time = old_datetime.strftime("%H:%M")
            new_date = booking.datetime.strftime("%d.%m.%Y")
            new_time = booking.datetime.strftime("%H:%M")

            if rescheduled_by == "trainer":
                # Notification to client
                text = (
                    "🔄 <b>Запись перенесена тренером</b>\n\n"
                    f"👨‍🏫 Тренер: {trainer.name}\n\n"
                    f"❌ Старое время:\n"
                    f"📅 {old_date} в {old_time}\n\n"
                    f"✅ Новое время:\n"
                    f"📅 {new_date} в {new_time}\n\n"
                    "<i>Подтвердите, что вам подходит новое время</i>"
                )

                keyboard = InlineKeyboardMarkup(inline_keyboard=[
                    [
                        InlineKeyboardButton(
                            text="✅ Подтверждаю",
                            callback_data=f"accept_reschedule:{booking.id}"
                        ),
                        InlineKeyboardButton(
                            text="❌ Не подходит",
                            callback_data=f"decline_reschedule:{booking.id}"
                        )
                    ]
                ])

                await self.bot.send_message(
                    chat_id=client.telegram_id,
                    text=text,
                    parse_mode="HTML",
                    reply_markup=keyboard
                )

            else:
                # Notification to trainer
                text = (
                    "🔄 <b>Клиент перенес запись</b>\n\n"
                    f"👤 Клиент: {client.name}\n\n"
                    f"❌ Старое время:\n"
                    f"📅 {old_date} в {old_time}\n\n"
                    f"✅ Новое время:\n"
                    f"📅 {new_date} в {new_time}\n\n"
                    "<i>Требуется ваше подтверждение</i>"
                )

                keyboard = InlineKeyboardMarkup(inline_keyboard=[
                    [
                        InlineKeyboardButton(
                            text="✅ Подтвердить",
                            callback_data=f"confirm_booking:{booking.id}"
                        ),
                        InlineKeyboardButton(
                            text="❌ Отменить",
                            callback_data=f"cancel_booking:{booking.id}"
                        )
                    ]
                ])

                await self.bot.send_message(
                    chat_id=trainer.telegram_id,
                    text=text,
                    parse_mode="HTML",
                    reply_markup=keyboard
                )

            return True
        except Exception as e:
            print(f"Error sending reschedule notification: {e}")
            return False

    async def send_reminder_to_client(
        self,
        booking: Booking,
        trainer: User,
        client: User,
        reminder_number: int = 1
    ):
        """Send reminder to client about upcoming training

        Args:
            reminder_number: 1 (first), 2 (second), or 3 (third/final warning)
        """
        try:
            booking_time_start = booking.datetime.strftime("%H:%M")
            # Calculate end time (datetime + duration minutes)
            from datetime import timedelta
            end_time = booking.datetime + timedelta(minutes=booking.duration or 60)
            booking_time_end = end_time.strftime("%H:%M")

            # Different text for each reminder
            if reminder_number == 1:
                text = "Завтра придешь на тренировку?"
            elif reminder_number == 2:
                text = f"Завтра тренировка с {booking_time_start} до {booking_time_end}"
            elif reminder_number == 3:
                text = "Скоро тренировка будет отменена. Придешь?"
            else:
                text = "Напоминание о тренировке"

            keyboard = InlineKeyboardMarkup(inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="✅ Подтверждаю",
                        callback_data=f"confirm_attendance:{booking.id}"
                    ),
                    InlineKeyboardButton(
                        text="❌ Не смогу прийти",
                        callback_data=f"cancel_booking:{booking.id}"
                    )
                ]
            ])

            await self.bot.send_message(
                chat_id=client.telegram_id,
                text=text,
                parse_mode="HTML",
                reply_markup=keyboard
            )

            return True
        except Exception as e:
            print(f"Error sending reminder: {e}")
            return False

    async def send_auto_cancel_notification(
        self,
        booking: Booking,
        trainer: User,
        client: User
    ):
        """Send notification when booking is auto-cancelled due to no response"""
        try:
            text = "Тренировка отменена слабак"

            # No buttons - just informational message
            await self.bot.send_message(
                chat_id=client.telegram_id,
                text=text,
                parse_mode="HTML"
            )

            return True
        except Exception as e:
            print(f"Error sending auto-cancel notification: {e}")
            return False

    async def send_topup_request_to_trainer(
        self,
        client: User,
        trainer: User,
        amount: int,
        db: Session
    ):
        """Send notification to trainer when client reports topup payment"""
        try:
            text = f"💰 <b>Уведомление о пополнении баланса</b>\n\n"
            text += f"Клиент <b>{client.name}</b> сообщил о пополнении баланса на <b>{amount:,}₽</b>\n\n"
            text += f"Если деньги поступили, подтвердите пополнение.\n"
            text += f"Баланс клиента будет увеличен автоматически."

            # Create callback data for buttons
            callback_confirm = f"topup_confirm:{trainer.telegram_id}:{client.telegram_id}:{amount}"
            callback_pending = f"topup_pending:{trainer.telegram_id}:{client.telegram_id}:{amount}"

            # Create inline keyboard with buttons
            keyboard = InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="✅ Подтвердить поступление", callback_data=callback_confirm)],
                [InlineKeyboardButton(text="⏳ Деньги еще не поступили", callback_data=callback_pending)]
            ])

            await self.bot.send_message(
                chat_id=trainer.telegram_id,
                text=text,
                parse_mode="HTML",
                reply_markup=keyboard
            )

            return True
        except Exception as e:
            print(f"Error sending topup request notification: {e}")
            return False

    async def close(self):
        """Close bot session"""
        await self.bot.session.close()


# Global instance
notification_service = NotificationService()


# Helper functions for use in API endpoints
# DEPRECATED: This function violates TZ 10.6 and should not be used
# Use notify_booking_created_by_trainer() or notify_booking_created_by_client() instead
# async def notify_booking_created(booking: Booking, db: Session):
#     """DEPRECATED: Sends notifications to BOTH trainer and client - violates TZ 10.6"""
#     pass


async def notify_booking_confirmed(booking: Booking, db: Session):
    """Helper to send notification when booking is confirmed"""
    trainer = db.query(User).filter_by(id=booking.trainer_id).first()
    client = db.query(User).filter_by(id=booking.client_id).first()

    if trainer and client:
        await notification_service.send_booking_confirmed(booking, trainer, client, db)


async def notify_booking_cancelled(
    booking: Booking,
    db: Session,
    reason: Optional[str] = None,
    cancelled_by_trainer: bool = True
):
    """Helper to send notification when booking is cancelled"""
    trainer = db.query(User).filter_by(id=booking.trainer_id).first()
    client = db.query(User).filter_by(id=booking.client_id).first()

    if trainer and client:
        await notification_service.send_booking_cancelled(
            booking, trainer, client, reason,
            "trainer" if cancelled_by_trainer else "client"
        )


async def notify_booking_rescheduled(
    booking: Booking,
    old_datetime: datetime,
    db: Session,
    rescheduled_by_trainer: bool = True
):
    """Helper to send notification when booking is rescheduled"""
    trainer = db.query(User).filter_by(id=booking.trainer_id).first()
    client = db.query(User).filter_by(id=booking.client_id).first()

    if trainer and client:
        await notification_service.send_booking_rescheduled(
            booking, old_datetime, trainer, client,
            "trainer" if rescheduled_by_trainer else "client"
        )


# New simplified notification functions according to TZ 10.6
async def notify_booking_created_by_trainer(booking: Booking, db: Session):
    """
    When trainer creates booking: NO notifications sent to anyone.
    First reminder will serve as first notification to client.
    """
    # According to new TZ 10.6: no notifications when trainer creates booking
    print(f"🚫🚫🚫 VERSION 2025-10-08-v3 🚫🚫🚫")
    print(f"🚫 notify_booking_created_by_trainer() called for booking {booking.id}")
    print(f"🚫 NO notifications will be sent (correct per TZ 10.6)")
    pass


async def notify_booking_created_by_client(booking: Booking, db: Session):
    """
    When client creates booking: send notification to trainer for confirmation.
    """
    print(f"📧 notify_booking_created_by_client() called for booking {booking.id}")
    print(f"📧 Will send notification to TRAINER for approval")

    trainer = db.query(User).filter_by(id=booking.trainer_id).first()
    client = db.query(User).filter_by(id=booking.client_id).first()

    if trainer and client:
        print(f"📧 Sending notification to trainer {trainer.telegram_id}")
        # Only send notification to trainer for approval
        await notification_service.send_booking_created_to_trainer(booking, trainer, client, db)

        # Send confirmation to client about request creation
        try:
            booking_date = booking.datetime.strftime("%d.%m.%Y")
            booking_time = booking.datetime.strftime("%H:%M")

            text = (
                "✅ <b>Запрос на тренировку отправлен!</b>\n\n"
                f"👨‍🏫 Тренер: {trainer.name}\n"
                f"📅 Дата: {booking_date}\n"
                f"⏰ Время: {booking_time}\n"
                f"💰 Стоимость: {booking.price} ₽\n\n"
                "<i>Ожидаем подтверждения от тренера</i>"
            )

            await notification_service.bot.send_message(
                chat_id=client.telegram_id,
                text=text,
                parse_mode="HTML"
            )
        except Exception as e:
            print(f"Error sending client request confirmation: {e}")