// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;

// API Configuration
const API_BASE_URL = 'https://trenergram.ru/api/v1';

// Get trainer ID from URL or Telegram user
const pathParts = window.location.pathname.split('/');
const trainerId = pathParts[pathParts.length - 1] || tg.initDataUnsafe?.user?.id;

// Expand the app
tg.ready();
tg.expand();

// Set theme colors
document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#3390ec');
document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#3390ec');
document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');

// Global variables
let currentDate = new Date();
let clients = [];
let bookings = [];
let trainerData = {};

// Load trainer data on page load
window.addEventListener('DOMContentLoaded', () => {
    if (trainerId) {
        loadTrainerData();
        loadSchedule();
    }
});

// API Functions
async function loadTrainerData() {
    try {
        // Load trainer info with clients
        const trainerResponse = await fetch(`${API_BASE_URL}/users/trainer/${trainerId}`);
        if (trainerResponse.ok) {
            trainerData = await trainerResponse.json();
            clients = trainerData.clients || [];
            updateDashboard();
        }
    } catch (error) {
        console.error('Failed to load trainer data:', error);
    }
}

async function loadSchedule() {
    try {
        // Format date for API
        const dateStr = currentDate.toISOString().split('T')[0];

        // Load bookings for the current date
        const bookingsResponse = await fetch(`${API_BASE_URL}/bookings/trainer/${trainerId}`);
        if (bookingsResponse.ok) {
            const allBookings = await bookingsResponse.json();
            // Filter bookings for current date
            bookings = allBookings.filter(b => {
                const bookingDate = new Date(b.datetime);
                return bookingDate.toDateString() === currentDate.toDateString();
            });
            displaySchedule();
        }
    } catch (error) {
        console.error('Failed to load schedule:', error);
    }

    // Update date display
    updateDateDisplay();
}

// Update dashboard with trainer data
function updateDashboard() {
    // Update clients count
    const clientsCount = document.querySelector('.stats-item:nth-child(1) .stats-value');
    if (clientsCount) {
        clientsCount.textContent = clients.length;
    }

    // Update today's trainings count
    const todayCount = document.querySelector('.stats-item:nth-child(2) .stats-value');
    if (todayCount) {
        const todayBookings = bookings.filter(b => b.status !== 'CANCELLED').length;
        todayCount.textContent = todayBookings;
    }

    // Update this month's income (if available)
    const incomeElement = document.querySelector('.stats-item:nth-child(3) .stats-value');
    if (incomeElement && trainerData.monthly_income) {
        incomeElement.textContent = `${trainerData.monthly_income} ₽`;
    }
}

// Update date display
function updateDateDisplay() {
    const dateElement = document.querySelector('.date');
    if (dateElement) {
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        dateElement.textContent = currentDate.toLocaleDateString('ru-RU', options);
    }
}

// Display schedule
function displaySchedule() {
    const slotsContainer = document.querySelector('.time-slots');
    if (!slotsContainer) return;

    slotsContainer.innerHTML = '';

    // Generate time slots from 8:00 to 21:00
    for (let hour = 8; hour <= 21; hour++) {
        const slot = document.createElement('div');
        slot.className = 'time-slot';

        const time = `${hour}:00`;
        const booking = bookings.find(b => {
            const bookingTime = new Date(b.datetime);
            return bookingTime.getHours() === hour && bookingTime.getMinutes() === 0;
        });

        if (booking) {
            slot.classList.add('booked');
            slot.innerHTML = `
                <div class="time">${time}</div>
                <div class="booking-info">
                    <div class="client-name">${booking.client_name || 'Клиент'}</div>
                    <div class="booking-type">${booking.service_name || 'Тренировка'}</div>
                    ${booking.status === 'CANCELLED' ? '<div class="cancelled">Отменено</div>' : ''}
                </div>
            `;
            slot.onclick = () => showBookingDetails(booking);
        } else {
            slot.classList.add('available');
            slot.innerHTML = `
                <div class="time">${time}</div>
                <div class="available-text">Свободно</div>
            `;
            slot.onclick = () => bookSlot(time);
        }

        slotsContainer.appendChild(slot);
    }
}

