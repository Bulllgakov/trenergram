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

// Enable closing confirmation
tg.enableClosingConfirmation();

// Set theme colors
document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#3390ec');
document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#3390ec');
document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');

// Current date
let currentDate = new Date();
let trainerData = {};
let clients = [];
let bookings = [];

// Load data on page load
window.addEventListener('DOMContentLoaded', () => {
    if (trainerId) {
        loadTrainerData();
        loadSchedule();
    }
});

// Load trainer data
async function loadTrainerData() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/trainer/${trainerId}`);
        if (response.ok) {
            trainerData = await response.json();
            clients = trainerData.clients || [];
            updateClientsBadge();
        }
    } catch (error) {
        console.error('Failed to load trainer data:', error);
    }
}

// Load schedule for current date
async function loadSchedule() {
    try {
        const response = await fetch(`${API_BASE_URL}/bookings/trainer/${trainerId}`);
        if (response.ok) {
            const allBookings = await response.json();
            // Filter bookings for current date
            bookings = allBookings.filter(b => {
                const bookingDate = new Date(b.datetime);
                return bookingDate.toDateString() === currentDate.toDateString();
            });
            updateScheduleDisplay();
            updateHeaderStats();
        }
    } catch (error) {
        console.error('Failed to load schedule:', error);
    }
    updateDateDisplay();
}

// Update clients badge
function updateClientsBadge() {
    const badge = document.querySelector('.action-btn .badge');
    if (badge) {
        badge.textContent = clients.length;
    }
}

// Update header stats
function updateHeaderStats() {
    const confirmed = bookings.filter(b => b.status === 'CONFIRMED').length;
    const pending = bookings.filter(b => b.status === 'PENDING').length;

    // Calculate free slots (assuming 8 working hours)
    const totalSlots = 8;
    const busySlots = bookings.filter(b => b.status !== 'CANCELLED').length;
    const freeSlots = Math.max(0, totalSlots - busySlots);

    const headerStats = document.querySelector('.header-stats');
    if (headerStats) {
        headerStats.innerHTML = `
            <span class="stat confirmed">✅ ${confirmed}</span>
            <span class="stat pending">⏳ ${pending}</span>
            <span class="stat free">➕ ${freeSlots}</span>
        `;
    }
}

// Update date display
function updateDateDisplay() {
    const scheduleHeader = document.querySelector('.schedule-header h2');
    if (scheduleHeader) {
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        const dateStr = currentDate.toLocaleDateString('ru-RU', options).toUpperCase();
        scheduleHeader.textContent = dateStr;
    }

    // Update date pills
    updateDatePills();
}

// Update date pills
function updateDatePills() {
    const datePills = document.querySelector('.date-pills');
    if (!datePills) return;

    datePills.innerHTML = '';

    for (let i = -2; i <= 2; i++) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() + i);

        const pill = document.createElement('button');
        pill.className = 'date-pill';
        if (i === 0) pill.classList.add('active');

        const weekday = date.toLocaleDateString('ru-RU', { weekday: 'short' });
        const day = date.getDate();
        pill.textContent = `${weekday} ${day}`;
        pill.onclick = () => {
            currentDate = date;
            loadSchedule();
        };

        datePills.appendChild(pill);
    }
}

// Update schedule display
function updateScheduleDisplay() {
    const scheduleItems = document.querySelector('.schedule-items');
    if (!scheduleItems) return;

    scheduleItems.innerHTML = '';

    // Define working hours
    const workingHours = [9, 10, 11, 12, 15, 16, 17, 18];

    workingHours.forEach(hour => {
        const timeStr = `${hour}:00`;
        const booking = bookings.find(b => {
            const bookingDate = new Date(b.datetime);
            return bookingDate.getHours() === hour;
        });

        const scheduleItem = document.createElement('div');

        if (booking) {
            scheduleItem.className = `schedule-item ${booking.status.toLowerCase()}`;
            scheduleItem.innerHTML = `
                <div class="time">${timeStr}</div>
                <div class="client-info">
                    <div class="client-name">${booking.client_name || 'Клиент'}</div>
                    <div class="client-status">${getStatusText(booking.status)}</div>
                </div>
                <button class="item-action" onclick="handleBookingAction(${booking.id}, '${booking.status}')">${getActionIcon(booking.status)}</button>
            `;
        } else {
            scheduleItem.className = 'schedule-item free';
            scheduleItem.innerHTML = `
                <div class="time">${timeStr}</div>
                <div class="client-info">
                    <div class="free-slot">СВОБОДНО</div>
                </div>
                <button class="item-action" onclick="bookSlot('${timeStr}')">➕</button>
            `;
        }

        scheduleItems.appendChild(scheduleItem);
    });
}

// Get status text
function getStatusText(status) {
    switch(status.toUpperCase()) {
        case 'CONFIRMED': return 'Подтверждено';
        case 'PENDING': return 'Ожидает подтверждения';
        case 'CANCELLED': return 'Отменено';
        case 'COMPLETED': return 'Завершено';
        default: return status;
    }
}

// Get action icon based on status
function getActionIcon(status) {
    switch(status.toUpperCase()) {
        case 'CONFIRMED': return '💬';
        case 'PENDING': return '✓';
        case 'CANCELLED': return '↻';
        default: return '•';
    }
}

// Handle booking action
function handleBookingAction(bookingId, status) {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    if (status === 'CONFIRMED') {
        // Open chat with client
        if (booking.client_telegram_username) {
            tg.openLink(`https://t.me/${booking.client_telegram_username}`);
        } else {
            tg.showAlert('У клиента нет username для связи');
        }
    } else if (status === 'PENDING') {
        // Confirm booking
        confirmBooking(bookingId);
    }
}

