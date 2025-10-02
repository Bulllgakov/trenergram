// API Integration for Trainer Mini App
// Preserves the original Telegram-style design

const API_BASE_URL = 'https://trenergram.ru/api/v1';

// Get trainer ID from URL or Telegram user
const pathParts = window.location.pathname.split('/');
const trainerId = pathParts[pathParts.length - 1] || (window.Telegram?.WebApp?.initDataUnsafe?.user?.id);

// Global data storage
let trainerData = {};
let clients = [];
let bookings = [];
let currentDate = new Date();

// Initialize API integration
async function initializeAPI() {
    console.log('Initializing API with trainer ID:', trainerId);

    if (!trainerId) {
        console.error('No trainer ID found');
        // Still show empty schedule even without trainer ID for testing
        updateScheduleDisplay();
        return;
    }

    // Load trainer data
    await loadTrainerData();

    // Load today's schedule
    await loadSchedule();

    // Update UI with real data
    updateUIWithData();

    console.log('API initialization complete');
}

// Load trainer data
async function loadTrainerData() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/trainer/${trainerId}`);
        if (response.ok) {
            trainerData = await response.json();
            clients = trainerData.clients || [];
            console.log('Trainer data loaded:', trainerData);
        }
    } catch (error) {
        console.error('Failed to load trainer data:', error);
    }
}

// Load schedule
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

            console.log('Bookings loaded for today:', bookings);
        }
    } catch (error) {
        console.error('Failed to load schedule:', error);
    }
}

// Update UI with real data
function updateUIWithData() {
    // Update header stats
    updateHeaderStats();

    // Update clients badge
    updateClientsBadge();

    // Update schedule display
    updateScheduleDisplay();

    // Update date display
    updateDateDisplay();
}

// Update header statistics
function updateHeaderStats() {
    const confirmed = bookings.filter(b => b.status === 'CONFIRMED').length;
    const pending = bookings.filter(b => b.status === 'PENDING').length;

    // Calculate free slots (8 working hours minus occupied)
    const totalSlots = 8;
    const busySlots = bookings.filter(b => b.status !== 'CANCELLED').length;
    const freeSlots = Math.max(0, totalSlots - busySlots);

    const headerSubtitle = document.getElementById('headerStats');
    if (headerSubtitle) {
        headerSubtitle.textContent = `✅ ${confirmed} подтверждено • ⏳ ${pending} ожидает • ➕ ${freeSlots} свободно`;
    }
}

// Update clients badge
function updateClientsBadge() {
    const badge = document.querySelector('.quick-action .badge');
    if (badge) {
        badge.textContent = clients.length;
    }
}

// Update date display
function updateDateDisplay() {
    const sectionHeader = document.querySelector('.section-header');
    if (sectionHeader) {
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        const dateStr = currentDate.toLocaleDateString('ru-RU', options).toUpperCase();
        const clubName = trainerData.club_name || 'Независимый тренер';
        sectionHeader.textContent = `${dateStr} • ${clubName}`;
    }
}

// Update schedule display while preserving design
function updateScheduleDisplay() {
    const scheduleSection = document.getElementById('scheduleSection');

    console.log('Looking for scheduleSection element...');
    console.log('Element found:', !!scheduleSection);

    if (!scheduleSection) {
        console.error('Schedule section not found! Checking DOM...');
        console.log('All elements with class schedule-section:', document.querySelectorAll('.schedule-section'));
        return;
    }

    console.log('Updating schedule display for date:', currentDate);
    console.log('Current bookings:', bookings);

    // Clear current schedule
    scheduleSection.innerHTML = '';

    // Get working hours for current day
    const workingHours = getWorkingHoursForDate(currentDate);
    console.log('Working hours received:', workingHours);

    // If it's a day off, show message
    if (workingHours.length === 0) {
        scheduleSection.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: var(--tg-theme-hint-color);">
                <div style="font-size: 48px; margin-bottom: 16px;">🏖️</div>
                <div style="font-size: 17px; font-weight: 500;">Выходной день</div>
                <div style="font-size: 14px; margin-top: 8px;">В этот день нет приёма</div>
            </div>
        `;
        return;
    }

    workingHours.forEach(hour => {
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;

        // Check if there's a booking at this time
        const booking = bookings.find(b => {
            const bookingDate = new Date(b.datetime);
            return bookingDate.getHours() === hour;
        });

        // Create time slot element
        const timeSlot = document.createElement('div');

        if (hour === 12) {
            // Lunch break
            timeSlot.className = 'time-slot break';
            timeSlot.innerHTML = `
                <div class="time-slot-time">${timeStr}</div>
                <div class="time-slot-content">
                    <div class="time-slot-name">Обеденный перерыв</div>
                </div>
            `;
        } else if (booking) {
            // Occupied slot
            const statusClass = getStatusClass(booking.status);
            const statusIcon = getStatusIcon(booking.status);

            timeSlot.className = `time-slot draggable ${statusClass}`;
            timeSlot.dataset.time = timeStr;
            timeSlot.dataset.client = booking.client_name || 'Клиент';
            timeSlot.dataset.status = booking.status.toLowerCase();
            timeSlot.dataset.bookingId = booking.id;
            timeSlot.onclick = () => openBookingActionsAPI(booking);

            timeSlot.innerHTML = `
                <div class="time-slot-time">${timeStr}</div>
                <div class="time-slot-content">
                    <div class="time-slot-name">${booking.client_name || 'Клиент'}</div>
                    <div class="time-slot-info">${booking.service_name || 'Тренировка'} ${booking.status === 'PENDING' ? '• Ждет подтверждения' : ''}</div>
                </div>
                <div class="time-slot-status">
                    <div class="status-icon ${statusClass}">${statusIcon}</div>
                </div>
            `;
        } else {
            // Free slot
            timeSlot.className = 'time-slot empty';
            timeSlot.dataset.time = timeStr;
            timeSlot.onclick = () => quickBookAPI(timeStr);

            timeSlot.innerHTML = `
                <div class="time-slot-time">${timeStr}</div>
                <div class="time-slot-content">
                    <div class="time-slot-name">Свободно</div>
                    <div class="time-slot-info">Нажмите для записи</div>
                </div>
                <div class="time-slot-status">
                    <div class="status-icon free">+</div>
                </div>
            `;
        }

        scheduleSection.appendChild(timeSlot);
    });

    console.log('Schedule updated. Total slots added:', workingHours.length);
    console.log('Schedule section HTML length:', scheduleSection.innerHTML.length);
}

