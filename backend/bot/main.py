import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes

from core.config import settings
from bot.handlers import registration, trainer, client, common, webapp, booking_callbacks
from bot.utils import keyboards

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command"""
    user = update.effective_user
    args = context.args

    logger.info(f"Start command from user {user.id} (@{user.username}) with args: {args}")

    # Check if user is already registered
    from services.registration import get_user_by_telegram_id
    existing_user = get_user_by_telegram_id(str(user.id))

    if existing_user:
        logger.info(f"User {user.id} already registered as {existing_user.role}")
    else:
        logger.info(f"User {user.id} not found in database, starting registration")

    # Check if user came from a specific link
    if args:
        source = args[0]
        if source.startswith("trainer_"):
            # User came from trainer's link
            trainer_id = source.replace("trainer_", "")
            logger.info(f"User {user.id} came from trainer link: trainer_id={trainer_id}")

            # If user exists as a client, link to trainer
            if existing_user and existing_user.role == "client":
                # Try to link with trainer
                from services.registration import link_client_to_trainer
                success = await link_client_to_trainer(str(user.id), trainer_id)

                if success:
                    await update.message.reply_text(
                        f"✅ Вы успешно привязаны к тренеру!\n\n"
                        "Теперь вы можете записываться на тренировки.",
                        parse_mode='Markdown'
                    )

                from telegram import WebAppInfo
                keyboard = [
                    [InlineKeyboardButton(
                        "📅 Мои тренировки",
                        web_app=WebAppInfo(url=f"https://trenergram.ru/client/{user.id}")
                    )],
                    [InlineKeyboardButton(
                        "⚙️ Настройки",
                        web_app=WebAppInfo(url=f"https://trenergram.ru/client/{user.id}/settings")
                    )]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)

                await update.message.reply_text(
                    "Используйте кнопки ниже для управления тренировками.",
                    reply_markup=reply_markup,
                    parse_mode='Markdown'
                )
                return

            # Start client registration
            await registration.start_client_registration(update, context, trainer_id)
            return

        elif source.startswith("club_"):
            # User came from club's QR code
            club_qr = source.replace("club_", "")
            await registration.show_club_info(update, context, club_qr)
            return

    # If user is already registered, show their interface
    if existing_user:
        if existing_user.role == "trainer":
            from telegram import WebAppInfo, KeyboardButton, ReplyKeyboardMarkup

            # Reply Keyboard (постоянное меню внизу)
            main_keyboard = [
                [KeyboardButton("📱 Открыть кабинет")],
                [KeyboardButton("📎 Моя ссылка")]
            ]
            reply_keyboard = ReplyKeyboardMarkup(main_keyboard, resize_keyboard=True)

            # Inline клавиатура с WebApp кнопками
            keyboard = [
                [InlineKeyboardButton(
                    "📱 Открыть кабинет тренера",
                    web_app=WebAppInfo(url=f"https://trenergram.ru/trainer/{user.id}")
                )],
                [InlineKeyboardButton("📎 Ссылка для клиентов", callback_data="copy_link")]
            ]
            inline_markup = InlineKeyboardMarkup(keyboard)

            await update.message.reply_text(
                f"С возвращением, {existing_user.name}! 👋\n\n"
                "Используйте кнопки ниже для управления профилем.",
                reply_markup=reply_keyboard,
                parse_mode='Markdown'
            )

            await update.message.reply_text(
                "Быстрый доступ:",
                reply_markup=inline_markup
            )
            return
        elif existing_user.role == "client":
            from telegram import WebAppInfo
            keyboard = [
                [InlineKeyboardButton(
                    "📅 Мои тренировки",
                    web_app=WebAppInfo(url=f"https://trenergram.ru/client/{user.id}")
                )],
                [InlineKeyboardButton(
                    "⚙️ Настройки",
                    web_app=WebAppInfo(url=f"https://trenergram.ru/client/{user.id}/settings")
                )]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            await update.message.reply_text(
                f"С возвращением, {existing_user.name}! 👋\n\n"
                "Используйте кнопки ниже для управления тренировками.",
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
            return

    # Regular start - ask for role
    keyboard = [
        [
            InlineKeyboardButton("💪 Я тренер", callback_data="role_trainer"),
            InlineKeyboardButton("🏃 Я клиент", callback_data="role_client")
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        f"Добро пожаловать в Trenergram! 🎯\n\n"
        f"Платформа полностью *БЕСПЛАТНА* для тренеров и клиентов.\n\n"
        f"Вы тренер или клиент?",
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command"""
    help_text = """
📚 *Справка по командам Trenergram*

*Основные команды:*
/start - начало работы
/cabinet - 📱 открыть кабинет
/my_link - 📎 получить ссылку для клиентов
/settings - ⚙️ настройки профиля
/help - эта справка
/support - связь с поддержкой

*Для клиентов:*
/my - мои тренировки

💡 *Совет:* Все функции управления доступны в кабинете тренера через команду /cabinet

Платформа Trenergram - *БЕСПЛАТНО* для всех! 🚀
"""
    await update.message.reply_text(help_text, parse_mode='Markdown')


async def support_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /support command"""
    await update.message.reply_text(
        "📞 *Служба поддержки Trenergram*\n\n"
        "Если у вас есть вопросы или проблемы, напишите нам:\n"
        "📧 Email: support@trenergram.ru\n"
        "💬 Telegram: @trenergram_support\n\n"
        "Мы ответим в течение 24 часов!",
        parse_mode='Markdown'
    )


def main():
    """Start the bot"""
    # Create the Application
    application = Application.builder().token(settings.BOT_TOKEN).build()

    # Common handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("support", support_command))

    # Registration handlers
    application.add_handler(CallbackQueryHandler(registration.handle_role_selection, pattern="^role_"))
    application.add_handler(CallbackQueryHandler(registration.handle_club_selection, pattern="^club_"))
    application.add_handler(CallbackQueryHandler(registration.handle_copy_link, pattern="^copy_link$"))

    # Booking callback handlers
    application.add_handler(CallbackQueryHandler(booking_callbacks.handle_confirm_booking, pattern="^confirm_booking:"))
    application.add_handler(CallbackQueryHandler(booking_callbacks.handle_cancel_booking, pattern="^cancel_booking:"))
    application.add_handler(CallbackQueryHandler(booking_callbacks.handle_accept_reschedule, pattern="^accept_reschedule:"))
    application.add_handler(CallbackQueryHandler(booking_callbacks.handle_decline_reschedule, pattern="^decline_reschedule:"))
    application.add_handler(CallbackQueryHandler(booking_callbacks.handle_confirm_attendance, pattern="^confirm_attendance:"))

    # Main commands - simplified interface
    application.add_handler(CommandHandler("cabinet", webapp.cabinet_command))
    application.add_handler(CommandHandler("my_link", webapp.my_link_command))
    application.add_handler(CommandHandler("settings", webapp.settings_command))

    # Client commands (keep minimal)
    application.add_handler(CommandHandler("my", client.my_bookings_command))

    # Message handlers for keyboard buttons
    application.add_handler(MessageHandler(filters.Regex("^📱 Открыть кабинет$"), webapp.cabinet_command))
    application.add_handler(MessageHandler(filters.Regex("^📎 Моя ссылка$"), webapp.my_link_command))

    # Message handlers for registration flow
    application.add_handler(MessageHandler(filters.CONTACT, registration.handle_contact))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, registration.handle_text_input))

    # Start the bot
    logger.info(f"Starting bot @{settings.BOT_USERNAME}...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()