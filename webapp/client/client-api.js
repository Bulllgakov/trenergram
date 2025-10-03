// API Integration for Client Mini App
// Preserves the original Telegram-style design

const API_BASE_URL = 'https://trenergram.ru/api/v1';

// Get client ID from URL or Telegram user
const pathParts = window.location.pathname.split('/');
const clientId = pathParts[pathParts.length - 1] || (window.Telegram?.WebApp?.initDataUnsafe?.user?.id);

// Global data storage
let clientData = {};
let trainers = [];
let bookings = [];

// Initialize API integration
async function initializeAPI() {
    if (!clientId) {
        console.error('No client ID found');
        return;
    }

    // Load client data
    await loadClientData();

    // Update UI with real data
    updateUIWithData();
}

// Load client data
async function loadClientData() {
    try {
        // Load client info with trainers
        const clientResponse = await fetch(`${API_BASE_URL}/users/client/${clientId}`);
        if (clientResponse.ok) {
            clientData = await clientResponse.json();
            trainers = clientData.trainers || [];
            console.log('Client data loaded:', clientData);
        }

        // Load bookings
        const bookingsResponse = await fetch(`${API_BASE_URL}/bookings/client/${clientId}`);
        if (bookingsResponse.ok) {
            bookings = await bookingsResponse.json();
            console.log('Bookings loaded:', bookings);
        }
    } catch (error) {
        console.error('Failed to load client data:', error);
    }
}

// Update UI with real data
function updateUIWithData() {
    // Update header stats
    updateHeaderStats();

    // Update trainers count
    updateTrainersBadge();

    // Update bookings display
    updateBookingsDisplay();

    // Update my trainers list
    updateMyTrainersList();
}

// Update header statistics
function updateHeaderStats() {
    const now = new Date();
    const upcomingBookings = bookings.filter(b => new Date(b.datetime) >= now && b.status !== 'CANCELLED');
    const thisWeekBookings = upcomingBookings.filter(b => {
        const bookingDate = new Date(b.datetime);
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        return bookingDate <= weekFromNow;
    });

    const headerSubtitle = document.getElementById('headerSubtitle');
    if (headerSubtitle) {
        const upcoming = upcomingBookings.length;
        const thisWeek = thisWeekBookings.length;
        headerSubtitle.textContent = `${upcoming} предстоящие • ${thisWeek} на этой неделе`;
    }
}

// Update trainers badge
function updateTrainersBadge() {
    const badge = document.querySelector('.quick-action .badge.info');
    if (badge) {
        badge.textContent = trainers.length;
    }
}

