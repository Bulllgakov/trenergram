from telegram import Update
from telegram.ext import ContextTypes


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Cancel any ongoing operation"""
    context.user_data.clear()
    await update.message.reply_text("Операция отменена.")


async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle errors"""
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"Update {update} caused error {context.error}")

    if update and update.effective_message:
        await update.effective_message.reply_text(
            "❌ Произошла ошибка. Пожалуйста, попробуйте позже или обратитесь в /support"
        )