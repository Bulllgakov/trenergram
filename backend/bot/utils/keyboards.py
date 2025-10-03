from telegram import InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup


def get_main_trainer_keyboard():
    """Get main keyboard for trainer"""
    keyboard = [
        [KeyboardButton("📅 Расписание"), KeyboardButton("👥 Клиенты")],
        [KeyboardButton("📊 Статистика"), KeyboardButton("⚙️ Настройки")],
        [KeyboardButton("🔗 Моя ссылка")]
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)


def get_main_client_keyboard():
    """Get main keyboard for client"""
    keyboard = [
        [KeyboardButton("📅 Записаться"), KeyboardButton("📋 Мои тренировки")],
        [KeyboardButton("💪 Мои тренеры"), KeyboardButton("❌ Отменить")]
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)


def get_specialization_keyboard():
    """Get specialization selection keyboard"""
    keyboard = [
        [
            InlineKeyboardButton("💪 Силовые", callback_data="spec_power"),
            InlineKeyboardButton("🏃 Кардио", callback_data="spec_cardio")
        ],
        [
            InlineKeyboardButton("🧘 Йога", callback_data="spec_yoga"),
            InlineKeyboardButton("🥊 Бокс", callback_data="spec_boxing")
        ],
        [
            InlineKeyboardButton("🏊 Плавание", callback_data="spec_swimming"),
            InlineKeyboardButton("🤸 Гимнастика", callback_data="spec_gymnastics")
        ],
        [InlineKeyboardButton("🎯 Другое", callback_data="spec_other")]
    ]
    return InlineKeyboardMarkup(keyboard)


def get_confirmation_keyboard():
    """Get yes/no confirmation keyboard"""
    keyboard = [
        [
            InlineKeyboardButton("✅ Да", callback_data="confirm_yes"),
            InlineKeyboardButton("❌ Нет", callback_data="confirm_no")
        ]
    ]
    return InlineKeyboardMarkup(keyboard)


def get_time_slots_keyboard(available_slots):
    """Get time slots keyboard for booking"""
    keyboard = []
    row = []

    for i, slot in enumerate(available_slots):
        row.append(InlineKeyboardButton(slot, callback_data=f"slot_{slot}"))

        if (i + 1) % 3 == 0:  # 3 buttons per row
            keyboard.append(row)
            row = []

    if row:  # Add remaining buttons
        keyboard.append(row)

    keyboard.append([InlineKeyboardButton("❌ Отмена", callback_data="cancel")])

    return InlineKeyboardMarkup(keyboard)