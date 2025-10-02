// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;

// API Configuration
const API_BASE_URL = 'https://trenergram.ru/api/v1';

// Get client ID from URL or Telegram user
const pathParts = window.location.pathname.split('/');
const clientId = pathParts[pathParts.length - 1] || tg.initDataUnsafe?.user?.id;

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
let trainers = [];
let bookings = [];

// Load client data on page load
window.addEventListener('DOMContentLoaded', () => {
    if (clientId) {
        loadClientData();
    }
});

// API Functions
async function loadClientData() {
    try {
        // Load client info with trainers
        const clientResponse = await fetch(`${API_BASE_URL}/users/client/${clientId}`);
        if (clientResponse.ok) {
            const clientData = await clientResponse.json();
            trainers = clientData.trainers || [];
            displayTrainers();
        }

        // Load bookings
        const bookingsResponse = await fetch(`${API_BASE_URL}/bookings/client/${clientId}`);
        if (bookingsResponse.ok) {
            bookings = await bookingsResponse.json();
            displayBookings();
        }
    } catch (error) {
        console.error('Failed to load client data:', error);
    }
}

// Display trainers
function displayTrainers() {
    const trainersContainer = document.getElementById('trainers-list');
    if (!trainersContainer) return;

    trainersContainer.innerHTML = '';

    if (trainers.length === 0) {
        trainersContainer.innerHTML = '<div class="empty-state">У вас пока нет тренеров</div>';
        return;
    }

    trainers.forEach(trainer => {
        const trainerCard = document.createElement('div');
        trainerCard.className = 'trainer-card';
        trainerCard.onclick = () => selectTrainer(trainer.telegram_id);

        trainerCard.innerHTML = `
            <div class="trainer-avatar">${trainer.name ? trainer.name[0] : 'T'}</div>
            <div class="trainer-info">
                <div class="trainer-name">${trainer.name || 'Тренер'}</div>
                <div class="trainer-specialization">${trainer.specialization || ''}</div>
                ${trainer.price ? `<div class="trainer-price">${trainer.price} ₽</div>` : ''}
            </div>
        `;

        trainersContainer.appendChild(trainerCard);
    });
}

// Display bookings
function displayBookings() {
    const upcomingContainer = document.getElementById('upcoming-bookings');
    const pastContainer = document.getElementById('past-bookings');

    if (!upcomingContainer || !pastContainer) return;

    const now = new Date();
    const upcomingBookings = bookings.filter(b => new Date(b.datetime) >= now && b.status !== 'CANCELLED');
    const pastBookings = bookings.filter(b => new Date(b.datetime) < now || b.status === 'CANCELLED');

    // Display upcoming bookings
    upcomingContainer.innerHTML = '';
    if (upcomingBookings.length === 0) {
        upcomingContainer.innerHTML = '<div class="empty-state">Нет предстоящих тренировок</div>';
    } else {
        upcomingBookings.forEach(booking => {
            const bookingCard = createBookingCard(booking);
            upcomingContainer.appendChild(bookingCard);
        });
    }

    // Display past bookings
    pastContainer.innerHTML = '';
    if (pastBookings.length === 0) {
        pastContainer.innerHTML = '<div class="empty-state">Нет прошедших тренировок</div>';
    } else {
        pastBookings.forEach(booking => {
            const bookingCard = createBookingCard(booking);
            pastContainer.appendChild(bookingCard);
        });
    }
}

// Create booking card
function createBookingCard(booking) {
    const card = document.createElement('div');
    card.className = 'booking-card';
    card.onclick = () => showBookingDetails(booking);

    const bookingDate = new Date(booking.datetime);
    const dateStr = bookingDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = bookingDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    card.innerHTML = `
        <div class="booking-header">
            <div class="booking-trainer">
                <div class="trainer-avatar">${booking.trainer_name ? booking.trainer_name[0] : 'T'}</div>
                <div class="trainer-info">
                    <div class="trainer-name">${booking.trainer_name || 'Тренер'}</div>
                </div>
            </div>
            <div class="booking-status ${booking.status.toLowerCase()}">
                ${getStatusText(booking.status)}
            </div>
        </div>
        <div class="booking-details">
            <div class="booking-detail">📅 ${dateStr}</div>
            <div class="booking-detail">🕐 ${timeStr}</div>
            ${booking.price ? `<div class="booking-detail">💰 ${booking.price} ₽</div>` : ''}
        </div>
    `;

    return card;
}