// Get status class for styling
function getStatusClass(status) {
    switch(status.toUpperCase()) {
        case 'CONFIRMED': return 'confirmed';
        case 'PENDING': return 'waiting-confirmation';
        case 'CANCELLED': return 'auto-cancelled';
        case 'COMPLETED': return 'completed';
        default: return '';
    }
}

// Get status icon
function getStatusIcon(status) {
    switch(status.toUpperCase()) {
        case 'CONFIRMED': return '✓';
        case 'PENDING': return '?';
        case 'CANCELLED': return '✗';
        case 'COMPLETED': return '✓';
        default: return '•';
    }
}

// Open booking actions for API booking
function openBookingActionsAPI(booking) {
    const clientName = booking.client_name || 'Клиент';
    const status = booking.status;

    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;

        let buttons = [];

        if (status === 'PENDING') {
            buttons = [
                {id: 'confirm', type: 'default', text: 'Подтвердить запись'},
                {id: 'contact', type: 'default', text: 'Связаться с клиентом'},
                {id: 'cancel', type: 'destructive', text: 'Отменить'},
                {type: 'cancel'}
            ];
        } else if (status === 'CONFIRMED') {
            buttons = [
                {id: 'contact', type: 'default', text: 'Связаться с клиентом'},
                {id: 'cancel', type: 'destructive', text: 'Отменить'},
                {type: 'cancel'}
            ];
        }

        tg.showPopup({
            title: clientName,
            message: `${booking.service_name || 'Тренировка'}\nСтатус: ${getStatusText(status)}`,
            buttons: buttons
        }, async (buttonId) => {
            if (buttonId === 'confirm') {
                await confirmBookingAPI(booking.id);
            } else if (buttonId === 'cancel') {
                await cancelBookingAPI(booking.id);
            } else if (buttonId === 'contact' && booking.client_telegram_username) {
                tg.openLink(`https://t.me/${booking.client_telegram_username}`);
            }
        });
    } else {
        // Fallback for browser
        showNotification(`Управление записью: ${clientName}`);
    }
}

// Quick book for API
async function quickBookAPI(time) {
    console.log('quickBookAPI called for time:', time);

    if (clients.length === 0) {
        showNotification('У вас пока нет клиентов. Поделитесь своей ссылкой для привлечения клиентов.');
        if (window.showLink) {
            window.showLink();
        }
        return;
    }

    // Store selected time globally
    window.selectedTimeForBooking = time;

    // Open the booking sheet (uses existing UI)
    if (window.quickBook) {
        window.quickBook(time);
    } else {
        console.error('quickBook function not found');
        // Fallback - directly open booking sheet
        if (window.openBookingSheet) {
            window.openBookingSheet();
        }
    }
}