// Show booking details
function showBookingDetails(booking) {
    const bookingDate = new Date(booking.datetime);
    const timeStr = bookingDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const message = `
Клиент: ${booking.client_name || 'Не указан'}
Время: ${timeStr}
Услуга: ${booking.service_name || 'Тренировка'}
Длительность: ${booking.duration || 60} мин
${booking.price ? `Стоимость: ${booking.price} ₽` : ''}
Статус: ${getStatusText(booking.status)}
${booking.notes ? `\nКомментарий: ${booking.notes}` : ''}
    `.trim();

    const buttons = [];

    if (booking.status === 'PENDING' || booking.status === 'CONFIRMED') {
        buttons.push({id: 'cancel', type: 'destructive', text: 'Отменить'});
    }

    if (booking.client_telegram_username) {
        buttons.push({id: 'contact', type: 'default', text: 'Написать клиенту'});
    }

    buttons.push({type: 'cancel'});

    tg.showPopup({
        title: 'Детали записи',
        message: message,
        buttons: buttons
    }, (buttonId) => {
        if (buttonId === 'cancel') {
            cancelBooking(booking.id);
        } else if (buttonId === 'contact' && booking.client_telegram_username) {
            tg.openLink(`https://t.me/${booking.client_telegram_username}`);
        }
    });
}

// Get status text
function getStatusText(status) {
    switch(status.toUpperCase()) {
        case 'CONFIRMED': return 'Подтверждено';
        case 'PENDING': return 'Ожидание';
        case 'CANCELLED': return 'Отменено';
        case 'COMPLETED': return 'Завершено';
        default: return status;
    }
}