// Get status text
function getStatusText(status) {
    switch(status.toUpperCase()) {
        case 'CONFIRMED': return '✅ Подтверждено';
        case 'PENDING': return '⏳ Ожидание';
        case 'CANCELLED': return '❌ Отменено';
        case 'COMPLETED': return '✓ Завершено';
        default: return status;
    }
}

// Tab switching
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// Select trainer
function selectTrainer(trainerId) {
    tg.showPopup({
        title: 'Выберите действие',
        message: 'Что вы хотите сделать?',
        buttons: [
            {id: 'book', type: 'default', text: 'Записаться на тренировку'},
            {id: 'contact', type: 'default', text: 'Написать тренеру'},
            {id: 'schedule', type: 'default', text: 'Посмотреть расписание'},
            {type: 'cancel'}
        ]
    }, (buttonId) => {
        if (buttonId === 'book') {
            bookTraining(trainerId);
        } else if (buttonId === 'contact') {
            contactTrainer(trainerId);
        } else if (buttonId === 'schedule') {
            showTrainerSchedule(trainerId);
        }
    });
}

// Book training
function bookTraining(trainerId) {
    const trainer = trainers.find(t => t.telegram_id === trainerId);
    if (!trainer) return;

    tg.showAlert(`Функция записи к тренеру ${trainer.name} будет доступна в ближайшее время`);
}

// Contact trainer
function contactTrainer(trainerId) {
    const trainer = trainers.find(t => t.telegram_id === trainerId);
    if (trainer && trainer.telegram_username) {
        tg.openLink(`https://t.me/${trainer.telegram_username}`);
    }
}

// Show trainer schedule
function showTrainerSchedule(trainerId) {
    const trainer = trainers.find(t => t.telegram_id === trainerId);
    if (!trainer) return;

    tg.showAlert(`Расписание тренера ${trainer.name} будет доступно в ближайшее время`);
}

// Show booking details
function showBookingDetails(booking) {
    const bookingDate = new Date(booking.datetime);
    const dateStr = bookingDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = bookingDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const message = `
Тренер: ${booking.trainer_name || 'Не указан'}
Дата: ${dateStr}
Время: ${timeStr}
Длительность: ${booking.duration || 60} мин
${booking.price ? `Стоимость: ${booking.price} ₽` : ''}
Статус: ${getStatusText(booking.status)}
${booking.notes ? `\nКомментарий: ${booking.notes}` : ''}
    `.trim();

    const buttons = [];

    // Add action buttons based on booking status
    if (booking.status === 'PENDING' || booking.status === 'CONFIRMED') {
        if (new Date(booking.datetime) > new Date()) {
            buttons.push({id: 'cancel', type: 'destructive', text: 'Отменить запись'});
        }
    }

    if (booking.trainer_telegram_username) {
        buttons.push({id: 'contact', type: 'default', text: 'Связаться с тренером'});
    }

    buttons.push({type: 'cancel'});

    tg.showPopup({
        title: 'Детали записи',
        message: message,
        buttons: buttons
    }, (buttonId) => {
        if (buttonId === 'cancel') {
            cancelBooking(booking.id);
        } else if (buttonId === 'contact' && booking.trainer_telegram_username) {
            tg.openLink(`https://t.me/${booking.trainer_telegram_username}`);
        }
    });
}

// Cancel booking
async function cancelBooking(bookingId) {
    tg.showConfirm('Вы уверены, что хотите отменить запись?', async (confirmed) => {
        if (!confirmed) return;

        try {
            const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}?telegram_id=${clientId}&reason=Отменено клиентом`, {
                method: 'DELETE'
            });

            if (response.ok) {
                tg.showAlert('Запись успешно отменена');
                loadClientData(); // Reload data
            } else {
                tg.showAlert('Не удалось отменить запись');
            }
        } catch (error) {
            console.error('Failed to cancel booking:', error);
            tg.showAlert('Ошибка при отмене записи');
        }
    });
}

// Add new trainer
function addTrainer() {
    tg.showAlert('Для добавления тренера используйте ссылку от тренера или QR-код клуба');
}

// Settings
function openSettings() {
    tg.showAlert('Настройки будут доступны в ближайшее время');
}