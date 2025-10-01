from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ContextTypes
from sqlalchemy import select

from app.db.base import async_session
from app.models.user import User, UserRole


async def cabinet_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Open trainer's web app (mini app)"""
    user_id = update.effective_user.id
    telegram_id = str(user_id)
    trainer_link = f"https://t.me/{context.bot.username}?start=trainer_{user_id}"

    # Check user role from database
    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()

    if not user:
        await update.message.reply_text(
            "⚠️ Вы еще не зарегистрированы в системе.\n"
            "Используйте /start для начала работы.",
            parse_mode='Markdown'
        )
        return

    if user.role != UserRole.TRAINER:
        # Redirect to client cabinet
        await client_cabinet_command(update, context)
        return

    keyboard = [
        [InlineKeyboardButton(
            "📱 Открыть кабинет тренера",
            web_app=WebAppInfo(url=f"https://trenergram.ru/app/trainer/{user_id}")
        )],
        [InlineKeyboardButton("📎 Ссылка для клиентов", callback_data="copy_link")],
        [InlineKeyboardButton(
            "⚙️ Настройки",
            web_app=WebAppInfo(url=f"https://trenergram.ru/app/trainer/{user_id}/settings")
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        "🎯 *Кабинет тренера*\n\n"
        "Управляйте своим профилем, расписанием и клиентами.\n\n"
        f"📎 Ваша ссылка:\n`{trainer_link}`",
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )


async def my_link_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show trainer's personal link for copying"""
    user_id = update.effective_user.id
    trainer_link = f"https://t.me/{context.bot.username}?start=trainer_{user_id}"

    keyboard = [
        [InlineKeyboardButton("📤 Поделиться ссылкой",
                            url=f"https://t.me/share/url?url={trainer_link}&text=Записывайтесь на тренировки!")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        f"📎 *Ваша ссылка для клиентов:*\n\n`{trainer_link}`\n\n"
        "Нажмите на ссылку для копирования.\n"
        "Поделитесь ей с клиентами, чтобы они могли записаться к вам на тренировку.",
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )


async def settings_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Open settings in web app"""
    user_id = update.effective_user.id

    keyboard = [
        [InlineKeyboardButton(
            "⚙️ Открыть настройки",
            web_app=WebAppInfo(url=f"https://trenergram.ru/app/trainer/{user_id}/settings")
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        "⚙️ *Настройки профиля*\n\n"
        "В настройках вы можете изменить:\n"
        "• Стоимость тренировки\n"
        "• Расписание работы\n"
        "• Настройки напоминаний\n"
        "• Контактную информацию",
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )


async def client_cabinet_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Open client's web app (mini app)"""
    user_id = update.effective_user.id

    keyboard = [
        [InlineKeyboardButton(
            "📱 Мои тренировки",
            web_app=WebAppInfo(url=f"https://trenergram.ru/app/client/{user_id}")
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        "🏃 *Мои тренировки*\n\n"
        "Нажмите кнопку ниже, чтобы открыть ваш личный кабинет.\n\n"
        "В кабинете вы можете:\n"
        "• Просматривать записи\n"
        "• Записываться на тренировки\n"
        "• Отменять записи\n"
        "• Смотреть историю",
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )