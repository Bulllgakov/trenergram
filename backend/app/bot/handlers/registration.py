from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes


async def handle_role_selection(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle role selection (trainer/client)"""
    query = update.callback_query
    await query.answer()

    if query.data == "role_trainer":
        await start_trainer_registration(update, context)
    elif query.data == "role_client":
        await start_client_registration_standalone(update, context)


async def start_trainer_registration(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start trainer registration flow"""
    await update.callback_query.edit_message_text(
        "💪 *Регистрация тренера*\n\n"
        "Как вас зовут? (Это увидят клиенты)",
        parse_mode='Markdown'
    )
    context.user_data['registration_step'] = 'trainer_name'
    context.user_data['role'] = 'trainer'


async def start_client_registration(update: Update, context: ContextTypes.DEFAULT_TYPE, trainer_id: str = None):
    """Start client registration from trainer link"""
    context.user_data['registration_step'] = 'client_name'
    context.user_data['role'] = 'client'
    context.user_data['trainer_id'] = trainer_id

    await update.message.reply_text(
        "🏃 *Регистрация клиента*\n\n"
        "Как вас зовут?",
        parse_mode='Markdown'
    )


async def start_client_registration_standalone(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start standalone client registration"""
    await update.callback_query.edit_message_text(
        "🏃 *Добро пожаловать!*\n\n"
        "Для записи на тренировки вам нужна ссылка от тренера или QR-код клуба.\n\n"
        "Попросите у вашего тренера персональную ссылку или "
        "отсканируйте QR-код в вашем фитнес-клубе.",
        parse_mode='Markdown'
    )


async def show_club_info(update: Update, context: ContextTypes.DEFAULT_TYPE, club_id: str):
    """Show club info when user scans QR code"""
    # TODO: Load club info from database
    await update.message.reply_text(
        "🏢 *Добро пожаловать в Trenergram!*\n\n"
        f"Вы в клубе: Фитнес ЭНЕРГИЯ\n"
        f"📍 Адрес: ул. Пушкина 15\n"
        f"⏰ Работаем: 07:00-23:00\n\n"
        "Выберите тренера для записи:",
        parse_mode='Markdown'
    )


async def handle_club_selection(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle club selection during trainer registration"""
    query = update.callback_query
    await query.answer()

    if query.data == "club_private":
        # Тренер без клуба - сразу переходим к цене
        context.user_data['club_id'] = None
        await query.edit_message_text(
            "💰 *Стоимость тренировки*\n\n"
            "Укажите стоимость одной тренировки в рублях\n"
            "(например: 2000)",
            parse_mode='Markdown'
        )
        context.user_data['registration_step'] = 'trainer_price'

    elif query.data == "club_list":
        # Показываем список клубов
        # TODO: Загрузить клубы из БД
        keyboard = [
            [InlineKeyboardButton("World Class", callback_data="club_select_1")],
            [InlineKeyboardButton("Fitness House", callback_data="club_select_2")],
            [InlineKeyboardButton("X-Fit", callback_data="club_select_3")],
            [InlineKeyboardButton("⬅️ Назад", callback_data="club_back")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await query.edit_message_text(
            "🏢 *Выберите клуб:*",
            reply_markup=reply_markup,
            parse_mode='Markdown'
        )

    elif query.data.startswith("club_select_"):
        # Выбран конкретный клуб
        club_id = query.data.replace("club_select_", "")
        context.user_data['club_id'] = club_id

        await query.edit_message_text(
            "💰 *Стоимость тренировки*\n\n"
            "Укажите стоимость одной тренировки в рублях\n"
            "(например: 3000)",
            parse_mode='Markdown'
        )
        context.user_data['registration_step'] = 'trainer_price'


async def handle_specialization_selection(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle specialization selection during trainer registration"""
    query = update.callback_query
    await query.answer()
    # TODO: Implement specialization selection logic


async def handle_copy_link(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle copy link button press"""
    query = update.callback_query
    trainer_id = update.effective_user.id
    trainer_link = f"https://t.me/{context.bot.username}?start=trainer_{trainer_id}"

    await query.answer(
        "📋 Ссылка скопирована! Поделитесь ей с клиентами.",
        show_alert=True
    )

    # Also send the link as a separate message for easy copying
    await query.message.reply_text(
        f"📎 *Ваша ссылка для клиентов:*\n\n`{trainer_link}`\n\n"
        "Нажмите на ссылку для копирования и поделитесь ей с клиентами.",
        parse_mode='Markdown'
    )


async def handle_text_input(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle text input during registration flow"""
    step = context.user_data.get('registration_step')

    if not step:
        return

    text = update.message.text

    if step == 'trainer_name':
        context.user_data['name'] = text
        # Ask for club
        keyboard = [
            [InlineKeyboardButton("🏢 Выбрать клуб", callback_data="club_list")],
            [InlineKeyboardButton("💪 Без клуба", callback_data="club_private")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await update.message.reply_text(
            "Где вы проводите тренировки?",
            reply_markup=reply_markup
        )
        context.user_data['registration_step'] = 'trainer_club'

    elif step == 'trainer_price':
        try:
            price = int(text)
            context.user_data['price'] = price
            # Complete registration
            await complete_trainer_registration(update, context)
        except ValueError:
            await update.message.reply_text("Пожалуйста, введите число (например: 2000)")

    elif step == 'client_name':
        context.user_data['name'] = text
        await complete_client_registration(update, context)


async def complete_trainer_registration(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Complete trainer registration"""
    # TODO: Save to database
    trainer_id = update.effective_user.id
    trainer_link = f"https://t.me/{context.bot.username}?start=trainer_{trainer_id}"

    # Создаем клавиатуру с упрощенными кнопками
    from telegram import WebAppInfo
    keyboard = [
        [InlineKeyboardButton(
            "📱 Открыть кабинет тренера",
            web_app=WebAppInfo(url=f"https://trenergram.ru/app/trainer/{trainer_id}")
        )],
        [InlineKeyboardButton("📎 Ссылка для клиентов", callback_data="copy_link")],
        [InlineKeyboardButton(
            "⚙️ Настройки",
            web_app=WebAppInfo(url=f"https://trenergram.ru/app/trainer/{trainer_id}/settings")
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        "✅ *Профиль создан!*\n\n"
        f"📎 Ваша ссылка для клиентов:\n`{trainer_link}`\n"
        "(нажмите для копирования)\n\n"
        "🎯 *Управление профилем:*\n"
        "Все функции доступны в кабинете тренера.\n"
        "Используйте команду /cabinet в любой момент.\n\n"
        "Платформа полностью *БЕСПЛАТНА* для вас!",
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )


async def complete_client_registration(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Complete client registration"""
    # TODO: Save to database
    await update.message.reply_text(
        "✅ *Регистрация завершена!*\n\n"
        "Теперь вы можете записываться на тренировки.\n\n"
        "Используйте /help для просмотра доступных команд.",
        parse_mode='Markdown'
    )