// Cancel booking
async function cancelBooking(bookingId) {
    tg.showConfirm('Вы уверены, что хотите отменить запись?', async (confirmed) => {
        if (!confirmed) return;

        try {
            const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}?telegram_id=${trainerId}&reason=Отменено тренером`, {
                method: 'DELETE'
            });

            if (response.ok) {
                tg.showAlert('Запись успешно отменена');
                loadSchedule(); // Reload schedule
            } else {
                tg.showAlert('Не удалось отменить запись');
            }
        } catch (error) {
            console.error('Failed to cancel booking:', error);
            tg.showAlert('Ошибка при отмене записи');
        }
    });
}

// Show clients
function showClients() {
    if (clients.length === 0) {
        tg.showAlert('У вас пока нет клиентов. Поделитесь своей ссылкой для привлечения клиентов.');
        return;
    }

    let clientsList = 'Ваши клиенты:\n\n';
    clients.forEach(client => {
        clientsList += `• ${client.name || 'Клиент'}\n`;
    });

    tg.showPopup({
        title: `Клиенты (${clients.length})`,
        message: clientsList,
        buttons: [
            {id: 'invite', type: 'default', text: 'Пригласить клиента'},
            {type: 'close'}
        ]
    }, (buttonId) => {
        if (buttonId === 'invite') {
            showLink();
        }
    });
}

// Show personal link
function showLink() {
    const link = `https://t.me/trenergram_bot?start=trainer_${trainerId}`;

    tg.showPopup({
        title: 'Ваша персональная ссылка',
        message: `Поделитесь этой ссылкой с клиентами:\n\n${link}`,
        buttons: [
            {id: 'copy', type: 'default', text: 'Копировать'},
            {id: 'share', type: 'default', text: 'Поделиться'},
            {type: 'cancel'}
        ]
    }, (buttonId) => {
        if (buttonId === 'copy') {
            navigator.clipboard.writeText(link);
            tg.showAlert('Ссылка скопирована!');
        } else if (buttonId === 'share') {
            const text = `Записывайтесь на тренировки: ${link}`;
            tg.switchInlineQuery(text, ['users', 'groups', 'channels']);
        }
    });
}

// Show statistics
function showStats() {
    const stats = `
Всего клиентов: ${clients.length}
Тренировок сегодня: ${bookings.filter(b => b.status !== 'CANCELLED').length}
Тренировок в этом месяце: ${trainerData.monthly_bookings || 0}
${trainerData.monthly_income ? `Доход в этом месяце: ${trainerData.monthly_income} ₽` : ''}
    `.trim();

    tg.showPopup({
        title: 'Статистика',
        message: stats,
        buttons: [{type: 'close'}]
    });
}

// Show settings
function showSettings() {
    tg.showPopup({
        title: 'Настройки',
        message: 'Выберите параметр для настройки',
        buttons: [
            {id: 'schedule', type: 'default', text: 'Расписание'},
            {id: 'services', type: 'default', text: 'Услуги и цены'},
            {id: 'notifications', type: 'default', text: 'Уведомления'},
            {type: 'cancel'}
        ]
    }, (buttonId) => {
        if (buttonId) {
            tg.showAlert(`Настройка "${buttonId}" будет доступна в ближайшее время`);
        }
    });
}

// Navigate date
function selectDate(direction) {
    currentDate.setDate(currentDate.getDate() + direction);
    loadSchedule();
}

// Book time slot
function bookSlot(time) {
    if (clients.length === 0) {
        tg.showAlert('У вас пока нет клиентов. Сначала пригласите клиентов по вашей персональной ссылке.');
        showLink();
        return;
    }

    tg.showPopup({
        title: 'Записать на ' + time,
        message: 'Выберите клиента для записи',
        buttons: [
            {id: 'select', type: 'default', text: 'Выбрать из списка'},
            {id: 'new', type: 'default', text: 'Новый клиент'},
            {type: 'cancel'}
        ]
    }, (buttonId) => {
        if (buttonId === 'select') {
            selectClientForBooking(time);
        } else if (buttonId === 'new') {
            tg.showAlert('Для добавления нового клиента поделитесь своей ссылкой');
            showLink();
        }
    });
}

// Select client for booking
function selectClientForBooking(time) {
    const buttons = clients.slice(0, 5).map(client => ({
        id: client.telegram_id.toString(),
        type: 'default',
        text: client.name || 'Клиент'
    }));

    buttons.push({type: 'cancel'});

    tg.showPopup({
        title: 'Выберите клиента',
        message: `Запись на ${time}`,
        buttons: buttons
    }, async (clientId) => {
        if (clientId && clientId !== 'cancel') {
            await createBooking(clientId, time);
        }
    });
}

// Create booking
async function createBooking(clientId, time) {
    try {
        const [hour, minute] = time.split(':');
        const bookingDate = new Date(currentDate);
        bookingDate.setHours(parseInt(hour), parseInt(minute), 0, 0);

        const bookingData = {
            trainer_telegram_id: parseInt(trainerId),
            client_telegram_id: parseInt(clientId),
            datetime: bookingDate.toISOString(),
            duration: 60,
            status: 'CONFIRMED'
        };

        const response = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });

        if (response.ok) {
            tg.showAlert('Запись успешно создана!');
            loadSchedule(); // Reload schedule
        } else {
            const error = await response.json();
            tg.showAlert(`Ошибка: ${error.detail || 'Не удалось создать запись'}`);
        }
    } catch (error) {
        console.error('Failed to create booking:', error);
        tg.showAlert('Ошибка при создании записи');
    }
}

// Add booking (main button)
function addBooking() {
    bookSlot(new Date().getHours() + ':00');
}

// Handle back button
tg.BackButton.show();
tg.BackButton.onClick(() => {
    tg.close();
});

// Handle main button
tg.MainButton.setText('Записать клиента');
tg.MainButton.show();
tg.MainButton.onClick(() => {
    addBooking();
});