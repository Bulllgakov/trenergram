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
        """Send notification to trainer about new booking"""
        try:
            booking_date = booking.datetime.strftime("%d.%m.%Y")
            booking_time = booking.datetime.strftime("%H:%M")

            text = (
                "🆕 <b>Новая запись на тренировку!</b>\n\n"
                f"👤 Клиент: {client.name}\n"
                f"📅 Дата: {booking_date}\n"
                f"⏰ Время: {booking_time}\n"
                f"💰 Стоимость: {booking.price} ₽\n"
            )

            if booking.notes:
                text += f"💬 Комментарий: {booking.notes}\n"

            text += "\n<i>Подтвердите или отмените запись в вашем Mini App</i>"

            # Create inline keyboard with actions
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
                ],
                [
                    InlineKeyboardButton(
                        text="📱 Открыть Mini App",
                        web_app={"url": f"https://trenergram.ru/trainer/{trainer.telegram_id}"}
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
            print(f"Error sending notification to trainer: {e}")
            return False

    async def send_booking_created_to_client(
        self,
        booking: Booking,
        trainer: User,
        client: User,
        db: Session
    ):
        """Send confirmation to client about booking creation"""
        try:
            booking_date = booking.datetime.strftime("%d.%m.%Y")
            booking_time = booking.datetime.strftime("%H:%M")

            text = (
                "✅ <b>Запись создана!</b>\n\n"
                f"👨‍🏫 Тренер: {trainer.name}\n"
                f"📅 Дата: {booking_date}\n"
                f"⏰ Время: {booking_time}\n"
                f"💰 Стоимость: {booking.price} ₽\n"
                f"📍 Статус: Ожидает подтверждения тренера\n\n"
                "<i>Вы получите уведомление, когда тренер подтвердит запись</i>"
            )

            keyboard = InlineKeyboardMarkup(inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="📱 Мои записи",
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

            return True
        except Exception as e:
            print(f"Error sending notification to client: {e}")
            return False

    async def send_booking_confirmed(
        self,
        booking: Booking,
        trainer: User,
        client: User,
        db: Session
    ):
        """Send confirmation notification to client"""
        try:
            booking_date = booking.datetime.strftime("%d.%m.%Y")
            booking_time = booking.datetime.strftime("%H:%M")

            text = (
                "✅ <b>Запись подтверждена!</b>\n\n"
                f"👨‍🏫 Тренер: {trainer.name}\n"
                f"📅 Дата: {booking_date}\n"
                f"⏰ Время: {booking_time}\n"
                f"💰 Стоимость: {booking.price} ₽\n\n"
                "<i>Не забудьте прийти вовремя!</i>"
            )

            await self.bot.send_message(
                chat_id=client.telegram_id,
                text=text,
                parse_mode="HTML"
            )

            return True
        except Exception as e:
            print(f"Error sending confirmation to client: {e}")
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
        hours_before: int = 24
    ):
        """Send reminder to client about upcoming training"""
        try:
            booking_date = booking.datetime.strftime("%d.%m.%Y")
            booking_time = booking.datetime.strftime("%H:%M")

            if hours_before >= 24:
                time_text = f"через {hours_before // 24} дн."
            else:
                time_text = f"через {hours_before} ч."

            text = (
                f"⏰ <b>Напоминание о тренировке {time_text}</b>\n\n"
                f"👨‍🏫 Тренер: {trainer.name}\n"
                f"📅 Дата: {booking_date}\n"
                f"⏰ Время: {booking_time}\n"
                f"💰 Стоимость: {booking.price} ₽\n\n"
                "<i>Не забудьте взять спортивную форму!</i>"
            )

            keyboard = InlineKeyboardMarkup(inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="✅ Приду",
                        callback_data=f"confirm_attendance:{booking.id}"
                    ),
                    InlineKeyboardButton(
                        text="❌ Отменить",
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