// Ensure showNotification exists
if (!window.showNotification) {
    window.showNotification = function(message) {
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.showAlert(message);
        } else {
            console.log('Notification:', message);
            alert(message);
        }
    };
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
                telegram_id: trainerId
            })
        });

        if (response.ok) {
            showNotification('✅ Запись подтверждена');
            await loadSchedule();
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
    if (!confirm('Вы уверены, что хотите отменить запись?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}?telegram_id=${trainerId}&reason=Отменено тренером`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('✅ Запись отменена');
            await loadSchedule();
            updateUIWithData();
        } else {
            showNotification('❌ Не удалось отменить запись');
        }
    } catch (error) {
        console.error('Failed to cancel booking:', error);
        showNotification('❌ Ошибка при отмене записи');
    }
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

// Override existing showClients to use API data and show in sheet
const originalShowClients = window.showClients;
window.showClients = function() {
    // Update stats
    document.getElementById('totalClientsCount').textContent = clients.length;

    // Count active clients (those with recent bookings)
    const activeClients = clients.filter(client => {
        // Consider client active if they have bookings in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return bookings.some(b =>
            b.client_telegram_id === client.telegram_id &&
            new Date(b.datetime) > thirtyDaysAgo
        );
    });
    document.getElementById('activeClientsCount').textContent = activeClients.length;

    // Update clients list
    const clientsList = document.getElementById('clientsList');
    clientsList.innerHTML = '';

    if (clients.length === 0) {
        clientsList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--tg-theme-hint-color);">
                <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
                <div style="font-size: 17px; font-weight: 500; margin-bottom: 8px;">У вас пока нет клиентов</div>
                <div style="font-size: 14px;">Поделитесь ссылкой для привлечения клиентов</div>
            </div>
        `;
    } else {
        clients.forEach(client => {
            const clientCard = document.createElement('div');
            clientCard.className = 'client-item';
            clientCard.style.cssText = `
                display: flex;
                align-items: center;
                padding: 12px;
                margin-bottom: 8px;
                background: var(--tg-theme-bg-color);
                border-radius: 10px;
                cursor: pointer;
            `;
            clientCard.onclick = () => showClientDetails(client);

            const initials = (client.name || 'К').split(' ').map(n => n[0]).join('').toUpperCase();

            // Count client's bookings
            const clientBookings = bookings.filter(b => b.client_telegram_id === client.telegram_id);
            const upcomingBookings = clientBookings.filter(b => new Date(b.datetime) >= new Date());

            clientCard.innerHTML = `
                <div class="client-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: var(--tg-theme-button-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 12px;">
                    ${initials}
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 16px; font-weight: 500;">${client.name || 'Клиент'}</div>
                    <div style="font-size: 13px; color: var(--tg-theme-hint-color);">
                        ${clientBookings.length} тренировок • ${upcomingBookings.length} предстоящих
                    </div>
                </div>
                <div style="color: var(--tg-theme-hint-color); font-size: 20px;">›</div>
            `;

            clientsList.appendChild(clientCard);
        });
    }

    // Open the sheet
    openSheet('clientsSheet');
};

// Show client details
function showClientDetails(client) {
    const clientBookings = bookings.filter(b => b.client_telegram_id === client.telegram_id);
    const completedBookings = clientBookings.filter(b => b.status === 'COMPLETED').length;
    const upcomingBookings = clientBookings.filter(b => new Date(b.datetime) >= new Date() && b.status !== 'CANCELLED');

    let message = `👤 ${client.name || 'Клиент'}\n\n`;
    message += `📊 Статистика:\n`;
    message += `• Всего тренировок: ${clientBookings.length}\n`;
    message += `• Завершено: ${completedBookings}\n`;
    message += `• Предстоящих: ${upcomingBookings.length}\n\n`;

    if (upcomingBookings.length > 0) {
        message += `📅 Ближайшие тренировки:\n`;
        upcomingBookings.slice(0, 3).forEach(booking => {
            const date = new Date(booking.datetime);
            message += `• ${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} в ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}\n`;
        });
    }

    if (client.telegram_username) {
        message += `\n💬 Telegram: @${client.telegram_username}`;
    }

    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.showPopup({
            title: 'Информация о клиенте',
            message: message,
            buttons: [
                client.telegram_username ? {id: 'contact', type: 'default', text: 'Написать клиенту'} : null,
                {id: 'book', type: 'default', text: 'Записать на тренировку'},
                {type: 'close'}
            ].filter(Boolean)
        }, (buttonId) => {
            if (buttonId === 'contact' && client.telegram_username) {
                window.Telegram.WebApp.openLink(`https://t.me/${client.telegram_username}`);
            } else if (buttonId === 'book') {
                closeSheet('clientsSheet');
                // Pre-select client in booking form
                setTimeout(() => {
                    quickBook();
                    setTimeout(() => {
                        selectClient(client.name);
                    }, 300);
                }, 300);
            }
        });
    }
}