// Update bookings display
function updateBookingsDisplay() {
    const upcomingTab = document.getElementById('upcomingTab');
    if (!upcomingTab) return;

    // Clear current content
    upcomingTab.innerHTML = '';

    const now = new Date();
    const upcomingBookings = bookings.filter(b => new Date(b.datetime) >= now && b.status !== 'CANCELLED')
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

    if (upcomingBookings.length === 0) {
        upcomingTab.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                <div class="empty-title">Нет предстоящих тренировок</div>
                <div class="empty-description">Запишитесь к тренеру на занятие</div>
            </div>
        `;
        return;
    }

    // Group bookings by date
    const bookingsByDate = {};
    upcomingBookings.forEach(booking => {
        const date = new Date(booking.datetime).toDateString();
        if (!bookingsByDate[date]) {
            bookingsByDate[date] = [];
        }
        bookingsByDate[date].push(booking);
    });

    // Display bookings grouped by date
    Object.entries(bookingsByDate).forEach(([dateStr, dateBookings]) => {
        const date = new Date(dateStr);
        const isToday = date.toDateString() === new Date().toDateString();
        const isTomorrow = date.toDateString() === new Date(Date.now() + 86400000).toDateString();

        let sectionTitle;
        if (isToday) {
            sectionTitle = 'СЕГОДНЯ';
        } else if (isTomorrow) {
            sectionTitle = 'ЗАВТРА';
        } else {
            sectionTitle = date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
        }

        // Add section header
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'section-header';
        sectionHeader.textContent = sectionTitle;
        upcomingTab.appendChild(sectionHeader);

        // Add bookings section
        const bookingsSection = document.createElement('div');
        bookingsSection.className = 'bookings-section';

        dateBookings.forEach(booking => {
            const bookingCard = createBookingCard(booking, isToday);
            bookingsSection.appendChild(bookingCard);
        });

        upcomingTab.appendChild(bookingsSection);
    });
}

// Create booking card
function createBookingCard(booking, highlight = false) {
    const card = document.createElement('div');
    card.className = `booking-card${highlight ? ' highlight' : ''}`;
    card.onclick = () => openBookingDetailsAPI(booking);

    const bookingDate = new Date(booking.datetime);
    const timeStr = bookingDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(bookingDate.getTime() + (booking.duration || 60) * 60000);
    const endTimeStr = endTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const timeRangeStr = `${timeStr} - ${endTimeStr}`;

    const statusIcon = getStatusIcon(booking.status);
    const statusClass = getStatusClass(booking.status);

    // Add notification dot for pending confirmations
    const notificationDot = booking.status === 'PENDING' ? '<div class="notification-dot"></div>' : '';

    card.innerHTML = `
        ${notificationDot}
        <div class="booking-date">
            <div class="booking-time">${timeRangeStr}</div>
        </div>
        <div class="booking-info">
            <div class="booking-trainer">${booking.trainer_name || 'Тренер'}</div>
            <div class="booking-details">${booking.service_name || 'Тренировка'}</div>
            ${booking.location ? `<div class="booking-location">📍 ${booking.location}</div>` : ''}
        </div>
        <div class="booking-status">
            <div class="status-icon ${statusClass}">${statusIcon}</div>
        </div>
    `;

    return card;
}

// Get status class
function getStatusClass(status) {
    switch(status.toUpperCase()) {
        case 'CONFIRMED': return 'confirmed';
        case 'PENDING': return 'pending';
        case 'CANCELLED': return 'cancelled';
        case 'COMPLETED': return 'completed';
        default: return '';
    }
}

// Get status icon
function getStatusIcon(status) {
    switch(status.toUpperCase()) {
        case 'CONFIRMED': return '✓';
        case 'PENDING': return '!';
        case 'CANCELLED': return '✗';
        case 'COMPLETED': return '✓';
        default: return '•';
    }
}

// Open booking details with API data
function openBookingDetailsAPI(booking) {
    selectedBooking = booking;

    // Update booking details in the sheet
    const bookingDate = new Date(booking.datetime);
    const dateStr = bookingDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = bookingDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(bookingDate.getTime() + (booking.duration || 60) * 60000)
        .toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    // Update trainer info
    const trainer = trainers.find(t => t.telegram_id === booking.trainer_telegram_id) || {};
    const trainerInitials = (booking.trainer_name || 'T').split(' ').map(n => n[0]).join('').toUpperCase();

    document.getElementById('detailsTrainerAvatar').textContent = trainerInitials;
    document.getElementById('detailsTrainerName').textContent = booking.trainer_name || 'Тренер';
    document.getElementById('detailsDate').textContent = dateStr;
    document.getElementById('detailsTime').textContent = `${timeStr} - ${endTime}`;
    document.getElementById('detailsType').textContent = booking.service_name || 'Тренировка';
    document.getElementById('detailsFormat').textContent = booking.format || 'Индивидуальная';
    document.getElementById('detailsLocation').textContent = booking.location || 'Не указано';
    document.getElementById('detailsAddress').textContent = booking.address || 'Не указан';
    document.getElementById('detailsPrice').textContent = `${booking.price || 0}₽`;

    // Update balance info
    const balance = trainer.balance || 0;
    document.getElementById('detailsBalance').textContent = `${balance.toLocaleString()}₽`;

    if (booking.status === 'PENDING') {
        document.getElementById('detailsPaymentStatus').textContent = 'Ожидает подтверждения';
    } else if (booking.status === 'CONFIRMED') {
        document.getElementById('detailsPaymentStatus').textContent = '✓ Будет списано со счета';
    } else {
        document.getElementById('detailsPaymentStatus').textContent = getStatusText(booking.status);
    }

    // Generate action buttons based on status
    const actionsContainer = document.getElementById('bookingActions');
    actionsContainer.innerHTML = '';

    if (booking.status === 'PENDING' || booking.status === 'CONFIRMED') {
        if (booking.status === 'PENDING') {
            actionsContainer.innerHTML += `
                <button class="action-button confirm" onclick="confirmBookingAPI(${booking.id})">
                    ✅ Подтвердить тренировку
                </button>
            `;
        }

        if (booking.trainer_telegram_username) {
            actionsContainer.innerHTML += `
                <button class="action-button primary" onclick="contactTrainerAPI('${booking.trainer_telegram_username}')">
                    💬 Написать тренеру
                </button>
            `;
        }

        if (new Date(booking.datetime) > new Date()) {
            actionsContainer.innerHTML += `
                <button class="action-button cancel" onclick="cancelBookingAPI(${booking.id})">
                    ❌ Отменить
                </button>
            `;
        }
    }

    openSheet('bookingDetailsSheet');
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

// Confirm booking via API
async function confirmBookingAPI(bookingId) {
    try {
        const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/confirm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                telegram_id: clientId
            })
        });

        if (response.ok) {
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
                window.Telegram.WebApp.showAlert('✅ Тренировка подтверждена!');
            }
            closeSheet('bookingDetailsSheet');

            // Reload data
            await loadClientData();
            updateUIWithData();
        } else {
            showNotification('❌ Не удалось подтвердить запись');
        }
    } catch (error) {
        console.error('Failed to confirm booking:', error);
        showNotification('❌ Ошибка при подтверждении записи');
    }
}

// Cancel booking via API
async function cancelBookingAPI(bookingId) {
    if (!confirm('Отменить тренировку?\n\n✅ Если вы еще не подтвердили - деньги не спишутся.\n❌ Если уже подтвердили - деньги НЕ вернутся.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}?telegram_id=${clientId}&reason=Отменено клиентом`, {
            method: 'DELETE'
        });

        if (response.ok) {
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
                window.Telegram.WebApp.showAlert('Тренировка отменена.');
            }
            closeSheet('bookingDetailsSheet');

            // Reload data
            await loadClientData();
            updateUIWithData();
        } else {
            showNotification('❌ Не удалось отменить запись');
        }
    } catch (error) {
        console.error('Failed to cancel booking:', error);
        showNotification('❌ Ошибка при отмене записи');
    }
}

