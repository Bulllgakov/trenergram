from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup, ReplyKeyboardRemove
from telegram.ext import ContextTypes
from app.services import registration as reg_service
import asyncio


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
    # Request contact with phone button
    contact_button = KeyboardButton("📱 Поделиться контактом", request_contact=True)
    reply_markup = ReplyKeyboardMarkup(
        [[contact_button]],
        resize_keyboard=True,
        one_time_keyboard=True
    )

    await update.callback_query.edit_message_text(
        "💪 *Регистрация тренера*\n\n"
        "Для регистрации нам нужны ваши контактные данные.",
        parse_mode='Markdown'
    )

    await update.callback_query.message.reply_text(
        "Нажмите кнопку ниже, чтобы поделиться контактом:",
        reply_markup=reply_markup
    )

    context.user_data['registration_step'] = 'trainer_contact'
    context.user_data['role'] = 'trainer'


async def start_client_registration(update: Update, context: ContextTypes.DEFAULT_TYPE, trainer_id: str = None):
    """Start client registration from trainer link"""
    context.user_data['registration_step'] = 'client_contact'
    context.user_data['role'] = 'client'
    context.user_data['trainer_id'] = trainer_id

    # Request contact with phone button
    contact_button = KeyboardButton("📱 Поделиться контактом", request_contact=True)
    reply_markup = ReplyKeyboardMarkup(
        [[contact_button]],
        resize_keyboard=True,
        one_time_keyboard=True
    )

    await update.message.reply_text(
        "🏃 *Регистрация клиента*\n\n"
        "Для записи на тренировки нам нужны ваши контактные данные.\n\n"
        "Нажмите кнопку ниже:",
        reply_markup=reply_markup,
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


async def show_club_info(update: Update, context: ContextTypes.DEFAULT_TYPE, club_qr: str):
    """Show club info when user scans QR code"""
    # Load club info from database
    from app.db.session import SessionLocal
    from app.models import Club

    db = SessionLocal()
    try:
        club = db.query(Club).filter_by(qr_code=club_qr).first()
        if not club:
            await update.message.reply_text(
                "❌ Клуб не найден. Проверьте QR-код.",
                parse_mode='Markdown'
            )
            return

        await update.message.reply_text(
            f"🏢 *Добро пожаловать в Trenergram!*\n\n"
            f"Вы в клубе: {club.name}\n"
            f"📍 Адрес: {club.address}\n"
            f"⏰ Город: {club.city}\n\n"
            "Выберите тренера для записи:",
            parse_mode='Markdown'
        )
    finally:
        db.close()


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
        # Показываем список клубов из БД
        clubs = reg_service.get_clubs()

        keyboard = []
        for club in clubs:
            keyboard.append([
                InlineKeyboardButton(club.name, callback_data=f"club_select_{club.id}")
            ])

        if not clubs:
            keyboard.append([
                InlineKeyboardButton("➕ Добавить клуб", callback_data="club_add")
            ])

        keyboard.append([
            InlineKeyboardButton("⬅️ Назад", callback_data="club_back")
        ])
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


async def handle_contact(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle contact sharing during registration"""
    step = context.user_data.get('registration_step')

    if not step or not update.message.contact:
        return

    contact = update.message.contact

    # Store contact information
    context.user_data['phone'] = contact.phone_number
    context.user_data['first_name'] = contact.first_name or ""
    context.user_data['last_name'] = contact.last_name or ""
    # Create full name from contact
    full_name = f"{contact.first_name or ''}"
    if contact.last_name:
        full_name += f" {contact.last_name}"
    context.user_data['name'] = full_name.strip() or "Пользователь"

    # Remove keyboard
    await update.message.reply_text(
        "✅ Контакт получен!",
        reply_markup=ReplyKeyboardRemove()
    )

    if step == 'trainer_contact':
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

    elif step == 'client_contact':
        await complete_client_registration(update, context)


async def handle_text_input(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle text input during registration flow"""
    step = context.user_data.get('registration_step')

    if not step:
        return

    text = update.message.text

    # Only handle price input for trainers now
    if step == 'trainer_price':
        try:
            price = int(text)
            context.user_data['price'] = price
            # Complete registration
            await complete_trainer_registration(update, context)
        except ValueError:
            await update.message.reply_text("Пожалуйста, введите число (например: 2000)")


async def complete_trainer_registration(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Complete trainer registration"""
    user = update.effective_user
    trainer_id = str(user.id)

    # Save to database
    try:
        trainer = await reg_service.register_trainer(
            telegram_id=trainer_id,
            telegram_username=user.username,
            telegram_first_name=context.user_data.get('first_name') or user.first_name,
            telegram_last_name=context.user_data.get('last_name') or user.last_name,
            name=context.user_data.get('name'),
            phone=context.user_data.get('phone'),
            price=context.user_data.get('price'),
            club_id=context.user_data.get('club_id')
        )
    except Exception as e:
        await update.message.reply_text(
            "❌ Произошла ошибка при регистрации. Попробуйте позже.",
            parse_mode='Markdown'
        )
        return

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
    user = update.effective_user
    client_id = str(user.id)
    trainer_id = context.user_data.get('trainer_id')

    # Save to database
    try:
        client = await reg_service.register_client(
            telegram_id=client_id,
            telegram_username=user.username,
            telegram_first_name=context.user_data.get('first_name') or user.first_name,
            telegram_last_name=context.user_data.get('last_name') or user.last_name,
            name=context.user_data.get('name'),
            phone=context.user_data.get('phone'),
            trainer_id=trainer_id
        )
    except Exception as e:
        await update.message.reply_text(
            "❌ Произошла ошибка при регистрации. Попробуйте позже.",
            parse_mode='Markdown'
        )
        return

    # Show WebApp buttons for client
    from telegram import WebAppInfo
    keyboard = [
        [InlineKeyboardButton(
            "📅 Мои тренировки",
            web_app=WebAppInfo(url=f"https://trenergram.ru/app/client/{client_id}")
        )],
        [InlineKeyboardButton(
            "⚙️ Настройки",
            web_app=WebAppInfo(url=f"https://trenergram.ru/app/client/{client_id}/settings")
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        "✅ *Регистрация завершена!*\n\n"
        "Теперь вы можете записываться на тренировки.\n\n"
        "Используйте кнопки ниже для управления тренировками.",
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )