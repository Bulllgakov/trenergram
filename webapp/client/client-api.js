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

// Helper function to format date/time in trainer's timezone
function formatInTrainerTimezone(date, trainer, options) {
    const timezone = trainer?.timezone || 'Europe/Moscow';
    return date.toLocaleString('ru-RU', { ...options, timeZone: timezone });
}

function formatDateInTrainerTimezone(date, trainer, options) {
    const timezone = trainer?.timezone || 'Europe/Moscow';
    return date.toLocaleDateString('ru-RU', { ...options, timeZone: timezone });
}

function formatTimeInTrainerTimezone(date, trainer, options) {
    const timezone = trainer?.timezone || 'Europe/Moscow';
    return date.toLocaleTimeString('ru-RU', { ...options, timeZone: timezone });
}

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
    const upcomingBookings = bookings.filter(b => new Date(b.datetime) >= now && b.status.toUpperCase() !== 'CANCELLED');
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
    const upcomingBookings = bookings.filter(b => new Date(b.datetime) >= now && b.status.toUpperCase() !== 'CANCELLED')
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

    // Group bookings by date (need to consider trainer timezone for each booking)
    const bookingsByDate = {};
    upcomingBookings.forEach(booking => {
        const date = new Date(booking.datetime);
        // Use trainer timezone for date grouping
        const trainer = trainers.find(t => t.telegram_id === booking.trainer_telegram_id) || {};
        const dateKey = formatDateInTrainerTimezone(date, trainer, { year: 'numeric', month: '2-digit', day: '2-digit' });
        if (!bookingsByDate[dateKey]) {
            bookingsByDate[dateKey] = [];
        }
        bookingsByDate[dateKey].push(booking);
    });

    // Display bookings grouped by date
    Object.entries(bookingsByDate).forEach(([dateKey, dateBookings]) => {
        // Get first booking to determine trainer timezone
        const firstBooking = dateBookings[0];
        const trainer = trainers.find(t => t.telegram_id === firstBooking.trainer_telegram_id) || {};
        const date = new Date(firstBooking.datetime);

        // Check if today/tomorrow in trainer timezone
        const now = new Date();
        const dateInTrainerTz = formatDateInTrainerTimezone(date, trainer, { year: 'numeric', month: '2-digit', day: '2-digit' });
        const todayInTrainerTz = formatDateInTrainerTimezone(now, trainer, { year: 'numeric', month: '2-digit', day: '2-digit' });
        const tomorrow = new Date(now.getTime() + 86400000);
        const tomorrowInTrainerTz = formatDateInTrainerTimezone(tomorrow, trainer, { year: 'numeric', month: '2-digit', day: '2-digit' });

        let sectionTitle;
        if (dateInTrainerTz === todayInTrainerTz) {
            sectionTitle = 'СЕГОДНЯ';
        } else if (dateInTrainerTz === tomorrowInTrainerTz) {
            sectionTitle = 'ЗАВТРА';
        } else {
            sectionTitle = formatDateInTrainerTimezone(date, trainer, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
        }

        // Add section header
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'section-header';
        sectionHeader.textContent = sectionTitle;
        upcomingTab.appendChild(sectionHeader);

        // Add bookings section
        const bookingsSection = document.createElement('div');
        bookingsSection.className = 'bookings-section';

        // Check if this is today's section
        const isToday = (sectionTitle === 'СЕГОДНЯ');

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
    // Find trainer for this booking to get timezone
    const trainer = trainers.find(t => t.telegram_id === booking.trainer_telegram_id) || {};
    const timeStr = formatTimeInTrainerTimezone(bookingDate, trainer, { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(bookingDate.getTime() + (booking.duration || 60) * 60000);
    const endTimeStr = formatTimeInTrainerTimezone(endTime, trainer, { hour: '2-digit', minute: '2-digit' });
    const timeRangeStr = `${timeStr} - ${endTimeStr}`;

    const statusIcon = getStatusIcon(booking.status);
    const statusClass = getStatusClass(booking.status);

    // Add notification dot for pending confirmations
    const notificationDot = booking.status.toUpperCase() === 'PENDING' ? '<div class="notification-dot"></div>' : '';

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
    // Get trainer to use their timezone
    const trainer = trainers.find(t => t.telegram_id === booking.trainer_telegram_id) || {};
    const dateStr = formatDateInTrainerTimezone(bookingDate, trainer, { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = formatTimeInTrainerTimezone(bookingDate, trainer, { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(bookingDate.getTime() + (booking.duration || 60) * 60000);
    const endTimeStr = formatTimeInTrainerTimezone(endTime, trainer, { hour: '2-digit', minute: '2-digit' });
    const trainerInitials = (booking.trainer_name || 'T').split(' ').map(n => n[0]).join('').toUpperCase();

    document.getElementById('detailsTrainerAvatar').textContent = trainerInitials;
    document.getElementById('detailsTrainerName').textContent = booking.trainer_name || 'Тренер';
    document.getElementById('detailsDate').textContent = dateStr;
    document.getElementById('detailsTime').textContent = `${timeStr} - ${endTimeStr}`;
    document.getElementById('detailsType').textContent = booking.service_name || 'Тренировка';
    document.getElementById('detailsFormat').textContent = booking.format || 'Индивидуальная';
    document.getElementById('detailsLocation').textContent = booking.location || 'Не указано';
    document.getElementById('detailsAddress').textContent = booking.address || 'Не указан';
    document.getElementById('detailsPrice').textContent = `${booking.price || 0}₽`;

    // Update balance info
    const balance = trainer.balance || 0;
    document.getElementById('detailsBalance').textContent = `${balance.toLocaleString()}₽`;

    if (booking.status.toUpperCase() === 'PENDING') {
        document.getElementById('detailsPaymentStatus').textContent = 'Ожидает подтверждения';
    } else if (booking.status.toUpperCase() === 'CONFIRMED') {
        document.getElementById('detailsPaymentStatus').textContent = '✓ Будет списано со счета';
    } else {
        document.getElementById('detailsPaymentStatus').textContent = getStatusText(booking.status);
    }

    // Generate action buttons based on status
    const actionsContainer = document.getElementById('bookingActions');
    actionsContainer.innerHTML = '';

    if (booking.status.toUpperCase() === 'PENDING' || booking.status.toUpperCase() === 'CONFIRMED') {
        if (booking.status.toUpperCase() === 'PENDING') {
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
        const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/confirm?telegram_id=${clientId}`, {
            method: 'PUT'
        });

        if (response.ok) {
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
                window.Telegram.WebApp.showAlert('✅ Тренировка подтверждена!\n\nСредства будут списаны с вашего баланса.');
            }
            closeSheet('bookingDetailsSheet');

            // Reload data
            await loadClientData();
            updateUIWithData();
        } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.detail || 'Не удалось подтвердить запись';
            showNotification(`❌ ${errorMessage}`);
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
    // Calculate statistics
    const totalTrainers = trainers.length;
    const totalBalance = trainers.reduce((sum, t) => sum + (t.balance || 0), 0);
    const needsTopup = trainers.filter(t => (t.balance || 0) <= 0).length;

    // Update statistics in UI
    document.getElementById('totalTrainersCount').textContent = totalTrainers;
    document.getElementById('totalBalance').textContent = `${totalBalance.toLocaleString()}₽`;

    const needsTopupElement = document.getElementById('needsTopup');
    if (needsTopup > 0) {
        needsTopupElement.textContent = `${needsTopup} ${needsTopup === 1 ? 'тренер' : 'тренера'}`;
        needsTopupElement.style.color = 'var(--tg-theme-destructive-text-color)';
    } else {
        needsTopupElement.textContent = 'Нет';
        needsTopupElement.style.color = 'var(--tg-theme-hint-color)';
    }

    // First update the trainers list
    const trainersGrid = document.querySelector('#myTrainersListSheet .trainers-grid');
    if (trainersGrid) {
        if (trainers.length > 0) {
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
        } else {
            // Show empty state when no trainers
            trainersGrid.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: var(--tg-theme-hint-color);">
                    <div style="font-size: 64px; margin-bottom: 20px;">👤</div>
                    <div style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: var(--tg-theme-text-color);">
                        У вас нет привязанных тренеров
                    </div>
                    <div style="font-size: 15px; line-height: 1.5;">
                        Чтобы записаться на тренировки, получите персональную ссылку от вашего тренера и перейдите по ней
                    </div>
                </div>
            `;
        }
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

    // Calculate statistics for this trainer
    const trainerBookings = bookings.filter(b => b.trainer_id === trainer.id);
    const completedBookings = trainerBookings.filter(b => b.status.toUpperCase() === 'COMPLETED');

    // Total trainings count
    const totalCount = completedBookings.length;
    document.getElementById('totalTrainingsCount').textContent = totalCount;

    // Total spent (completed bookings * price)
    const totalSpent = completedBookings.reduce((sum, b) => sum + (b.price || trainer.price || 0), 0);
    document.getElementById('totalSpent').textContent = `${totalSpent.toLocaleString()}₽`;

    // Last training date
    const sortedCompleted = completedBookings.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    if (sortedCompleted.length > 0) {
        const lastDate = new Date(sortedCompleted[0].datetime);
        const now = new Date();
        const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

        let lastDateText;
        if (diffDays === 0) {
            lastDateText = 'Сегодня';
        } else if (diffDays === 1) {
            lastDateText = 'Вчера';
        } else if (diffDays < 7) {
            lastDateText = `${diffDays} дн. назад`;
        } else {
            lastDateText = formatDateInTrainerTimezone(lastDate, trainer, { day: 'numeric', month: 'short' });
        }
        document.getElementById('lastTrainingDate').textContent = lastDateText;
    } else {
        document.getElementById('lastTrainingDate').textContent = 'Нет данных';
    }

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
    const pastBookings = bookings.filter(b => new Date(b.datetime) < now || b.status.toUpperCase() === 'COMPLETED')
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
        // Use trainer timezone for grouping
        const trainer = trainers.find(t => t.telegram_id === booking.trainer_telegram_id) || {};
        const monthKey = formatDateInTrainerTimezone(date, trainer, { month: 'long', year: 'numeric' }).toUpperCase();
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
    // Use trainer timezone
    const trainer = trainers.find(t => t.telegram_id === booking.trainer_telegram_id) || {};
    const day = parseInt(formatDateInTrainerTimezone(bookingDate, trainer, { day: 'numeric' }));
    const month = formatDateInTrainerTimezone(bookingDate, trainer, { month: 'short' }).toUpperCase();

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

    const cancelledBookings = bookings.filter(b => b.status.toUpperCase() === 'CANCELLED');

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
                    return bookingDate.toDateString() === date.toDateString() && b.status.toUpperCase() !== 'CANCELLED';
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