// Share trainer link
window.shareTrainerLink = function() {
    if (window.showLink) {
        window.showLink();
    }
};

// Override showLink to use real trainer ID
const originalShowLink = window.showLink;
window.showLink = function() {
    const link = `https://t.me/trenergram_bot?start=trainer_${trainerId}`;

    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.showAlert(`Ваша ссылка для клиентов:\n${link}\n\nQR-код доступен в боте по команде /qr`);
    }
};

// Override selectDate to reload data
const originalSelectDate = window.selectDate;
window.selectDate = async function(element, date) {
    console.log('selectDate called with:', date);

    // Call original function for UI update
    if (originalSelectDate) {
        originalSelectDate(element, date);
    }

    // Parse date properly
    const [year, month, day] = date.split('-').map(Number);
    currentDate = new Date(year, month - 1, day); // month is 0-indexed in JavaScript

    console.log('Parsed date:', currentDate);

    // Reload schedule for new date
    await loadSchedule();
    updateUIWithData();
};

// Override confirmBooking in existing UI to use API
const originalConfirmBooking = window.confirmBooking;
window.confirmBooking = async function() {
    const clientSearch = document.getElementById('clientSearch');
    const selectedClient = clientSearch ? clientSearch.value : null;
    const selectedTime = window.selectedTimeForBooking;

    if (selectedClient && selectedTime) {
        // Find client by name
        const client = clients.find(c => c.name === selectedClient);

        if (client) {
            try {
                const [hour, minute] = selectedTime.split(':');
                const bookingDate = new Date(currentDate);
                bookingDate.setHours(parseInt(hour), parseInt(minute || 0), 0, 0);

                const bookingData = {
                    trainer_telegram_id: parseInt(trainerId),
                    client_telegram_id: parseInt(client.telegram_id),
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
                    showNotification(`✅ ${selectedClient} записан на ${selectedTime}`);

                    // Reload schedule
                    await loadSchedule();
                    updateUIWithData();

                    // Close sheet and reset form
                    closeSheet('bookingSheet');

                    // Reset form
                    if (clientSearch) clientSearch.value = '';
                    document.querySelectorAll('.time-option').forEach(option => {
                        option.classList.remove('selected');
                    });
                } else {
                    const error = await response.json();
                    showNotification(`❌ Ошибка: ${error.detail || 'Не удалось создать запись'}`);
                }
            } catch (error) {
                console.error('Failed to create booking:', error);
                showNotification('❌ Ошибка при создании записи');
            }
        }
    } else {
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
            window.Telegram.WebApp.showAlert('Выберите клиента и время');
        }
    }
};