// Confirm booking
async function confirmBooking(bookingId) {
    tg.showConfirm('Подтвердить запись?', async (confirmed) => {
        if (!confirmed) return;

        try {
            const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    telegram_id: trainerId
                })
            });

            if (response.ok) {
                tg.showAlert('Запись подтверждена');
                loadSchedule(); // Reload schedule
            } else {
                tg.showAlert('Не удалось подтвердить запись');
            }
        } catch (error) {
            console.error('Failed to confirm booking:', error);
            tg.showAlert('Ошибка при подтверждении записи');
        }
    });
}

// Functions
function showClients() {
    if (clients.length === 0) {
        tg.showAlert('У вас пока нет клиентов. Поделитесь своей ссылкой для привлечения клиентов.');
        showLink();
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

function showLink() {
    const link = `https://t.me/trenergram_bot?start=trainer_${trainerId}`;

    tg.showPopup({
        title: 'Ваша персональная ссылка',
        message: link,
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
            tg.switchInlineQuery(link, ['users', 'groups', 'channels']);
        }
    });
}

function showStats() {
    const totalBookings = bookings.length;
    const confirmed = bookings.filter(b => b.status === 'CONFIRMED').length;
    const pending = bookings.filter(b => b.status === 'PENDING').length;

    const stats = `
Клиентов: ${clients.length}
Записей сегодня: ${totalBookings}
Подтверждено: ${confirmed}
Ожидают: ${pending}
${trainerData.monthly_income ? `Доход за месяц: ${trainerData.monthly_income} ₽` : ''}
    `.trim();

    tg.showPopup({
        title: 'Статистика',
        message: stats,
        buttons: [{type: 'close'}]
    });
}

function showSettings() {
    tg.showAlert('Настройки будут доступны в ближайшее время');
}

function selectDate(direction) {
    currentDate.setDate(currentDate.getDate() + direction);
    loadSchedule();
}

function bookSlot(time) {
    if (clients.length === 0) {
        tg.showAlert('У вас пока нет клиентов. Сначала пригласите клиентов по вашей персональной ссылке.');
        showLink();
        return;
    }

    tg.showPopup({
        title: 'Записать клиента',
        message: `Выберите клиента для записи на ${time}`,
        buttons: [
            {id: 'existing', type: 'default', text: 'Существующий клиент'},
            {id: 'new', type: 'default', text: 'Новый клиент'},
            {type: 'cancel'}
        ]
    }, (buttonId) => {
        if (buttonId === 'existing') {
            selectClientForBooking(time);
        } else if (buttonId === 'new') {
            tg.showAlert('Для добавления нового клиента поделитесь своей ссылкой');
            showLink();
        }
    });
}

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
            status: 'CONFIRMED',
            created_by: 'trainer'
        };

        const response = await fetch('https://trenergram.ru/api/v1/bookings/', {
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