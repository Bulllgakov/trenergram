from telegram import Update
from telegram.ext import ContextTypes


async def book_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start booking process for client"""
    # TODO: Check if client has trainers
    await update.message.reply_text(
        "📅 *Запись на тренировку*\n\n"
        "У вас нет привязанных тренеров.\n\n"
        "Попросите у вашего тренера персональную ссылку или "
        "отсканируйте QR-код в фитнес-клубе.",
        parse_mode='Markdown'
    )


async def my_bookings_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show client's upcoming bookings"""
    # TODO: Load from database
    await update.message.reply_text(
        "📋 *Ваши предстоящие тренировки*\n\n"
        "*Сегодня:*\n"
        "15:00 - Иван Петров (Фитнес ЭНЕРГИЯ)\n\n"
        "*Завтра:*\n"
        "10:00 - Мария Сидорова (World Class)\n\n"
        "Для отмены используйте /cancel",
        parse_mode='Markdown'
    )


async def handle_show_my_bookings(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle callback for showing bookings list"""
    query = update.callback_query
    await query.answer()

    # Show same message as /my command
    await query.message.reply_text(
        "📋 *Ваши предстоящие тренировки*\n\n"
        "*Сегодня:*\n"
        "15:00 - Иван Петров (Фитнес ЭНЕРГИЯ)\n\n"
        "*Завтра:*\n"
        "10:00 - Мария Сидорова (World Class)\n\n"
        "Для отмены используйте /cancel",
        parse_mode='Markdown'
    )


async def cancel_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start cancellation process"""
    await update.message.reply_text(
        "❌ *Отмена тренировки*\n\n"
        "Выберите тренировку для отмены в Mini App или "
        "напишите дату и время тренировки.",
        parse_mode='Markdown'
    )


async def trainers_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show client's trainers"""
    # TODO: Load from database
    await update.message.reply_text(
        "💪 *Ваши тренеры*\n\n"
        "1. Иван Петров\n"
        "   Фитнес ЭНЕРГИЯ\n"
        "   Силовые тренировки\n"
        "   2000₽/занятие\n\n"
        "2. Мария Сидорова\n"
        "   World Class\n"
        "   Йога\n"
        "   2500₽/занятие",
        parse_mode='Markdown'
    )