// Contact trainer via Telegram
function contactTrainerAPI(username) {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.openLink(`https://t.me/${username}`);
    }
}

// Update my trainers list in the sheet
function updateMyTrainersList() {
    // This will be called when the sheet opens
}

// Override showMyTrainers to update with real data
const originalShowMyTrainers = window.showMyTrainers;
window.showMyTrainers = function() {
    // First update the trainers list
    const trainersGrid = document.querySelector('#myTrainersListSheet .trainers-grid');
    if (trainersGrid && trainers.length > 0) {
        trainersGrid.innerHTML = '';

        trainers.forEach(trainer => {
            const initials = (trainer.name || 'T').split(' ').map(n => n[0]).join('').toUpperCase();
            const balance = trainer.balance || 0;
            const balanceStyle = balance < 0 ? 'color: var(--tg-theme-destructive-text-color);' : '';
            const balanceText = balance < 0 ? `💰 ${balance}₽` : `💰 ${balance.toLocaleString()}₽`;

            const trainerCard = document.createElement('div');
            trainerCard.className = 'trainer-card';
            trainerCard.onclick = () => openTrainerProfileAPI(trainer);

            trainerCard.innerHTML = `
                <div class="trainer-avatar">${initials}</div>
                <div class="trainer-card-info">
                    <div class="trainer-card-name">${trainer.name || 'Тренер'}</div>
                    <div class="trainer-card-specialty">${trainer.specialization || ''}</div>
                    <div class="trainer-card-meta">
                        <span style="font-weight: 600; ${balanceStyle}">${balanceText}</span>
                        ${trainer.rating ? `<span>⭐ ${trainer.rating}</span>` : ''}
                    </div>
                </div>
                <div class="trainer-action">${balance <= 0 ? 'Пополнить' : 'Профиль'}</div>
            `;

            trainersGrid.appendChild(trainerCard);
        });
    }

    // Open the sheet
    openSheet('myTrainersListSheet');
};

