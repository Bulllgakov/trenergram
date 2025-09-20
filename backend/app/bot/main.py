import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes

from app.core.config import settings
from app.bot.handlers import registration, trainer, client, common, webapp
from app.bot.utils import keyboards

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command"""
    user = update.effective_user
    args = context.args

    # Check if user is already registered
    from app.services.registration import get_user_by_telegram_id
    existing_user = get_user_by_telegram_id(str(user.id))

    # Check if user came from a specific link
    if args:
        source = args[0]
        if source.startswith("trainer_"):
            # User came from trainer's link
            trainer_id = source.replace("trainer_", "")

            # If user exists as a client, show their dashboard
            if existing_user and existing_user.role == "client":
                from telegram import WebAppInfo
                keyboard = [
                    [InlineKeyboardButton(
                        "📅 Мои тренировки",
                        web_app=WebAppInfo(url=f"https://trenergram.ru/app/client/{user.id}")
                    )],
                    [InlineKeyboardButton(
                        "⚙️ Настройки",
                        web_app=WebAppInfo(url=f"https://trenergram.ru/app/client/{user.id}/settings")
                    )]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)

                await update.message.reply_text(
                    "С возвращением! 👋\n\n"
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
            from telegram import WebAppInfo
            keyboard = [
                [InlineKeyboardButton(
                    "📱 Открыть кабинет тренера",
                    web_app=WebAppInfo(url=f"https://trenergram.ru/app/trainer/{user.id}")
                )],
                [InlineKeyboardButton("📎 Ссылка для клиентов", callback_data="copy_link")],
                [InlineKeyboardButton(
                    "⚙️ Настройки",
                    web_app=WebAppInfo(url=f"https://trenergram.ru/app/trainer/{user.id}/settings")
                )]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            await update.message.reply_text(
                f"С возвращением, {existing_user.name}! 👋\n\n"
                "Используйте кнопки ниже для управления профилем.",
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
            return
        elif existing_user.role == "client":
            from telegram import WebAppInfo
            keyboard = [
                [InlineKeyboardButton(
                    "📅 Мои тренировки",
                    web_app=WebAppInfo(url=f"https://trenergram.ru/app/client/{user.id}")
                )],
                [InlineKeyboardButton(
                    "⚙️ Настройки",
                    web_app=WebAppInfo(url=f"https://trenergram.ru/app/client/{user.id}/settings")
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

    # Main commands - simplified interface
    application.add_handler(CommandHandler("cabinet", webapp.cabinet_command))
    application.add_handler(CommandHandler("my_link", webapp.my_link_command))
    application.add_handler(CommandHandler("settings", webapp.settings_command))

    # Client commands (keep minimal)
    application.add_handler(CommandHandler("my", client.my_bookings_command))

    # Message handlers for registration flow
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, registration.handle_text_input))

    # Start the bot
    logger.info(f"Starting bot @{settings.BOT_USERNAME}...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()