// Update client list in booking sheet when it opens
const originalOpenBookingSheet = window.openBookingSheet;
window.openBookingSheet = function() {
    // Call original function
    if (originalOpenBookingSheet) {
        originalOpenBookingSheet();
    }

    // Update client list with real data
    const clientList = document.getElementById('clientList');
    if (!clientList) return;

    clientList.innerHTML = '';

    if (clients.length === 0) {
        clientList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--tg-theme-hint-color);">
                У вас пока нет клиентов.<br>
                Поделитесь своей ссылкой для привлечения клиентов.
            </div>
        `;
    } else {
        clients.forEach(client => {
            const clientItem = document.createElement('div');
            clientItem.className = 'client-item';
            clientItem.onclick = () => selectClient(client.name || 'Клиент');

            const initials = (client.name || 'К').split(' ').map(n => n[0]).join('').toUpperCase();

            clientItem.innerHTML = `
                <div class="client-avatar">${initials}</div>
                <div class="client-name">${client.name || 'Клиент'}</div>
            `;

            clientList.appendChild(clientItem);
        });

        // Add "new client" option
        const newClientItem = document.createElement('div');
        newClientItem.className = 'client-item';
        newClientItem.onclick = () => newClient();
        newClientItem.innerHTML = `
            <div class="client-avatar" style="background: var(--tg-theme-secondary-bg-color); color: var(--tg-theme-link-color);">+</div>
            <div class="client-name add-new">Добавить нового клиента</div>
        `;
        clientList.appendChild(newClientItem);
    }
};

// Get working hours for specific date
function getWorkingHoursForDate(date) {
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    console.log('Getting working hours for:', dayOfWeek, date);

    // Try to get from window.workingHoursData if available
    if (window.workingHoursData && window.workingHoursData[dayOfWeek]) {
        const dayData = window.workingHoursData[dayOfWeek];
        console.log('Day data for', dayOfWeek, ':', dayData);

        if (!dayData.isWorkingDay) {
            console.log(dayOfWeek, 'is a day off');
            // Even on day off, show default hours for testing
            console.log('Showing default hours for testing');
            return [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
        }

        const [startHour] = dayData.start.split(':').map(Number);
        const [endHour] = dayData.end.split(':').map(Number);

        const hours = [];
        for (let hour = startHour; hour < endHour; hour++) {
            hours.push(hour);
        }

        console.log('Working hours for', dayOfWeek, ':', hours);
        return hours;
    }

    console.log('Using default working hours - always show slots for testing');
    // Always return working hours for testing
    return [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
}

// Save working hours to API
window.saveWorkingHoursAPI = async function(workingHoursData) {
    if (!trainerId) return;

    try {
        // Convert to API format
        const schedules = [];
        Object.keys(workingHoursData).forEach(day => {
            const dayData = workingHoursData[day];
            if (dayData.isWorkingDay) {
                schedules.push({
                    day_of_week: day,
                    start_time: dayData.start,
                    end_time: dayData.end,
                    is_active: true
                });

                // Add break if needed
                if (dayData.hasBreak) {
                    schedules.push({
                        day_of_week: day,
                        start_time: '12:00',
                        end_time: '13:00',
                        is_active: true,
                        is_break: true
                    });
                }
            }
        });

        const response = await fetch(`${API_BASE_URL}/users/trainer/${trainerId}/schedule`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ schedules })
        });

        if (response.ok) {
            console.log('Working hours saved successfully');
            // Reload schedule to reflect changes
            await loadSchedule();
            updateUIWithData();
        } else {
            console.error('Failed to save working hours');
        }
    } catch (error) {
        console.error('Error saving working hours:', error);
    }
};

// Load working hours from API
async function loadWorkingHours() {
    if (!trainerId) return;

    try {
        const response = await fetch(`${API_BASE_URL}/users/trainer/${trainerId}/schedule`);
        if (response.ok) {
            const schedules = await response.json();

            // Convert to UI format
            const workingHoursData = {
                monday: { isWorkingDay: false, start: '09:00', end: '21:00', hasBreak: false },
                tuesday: { isWorkingDay: false, start: '09:00', end: '21:00', hasBreak: false },
                wednesday: { isWorkingDay: false, start: '09:00', end: '21:00', hasBreak: false },
                thursday: { isWorkingDay: false, start: '09:00', end: '21:00', hasBreak: false },
                friday: { isWorkingDay: false, start: '09:00', end: '21:00', hasBreak: false },
                saturday: { isWorkingDay: false, start: '10:00', end: '18:00', hasBreak: false },
                sunday: { isWorkingDay: false, start: '10:00', end: '18:00', hasBreak: false }
            };

            schedules.forEach(schedule => {
                const day = schedule.day_of_week.toLowerCase();
                if (!schedule.is_break) {
                    workingHoursData[day] = {
                        isWorkingDay: true,
                        start: schedule.start_time,
                        end: schedule.end_time,
                        hasBreak: false // Will be set if break schedule found
                    };
                } else if (schedule.is_break && workingHoursData[day]) {
                    workingHoursData[day].hasBreak = true;
                }
            });

            // Update global variable if exists
            if (window.workingHoursData) {
                window.workingHoursData = workingHoursData;
            }

            // Update UI display
            Object.keys(workingHoursData).forEach(day => {
                const hoursDisplay = document.getElementById(`hours-${day}`);
                if (hoursDisplay) {
                    const dayData = workingHoursData[day];
                    if (dayData.isWorkingDay) {
                        hoursDisplay.textContent = `${dayData.start} - ${dayData.end}`;
                    } else {
                        hoursDisplay.textContent = 'Выходной';
                    }
                }
            });

            return workingHoursData;
        }
    } catch (error) {
        console.error('Failed to load working hours:', error);
    }

    return null;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        // Show schedule immediately with defaults
        updateScheduleDisplay();

        // Then load real data
        await loadWorkingHours();
        await initializeAPI();
    });
} else {
    // Show schedule immediately with defaults
    updateScheduleDisplay();

    // Then load real data
    loadWorkingHours().then(() => initializeAPI());
}