// Open trainer profile with API data
function openTrainerProfileAPI(trainer) {
    const initials = (trainer.name || 'T').split(' ').map(n => n[0]).join('').toUpperCase();
    const balance = trainer.balance || 0;

    document.getElementById('profileTrainerAvatar').textContent = initials;
    document.getElementById('profileTrainerName').textContent = trainer.name || 'Тренер';
    document.getElementById('trainerBalance').textContent = `${balance.toLocaleString()}₽`;

    // Close trainers list sheet if open
    closeSheet('myTrainersListSheet');

    // Open profile sheet
    openSheet('trainerProfileSheet');
}

// Override selectTab to handle past bookings
const originalSelectTab = window.selectTab;
window.selectTab = function(element, tab) {
    // Call original function for UI update
    if (originalSelectTab) {
        originalSelectTab(element, tab);
    }

    if (tab === 'past') {
        updatePastBookings();
    } else if (tab === 'cancelled') {
        updateCancelledBookings();
    }
};

// Update past bookings
function updatePastBookings() {
    const pastTab = document.getElementById('pastTab');
    if (!pastTab) return;

    const now = new Date();
    const pastBookings = bookings.filter(b => new Date(b.datetime) < now || b.status === 'COMPLETED')
        .sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

    if (pastBookings.length === 0) {
        pastTab.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📜</div>
                <div class="empty-title">Нет прошедших тренировок</div>
                <div class="empty-description">Здесь будут отображаться ваши прошедшие тренировки</div>
            </div>
        `;
        return;
    }

    // Clear and update with real data
    pastTab.innerHTML = '';

    // Group by month
    const bookingsByMonth = {};
    pastBookings.forEach(booking => {
        const date = new Date(booking.datetime);
        const monthKey = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).toUpperCase();
        if (!bookingsByMonth[monthKey]) {
            bookingsByMonth[monthKey] = [];
        }
        bookingsByMonth[monthKey].push(booking);
    });

    Object.entries(bookingsByMonth).forEach(([month, monthBookings]) => {
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'section-header';
        sectionHeader.textContent = month;
        pastTab.appendChild(sectionHeader);

        const bookingsSection = document.createElement('div');
        bookingsSection.className = 'bookings-section';

        monthBookings.forEach(booking => {
            const bookingCard = createPastBookingCard(booking);
            bookingsSection.appendChild(bookingCard);
        });

        pastTab.appendChild(bookingsSection);
    });
}

// Create past booking card
function createPastBookingCard(booking) {
    const card = document.createElement('div');
    card.className = 'booking-card';
    card.onclick = () => openPastBookingDetailsAPI(booking);

    const bookingDate = new Date(booking.datetime);
    const day = bookingDate.getDate();
    const month = bookingDate.toLocaleDateString('ru-RU', { month: 'short' }).toUpperCase();

    card.innerHTML = `
        <div class="booking-date">
            <div class="booking-day">${day}</div>
            <div class="booking-month">${month}</div>
        </div>
        <div class="booking-info">
            <div class="booking-trainer">${booking.trainer_name || 'Тренер'}</div>
            <div class="booking-details">${booking.service_name || 'Тренировка'}</div>
            ${booking.location ? `<div class="booking-location">📍 ${booking.location}</div>` : ''}
        </div>
        <div class="booking-status">
            <div class="status-icon completed">✓</div>
        </div>
    `;

    return card;
}

// Open past booking details
function openPastBookingDetailsAPI(booking) {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.showAlert('Тренировка завершена!\n\nОставьте отзыв о тренере и получите 50 бонусных баллов 🎁');
    }
}

// Update cancelled bookings
function updateCancelledBookings() {
    const cancelledTab = document.getElementById('cancelledTab');
    if (!cancelledTab) return;

    const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED');

    if (cancelledBookings.length === 0) {
        cancelledTab.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎉</div>
                <div class="empty-title">Нет отмененных тренировок</div>
                <div class="empty-description">У вас нет отмененных тренировок за последний месяц</div>
            </div>
        `;
    }
}

