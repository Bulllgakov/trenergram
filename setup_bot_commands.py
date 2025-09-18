#!/usr/bin/env python
"""
Скрипт для настройки команд бота в BotFather
"""
import asyncio
from telegram import Bot, BotCommand

BOT_TOKEN = "8229544461:AAFr-MA466IKP_egh448meK6LLKWEZagofI"

async def setup_commands():
    """Настройка команд бота"""
    bot = Bot(token=BOT_TOKEN)

    # Команды для всех пользователей
    commands = [
        BotCommand("start", "🚀 Начать работу"),
        BotCommand("help", "📚 Справка"),
        BotCommand("support", "📞 Поддержка"),
        # Команды для тренеров
        BotCommand("schedule", "📅 Расписание на сегодня"),
        BotCommand("today", "👥 Клиенты на сегодня"),
        BotCommand("tomorrow", "📆 Клиенты на завтра"),
        BotCommand("my_link", "🔗 Моя ссылка"),
        BotCommand("book_client", "📝 Записать клиента"),
        BotCommand("settings", "⚙️ Настройки"),
        BotCommand("stats", "📊 Статистика"),
        BotCommand("my_club", "🏢 Мой клуб"),
        # Команды для клиентов
        BotCommand("book", "📅 Записаться"),
        BotCommand("my", "📋 Мои тренировки"),
        BotCommand("cancel", "❌ Отменить"),
        BotCommand("trainers", "💪 Мои тренеры"),
    ]

    await bot.set_my_commands(commands)
    print("✅ Команды успешно установлены!")

    # Получаем информацию о боте
    bot_info = await bot.get_me()
    print(f"\n📱 Бот: @{bot_info.username}")
    print(f"🆔 ID: {bot_info.id}")
    print(f"📝 Имя: {bot_info.first_name}")

    # Устанавливаем описание бота
    await bot.set_my_description(
        "🎯 Trenergram - платформа для быстрого бронирования тренеров.\n\n"
        "✅ БЕСПЛАТНО для тренеров и клиентов!\n\n"
        "• Автоматизация записи на тренировки\n"
        "• Управление расписанием\n"
        "• Напоминания в Telegram\n"
        "• Статистика и аналитика"
    )
    print("✅ Описание бота установлено!")

    # Устанавливаем короткое описание
    await bot.set_my_short_description(
        "Платформа для записи на фитнес-тренировки. Бесплатно для всех! 🚀"
    )
    print("✅ Короткое описание установлено!")

if __name__ == "__main__":
    asyncio.run(setup_commands())