from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ContextTypes

from db.base import async_session
from services.trainer import TrainerService
from models.enums import BookingStatus


async def schedule_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show trainer's schedule for today"""
    telegram_id = str(update.effective_user.id)

    async with async_session() as db:
        schedule = await TrainerService.get_today_schedule(db, telegram_id)

    if not schedule:
        await update.message.reply_text(
            "📅 *Ваше расписание на сегодня*\n\n"
            "У вас пока нет записей на сегодня.",
            parse_mode='Markdown'
        )
        return

    message = "📅 *Ваше расписание на сегодня*\n\n"

    for item in schedule:
        status_emoji = "✅" if item['status'] == BookingStatus.CONFIRMED else "⏳"
        message += f"{item['time']} - {item['client_name']} {status_emoji}\n"

    message += "\n✅ - подтверждено\n⏳ - ожидает подтверждения"

    await update.message.reply_text(message, parse_mode='Markdown')


async def today_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show clients for today"""
    telegram_id = str(update.effective_user.id)

    async with async_session() as db:
        clients = await TrainerService.get_today_clients(db, telegram_id)

    if not clients:
        await update.message.reply_text(
            "👥 *Клиенты на сегодня*\n\n"
            "У вас пока нет записей на сегодня.",
            parse_mode='Markdown'
        )
        return

    message = "👥 *Клиенты на сегодня*\n\n"
    for i, client in enumerate(clients, 1):
        message += f"{i}. {client['time']} - {client['name']}\n"

    message += f"\nВсего: {len(clients)} клиент(ов)"

    await update.message.reply_text(message, parse_mode='Markdown')


async def tomorrow_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show clients for tomorrow"""
    telegram_id = str(update.effective_user.id)

    async with async_session() as db:
        clients = await TrainerService.get_tomorrow_clients(db, telegram_id)

    if not clients:
        await update.message.reply_text(
            "👥 *Клиенты на завтра*\n\n"
            "У вас пока нет записей на завтра.",
            parse_mode='Markdown'
        )
        return

    message = "👥 *Клиенты на завтра*\n\n"
    for i, client in enumerate(clients, 1):
        message += f"{i}. {client['time']} - {client['name']}\n"

    message += f"\nВсего: {len(clients)} клиент(ов)"

    await update.message.reply_text(message, parse_mode='Markdown')


async def my_link_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show trainer's personal link"""
    trainer_id = update.effective_user.id
    trainer_link = f"https://t.me/{context.bot.username}?start=trainer_{trainer_id}"

    await update.message.reply_text(
        "🔗 *Ваша персональная ссылка*\n\n"
        f"`{trainer_link}`\n\n"
        "Отправьте эту ссылку клиентам для быстрой записи.\n"
        "При переходе по ссылке клиент автоматически привяжется к вам.",
        parse_mode='Markdown'
    )


async def book_client_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start booking a client process"""
    await update.message.reply_text(
        "📝 *Запись клиента*\n\n"
        "Выберите свободный слот из вашего расписания или "
        "используйте кнопку 'Записать' в Mini App.",
        parse_mode='Markdown'
    )


async def settings_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show trainer settings"""
    await update.message.reply_text(
        "⚙️ *Настройки*\n\n"
        "Откройте Mini App для управления:\n"
        "• Напоминания клиентам\n"
        "• Правила переноса\n"
        "• Рабочие часы\n"
        "• Стоимость тренировки",
        parse_mode='Markdown'
    )


async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show trainer statistics"""
    telegram_id = str(update.effective_user.id)

    async with async_session() as db:
        stats = await TrainerService.get_trainer_stats(db, telegram_id)

    await update.message.reply_text(
        f"📊 *Ваша статистика*\n\n"
        f"*За текущий месяц:*\n"
        f"• Проведено тренировок: {stats['month_completed']}\n"
        f"• Отменено: {stats['month_cancelled']}\n"
        f"• Новых клиентов: {stats['month_new_clients']}\n"
        f"• Общий доход: {stats['month_revenue']:,}₽\n\n"
        f"*Всего:*\n"
        f"• Активных клиентов: {stats['total_clients']}\n"
        f"• Проведено тренировок: {stats['total_completed']}",
        parse_mode='Markdown'
    )


async def my_club_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show trainer's club info"""
    telegram_id = str(update.effective_user.id)

    async with async_session() as db:
        club_info = await TrainerService.get_trainer_club(db, telegram_id)

    if not club_info:
        await update.message.reply_text(
            "🏢 *Ваш клуб*\n\n"
            "Вы не привязаны к клубу. Вы работаете как частный тренер.",
            parse_mode='Markdown'
        )
        return

    await update.message.reply_text(
        f"🏢 *Ваш клуб*\n\n"
        f"*{club_info['name']}*\n"
        f"📍 {club_info['address'] or 'Адрес не указан'}\n"
        f"📞 {club_info['phone'] or 'Телефон не указан'}\n"
        f"⏰ {club_info['working_hours']}\n\n"
        f"Тариф клуба: {club_info['tariff'].title()}\n"
        f"Тренеров в клубе: {club_info['trainer_count']}",
        parse_mode='Markdown'
    )