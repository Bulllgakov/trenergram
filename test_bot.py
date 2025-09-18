#!/usr/bin/env python
"""
Простой тест Telegram бота
"""
import asyncio
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Токен бота
BOT_TOKEN = "8229544461:AAFr-MA466IKP_egh448meK6LLKWEZagofI"

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик команды /start"""
    user = update.effective_user
    await update.message.reply_text(
        f"👋 Привет, {user.mention_html()}!\n\n"
        f"🎯 Добро пожаловать в Trenergram!\n"
        f"Платформа для быстрого бронирования тренеров.\n\n"
        f"✅ Полностью БЕСПЛАТНО для тренеров и клиентов!\n\n"
        f"Используйте /help для списка команд.",
        parse_mode='HTML'
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик команды /help"""
    help_text = """
📚 <b>Доступные команды:</b>

/start - Начало работы
/help - Эта справка
/info - Информация о боте

<b>Для тренеров:</b>
/schedule - Расписание на сегодня
/my_link - Ваша персональная ссылка

<b>Для клиентов:</b>
/book - Записаться на тренировку
/my - Мои тренировки

💡 Платформа Trenergram - БЕСПЛАТНО для всех!
"""
    await update.message.reply_text(help_text, parse_mode='HTML')

async def info(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Информация о боте"""
    await update.message.reply_text(
        "ℹ️ <b>Trenergram Bot</b>\n\n"
        "Версия: 2.0.0\n"
        "Статус: ✅ Работает\n"
        "Username: @trenergram_bot\n\n"
        "Платформа для автоматизации записи на фитнес-тренировки.",
        parse_mode='HTML'
    )

def main():
    """Запуск бота"""
    # Создаем приложение
    application = Application.builder().token(BOT_TOKEN).build()

    # Регистрируем обработчики команд
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("info", info))

    # Запускаем бота
    logger.info("🚀 Запуск бота @trenergram_bot...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()