// Helper function for notifications
function showNotification(message) {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.showAlert(message);
    } else {
        console.log('Notification:', message);
        alert(message);
    }
}

// Show trainer schedule with working hours
async function showTrainerScheduleAPI(trainerId) {
    try {
        // Load trainer schedule
        const scheduleResponse = await fetch(`${API_BASE_URL}/users/trainer/${trainerId}/schedule`);
        const bookingsResponse = await fetch(`${API_BASE_URL}/bookings/trainer/${trainerId}`);

        let workingHours = {};
        let trainerBookings = [];

        if (scheduleResponse.ok) {
            const schedules = await scheduleResponse.json();
            // Convert to working hours format
            schedules.forEach(schedule => {
                const day = schedule.day_of_week.toLowerCase();
                if (!schedule.is_break) {
                    workingHours[day] = {
                        isWorkingDay: schedule.is_active,
                        start: schedule.start_time,
                        end: schedule.end_time
                    };
                }
            });
        }

        if (bookingsResponse.ok) {
            trainerBookings = await bookingsResponse.json();
        }

        // Show schedule in a popup
        const today = new Date();
        const dayNames = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
        const currentDay = dayNames[today.getDay()];

        let scheduleText = 'Расписание тренера:\n\n';

        // Show next 7 days
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dayName = dayNames[date.getDay()];
            const dayData = workingHours[dayName] || {};

            if (dayData.isWorkingDay) {
                scheduleText += `${i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : dayName}: ${dayData.start} - ${dayData.end}\n`;

                // Count free slots based on session duration
                const dayBookings = trainerBookings.filter(b => {
                    const bookingDate = new Date(b.datetime);
                    return bookingDate.toDateString() === date.toDateString() && b.status !== 'CANCELLED';
                });

                // Calculate slots based on session duration (default 60 minutes)
                const sessionDuration = 60; // Will be loaded from trainer data in future
                const [startHour, startMin] = dayData.start.split(':').map(Number);
                const [endHour, endMin] = dayData.end.split(':').map(Number);
                const workMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin) - 60; // minus lunch
                const totalSlots = Math.floor(workMinutes / sessionDuration);
                const freeSlots = totalSlots - dayBookings.length;

                if (freeSlots > 0) {
                    scheduleText += `   Свободно: ${freeSlots} слотов\n`;
                } else {
                    scheduleText += `   Все занято\n`;
                }
            } else {
                if (i < 2) {
                    scheduleText += `${i === 0 ? 'Сегодня' : 'Завтра'}: Выходной\n`;
                }
            }
        }

        scheduleText += '\nДля записи нажмите "Записаться на тренировку"';

        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.showAlert(scheduleText);
        }
    } catch (error) {
        console.error('Failed to load trainer schedule:', error);
        showNotification('Не удалось загрузить расписание');
    }
}

// Override selectTrainer in main app.js
window.showTrainerSchedule = showTrainerScheduleAPI;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAPI);
} else {
    initializeAPI();
}