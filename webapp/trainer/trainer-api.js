// API Integration for Trainer Mini App
// Preserves the original Telegram-style design
// Cache buster: 2025-10-03-19:45

const API_BASE_URL = 'https://trenergram.ru/api/v1';

// Get trainer ID from URL or Telegram user
const pathParts = window.location.pathname.split('/');
console.log('URL path parts:', pathParts);
console.log('Last path part (potential trainerId):', pathParts[pathParts.length - 1]);
console.log('Telegram WebApp user:', window.Telegram?.WebApp?.initDataUnsafe?.user?.id);
const trainerId = pathParts[pathParts.length - 1] || (window.Telegram?.WebApp?.initDataUnsafe?.user?.id);
console.log('Final trainerId:', trainerId);

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
        // Load trainer basic info
        const response = await fetch(`${API_BASE_URL}/users/trainer/${trainerId}`);
        if (response.ok) {
            trainerData = await response.json();
            console.log('Trainer data loaded:', trainerData);
        }

        // Load trainer's clients from separate endpoint
        console.log('Loading clients for trainer:', trainerId);
        const clientsURL = `${API_BASE_URL}/users/trainer/${trainerId}/clients`;
        console.log('Clients API URL:', clientsURL);

        const clientsResponse = await fetch(clientsURL);
        console.log('Clients response status:', clientsResponse.status);

        if (clientsResponse.ok) {
            clients = await clientsResponse.json();
            console.log('Clients loaded successfully:', clients.length, 'clients');
            console.log('Clients data:', clients);
        } else {
            console.error('Failed to load clients:', clientsResponse.status, clientsResponse.statusText);
            const errorText = await clientsResponse.text();
            console.error('Error details:', errorText);

            // Fallback to empty array if endpoint doesn't exist
            clients = trainerData.clients || [];
            console.log('Using clients from trainer data:', clients);
        }
    } catch (error) {
        console.error('Failed to load trainer data:', error);
        clients = [];
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

    // Update duration display
    updateDurationDisplay();

    // Update trainer settings
    updateTrainerSettings();
}

// Update duration display in settings
function updateDurationDisplay() {
    const durationDisplay = document.getElementById('duration-display');
    if (durationDisplay && trainerData && trainerData.session_duration) {
        durationDisplay.textContent = `${trainerData.session_duration} минут`;
        selectedDuration = trainerData.session_duration;
    }
}

// Generate time slots based on session duration
function generateTimeSlots(startTime, endTime, hasBreak = false) {
    const slots = [];
    const duration = (trainerData && trainerData.session_duration) || selectedDuration || 60;

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Lunch break times (12:00-13:00)
    const lunchStartMinutes = 12 * 60; // 12:00
    const lunchEndMinutes = 13 * 60;   // 13:00

    for (let currentMinutes = startMinutes; currentMinutes + duration <= endMinutes; currentMinutes += duration) {
        const hour = Math.floor(currentMinutes / 60);
        const minute = currentMinutes % 60;
        const slotEndMinutes = currentMinutes + duration;

        // Skip slots that overlap with lunch break
        if (hasBreak && (
            (currentMinutes >= lunchStartMinutes && currentMinutes < lunchEndMinutes) ||
            (slotEndMinutes > lunchStartMinutes && slotEndMinutes <= lunchEndMinutes) ||
            (currentMinutes < lunchStartMinutes && slotEndMinutes > lunchEndMinutes)
        )) {
            // If slot overlaps with lunch break, skip to after lunch
            if (currentMinutes < lunchEndMinutes) {
                currentMinutes = lunchEndMinutes - duration; // Will be incremented by duration in loop
                continue;
            }
        }

        slots.push({
            hour: hour,
            minute: minute,
            timeString: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
            endHour: Math.floor((currentMinutes + duration) / 60),
            endMinute: (currentMinutes + duration) % 60,
            endTimeString: `${Math.floor((currentMinutes + duration) / 60).toString().padStart(2, '0')}:${((currentMinutes + duration) % 60).toString().padStart(2, '0')}`
        });
    }

    console.log(`Generated ${slots.length} slots with ${duration}min duration:`, slots);
    return slots;
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
    const sectionHeader = document.getElementById('sectionHeader');
    if (sectionHeader) {
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        const dateStr = currentDate.toLocaleDateString('ru-RU', options);
        const clubName = trainerData.club_name || 'Независимый тренер';

        // Capitalize first letter
        const capitalizedDateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
        sectionHeader.textContent = `${capitalizedDateStr} • ${clubName}`;
    }

    // Also update club name in settings
    const clubNameSettings = document.getElementById('clubNameSettings');
    if (clubNameSettings) {
        clubNameSettings.textContent = trainerData.club_name || 'Независимый тренер';
    }
}

// Generate date tabs
function generateDateTabs() {
    const dateTabs = document.getElementById('dateTabs');
    if (!dateTabs) {
        console.error('dateTabs element not found');
        return;
    }

    console.log('Generating date tabs');
    dateTabs.innerHTML = '';
    const today = new Date();

    for (let i = -2; i <= 4; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        const button = document.createElement('button');
        button.className = 'date-tab';

        // Check if this day is a working day
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const isWorkingDay = window.workingHoursData && window.workingHoursData[dayOfWeek]
            ? window.workingHoursData[dayOfWeek].isWorkingDay
            : true; // Default to true if no data

        // Format date string for function call
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        // Format display text
        let displayText;
        if (i === 0) {
            displayText = 'Сегодня';
            button.classList.add('active');
            currentDate = date; // Set current date to today
        } else if (i === 1) {
            displayText = 'Завтра';
        } else {
            const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
            displayText = `${dayNames[date.getDay()]}, ${date.getDate()}`;
        }

        // Add indicator if it's a day off
        if (!isWorkingDay) {
            displayText += ' 🚫';
            button.style.opacity = '0.6';
        }

        button.textContent = displayText;
        button.onclick = () => window.selectDate(button, dateStr);

        dateTabs.appendChild(button);
    }

    console.log('Date tabs generated');
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

    workingHours.forEach(slot => {
        // Support both old format (numbers) and new format (objects)
        let timeStr, endTimeStr, hour;
        if (typeof slot === 'number') {
            // Old format - just hour
            hour = slot;
            timeStr = `${slot.toString().padStart(2, '0')}:00`;
            endTimeStr = `${(slot + 1).toString().padStart(2, '0')}:00`;
        } else {
            // New format - object with time range
            hour = slot.hour;
            timeStr = slot.timeString;
            endTimeStr = slot.endTimeString;
        }

        const displayTime = `${timeStr}<br>${endTimeStr}`;

        // Check if there's a booking at this time for the current date
        const booking = bookings.find(b => {
            const bookingDate = new Date(b.datetime);
            return bookingDate.getHours() === hour &&
                   bookingDate.toDateString() === currentDate.toDateString();
        });

        // Create time slot element
        const timeSlot = document.createElement('div');

        // Check if this time slot should show lunch break
        const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const dayData = window.workingHoursData && window.workingHoursData[dayOfWeek];
        const shouldShowLunchBreak = dayData && dayData.hasBreak && hour === 12;

        if (shouldShowLunchBreak) {
            // Lunch break
            timeSlot.className = 'time-slot break';
            timeSlot.innerHTML = `
                <div class="time-slot-time">${displayTime}</div>
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
                <div class="time-slot-time">${displayTime}</div>
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
                <div class="time-slot-time">${displayTime}</div>
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
    if (typeof openClientsSheet === 'function') {
        openClientsSheet();
    } else {
        console.error('openClientsSheet function not found');
    }
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

// Duration settings functions
let selectedDuration = 60; // Default 60 minutes

window.openDurationSettings = function() {
    // Load current duration from trainer data
    if (trainerData && trainerData.session_duration) {
        selectedDuration = trainerData.session_duration;
    }

    // Update active duration option
    updateActiveDurationOption();

    // Show duration sheet
    const sheet = document.getElementById('durationSheet');
    if (sheet) {
        sheet.classList.add('active');
    }
};

function updateActiveDurationOption() {
    // Remove active class from all options
    document.querySelectorAll('.duration-option').forEach(option => {
        option.classList.remove('active');
    });

    // Add active class to selected duration
    const activeOption = document.querySelector(`.duration-option[onclick="selectDuration(${selectedDuration})"]`);
    if (activeOption) {
        activeOption.classList.add('active');
    }
}

window.selectDuration = function(duration) {
    selectedDuration = duration;
    updateActiveDurationOption();
};

window.saveDuration = async function() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/trainer/${trainerId}/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_duration: selectedDuration
            })
        });

        if (response.ok) {
            const updatedTrainer = await response.json();
            trainerData = updatedTrainer;

            // Update display
            const durationDisplay = document.getElementById('duration-display');
            if (durationDisplay) {
                durationDisplay.textContent = `${selectedDuration} минут`;
            }

            // Regenerate schedule slots with new duration
            showDefaultSlots();
            await loadSchedule();
            updateUIWithData();

            // Close sheet
            closeSheet('durationSheet');

            showNotification('✅ Длительность занятий обновлена');
        } else {
            showNotification('❌ Не удалось обновить длительность');
        }
    } catch (error) {
        console.error('Failed to save duration:', error);
        showNotification('❌ Ошибка при сохранении');
    }
};

// Override selectDate to reload data
const originalSelectDate = window.selectDate;
window.selectDate = async function(element, date) {
    console.log('selectDate called with:', date);

    // Update UI to show active tab
    document.querySelectorAll('.date-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    if (element) {
        element.classList.add('active');
    }

    // Parse date properly
    const [year, month, day] = date.split('-').map(Number);
    currentDate = new Date(year, month - 1, day); // month is 0-indexed in JavaScript

    console.log('Parsed date:', currentDate);

    // Immediately update display with new working hours
    showDefaultSlots();

    // Update date display
    updateDateDisplay();

    // Then reload schedule for new date
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
    console.log('Custom openBookingSheet called');

    // Load clients list first
    loadClientsList();

    // Call original function
    if (originalOpenBookingSheet) {
        console.log('Calling original openBookingSheet');
        originalOpenBookingSheet();
    } else {
        console.log('No original openBookingSheet found');
    }

    // Update time options with real data
    console.log('About to call updateBookingTimeOptions');
    // Add a small delay to ensure DOM is ready
    setTimeout(() => {
        updateBookingTimeOptions();
    }, 100);

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
            return []; // Return empty array for day off
        }

        // Generate time slots based on session duration
        const slots = generateTimeSlots(dayData.start, dayData.end, dayData.hasBreak);
        console.log('Generated slots for', dayOfWeek, ':', slots);
        return slots;
    }

    console.log('No working hours data - using default schedule');
    // Default working hours based on typical schedule
    // Monday-Friday: 9:00-21:00
    // Saturday-Sunday: 10:00-18:00
    const defaultStart = (dayOfWeek === 'saturday' || dayOfWeek === 'sunday') ? '10:00' : '09:00';
    const defaultEnd = (dayOfWeek === 'saturday' || dayOfWeek === 'sunday') ? '18:00' : '21:00';

    return generateTimeSlots(defaultStart, defaultEnd);
}

// Save working hours to API
window.saveWorkingHoursAPI = async function(workingHoursData) {
    if (!trainerId) return false;

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

                // Note: Lunch break is handled on frontend only, not saved to backend
            } else {
                // For day off, send inactive schedule to remove existing slots
                schedules.push({
                    day_of_week: day,
                    start_time: dayData.start || '09:00',
                    end_time: dayData.end || '18:00',
                    is_active: false
                });
            }
        });

        const response = await fetch(`${API_BASE_URL}/slots/trainer/${trainerId}/schedule`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ schedules })
        });

        if (response.ok) {
            console.log('Working hours saved successfully');
            // Update local working hours data
            window.workingHoursData = workingHoursData;
            // Regenerate date tabs to reflect changes
            generateDateTabs();
            // Update schedule display only if current date matches the edited day
            if (currentDate && window.currentEditingDay) {
                const currentDayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                if (currentDayOfWeek === window.currentEditingDay) {
                    updateScheduleDisplay();
                }
            }
            return true;
        } else {
            console.error('Failed to save working hours');
            return false;
        }
    } catch (error) {
        console.error('Error saving working hours:', error);
        return false;
    }
};

// Load working hours from API
async function loadWorkingHours() {
    // If no trainerId or API fails, still use default from HTML
    if (!trainerId) {
        console.log('No trainer ID, using default working hours from HTML');
        // Regenerate tabs with existing window.workingHoursData
        generateDateTabs();
        return window.workingHoursData;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/slots/trainer/${trainerId}/schedule`);
        if (response.ok) {
            const schedules = await response.json();

            // Convert to UI format - start with working days by default
            const workingHoursData = {
                monday: { isWorkingDay: true, start: '09:00', end: '21:00', hasBreak: false },
                tuesday: { isWorkingDay: true, start: '09:00', end: '21:00', hasBreak: false },
                wednesday: { isWorkingDay: true, start: '09:00', end: '21:00', hasBreak: false },
                thursday: { isWorkingDay: true, start: '09:00', end: '21:00', hasBreak: false },
                friday: { isWorkingDay: true, start: '09:00', end: '21:00', hasBreak: false },
                saturday: { isWorkingDay: false, start: '10:00', end: '18:00', hasBreak: false },
                sunday: { isWorkingDay: false, start: '10:00', end: '18:00', hasBreak: false }
            };

            schedules.forEach(schedule => {
                const day = schedule.day_of_week.toLowerCase();
                if (schedule.is_active) {
                    // Active working schedule
                    workingHoursData[day] = {
                        isWorkingDay: true,
                        start: schedule.start_time,
                        end: schedule.end_time,
                        hasBreak: false
                    };
                } else {
                    // Inactive schedule - day off
                    workingHoursData[day] = {
                        isWorkingDay: false,
                        start: schedule.start_time,
                        end: schedule.end_time,
                        hasBreak: false
                    };
                }
            });

            // Update global variable
            window.workingHoursData = workingHoursData;

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

            // Regenerate date tabs with loaded working hours
            generateDateTabs();

            return workingHoursData;
        }
    } catch (error) {
        console.error('Failed to load working hours from API, using defaults:', error);
    }

    // If API fails, ensure we regenerate tabs with default HTML data
    console.log('Using default working hours from HTML');
    generateDateTabs();

    return window.workingHoursData;
}

// Simple function to immediately show slots
function showDefaultSlots() {
    const scheduleSection = document.getElementById('scheduleSection');
    if (!scheduleSection) {
        console.error('scheduleSection not found!');
        return;
    }

    console.log('Showing default slots immediately');

    // Get working hours for current date
    const workingHours = getWorkingHoursForDate(currentDate);

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

    scheduleSection.innerHTML = '';

    workingHours.forEach(slot => {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot empty';

        // Support both old format (numbers) and new format (objects)
        let timeStr, endTimeStr;
        if (typeof slot === 'number') {
            // Old format - just hour
            timeStr = `${slot.toString().padStart(2, '0')}:00`;
            endTimeStr = `${(slot + 1).toString().padStart(2, '0')}:00`;
        } else {
            // New format - object with time range
            timeStr = slot.timeString;
            endTimeStr = slot.endTimeString;
        }

        const displayTime = `${timeStr}<br>${endTimeStr}`;

        timeSlot.dataset.time = timeStr;
        timeSlot.onclick = () => {
            console.log('Slot clicked:', timeStr);
            if (typeof quickBookAPI === 'function') {
                quickBookAPI(timeStr);
            } else if (typeof quickBook === 'function') {
                quickBook(timeStr);
            } else {
                // Fallback
                if (window.Telegram && window.Telegram.WebApp) {
                    window.Telegram.WebApp.showAlert(`Выбрано время: ${displayTime}\nФункция записи будет доступна после загрузки`);
                }
            }
        };

        timeSlot.innerHTML = `
            <div class="time-slot-time">${displayTime}</div>
            <div class="time-slot-content">
                <div class="time-slot-name">Свободно</div>
                <div class="time-slot-info">Нажмите для записи</div>
            </div>
            <div class="time-slot-status">
                <div class="status-icon free">+</div>
            </div>
        `;
        scheduleSection.appendChild(timeSlot);
    });

    console.log('Slots added based on working hours:', workingHours.length);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('DOM loaded, initializing...');

        // Set current date first
        if (!currentDate) {
            currentDate = new Date();
        }

        // Generate date tabs with real dates
        generateDateTabs();

        // Show slots IMMEDIATELY
        showDefaultSlots();

        // Update date display
        updateDateDisplay();

        // Then load real data and update
        await loadWorkingHours(); // This now regenerates tabs internally
        await initializeAPI();
    });
} else {
    console.log('DOM already loaded, initializing...');

    // Set current date first
    if (!currentDate) {
        currentDate = new Date();
    }

    // Generate date tabs with real dates
    generateDateTabs();

    // Show slots IMMEDIATELY
    showDefaultSlots();

    // Update date display
    updateDateDisplay();

    // Then load real data
    loadWorkingHours().then(() => {
        initializeAPI();
        // loadWorkingHours already regenerates tabs
    });
}

// Update trainer settings with real data
function updateTrainerSettings() {
    // Update price
    const priceElement = document.getElementById('trainerPrice');
    if (priceElement && trainerData.price) {
        priceElement.textContent = `${trainerData.price}₽`;
    }

    // Update club name
    const clubElement = document.getElementById('clubNameSettings');
    if (clubElement) {
        clubElement.textContent = trainerData.club_name || 'Независимый тренер';
    }
}

// Load and display clients
function loadAndDisplayClients() {
    const clientsListElement = document.getElementById('clientsList');
    const totalClientsElement = document.getElementById('totalClientsCount');
    const activeClientsElement = document.getElementById('activeClientsCount');

    if (!clientsListElement) return;

    // Update stats
    if (totalClientsElement) {
        totalClientsElement.textContent = clients.length;
    }
    if (activeClientsElement) {
        // For now, all clients are considered active
        activeClientsElement.textContent = clients.length;
    }

    // Clear existing list
    clientsListElement.innerHTML = '';

    if (clients.length === 0) {
        clientsListElement.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--tg-theme-hint-color);">
                <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
                <div style="font-size: 17px; font-weight: 500;">Пока нет клиентов</div>
                <div style="font-size: 14px; margin-top: 8px;">Поделитесь ссылкой для привлечения клиентов</div>
            </div>
        `;
        return;
    }

    // Display clients
    clients.forEach(client => {
        const clientElement = document.createElement('div');
        clientElement.className = 'client-item';

        const initials = (client.name || 'C').split(' ').map(n => n[0]).join('').toUpperCase();

        clientElement.innerHTML = `
            <div class="client-avatar">${initials}</div>
            <div class="client-name">${client.name || 'Клиент'}</div>
        `;

        // Add click handler to show client details
        clientElement.onclick = () => {
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.showAlert(`Клиент: ${client.name}\nТелефон: ${client.phone || 'Не указан'}\nEmail: ${client.email || 'Не указан'}`);
            }
        };

        clientsListElement.appendChild(clientElement);
    });
}

// Load clients for booking sheet
function loadClientsList() {
    const clientListElement = document.getElementById('clientList');
    if (!clientListElement) return;

    clientListElement.innerHTML = '';

    if (clients.length === 0) {
        clientListElement.innerHTML = `
            <div class="client-item" onclick="newClient()">
                <div class="client-avatar">+</div>
                <div class="client-name add-new">Добавить нового клиента</div>
            </div>
        `;
        return;
    }

    // Add existing clients
    clients.forEach(client => {
        const clientElement = document.createElement('div');
        clientElement.className = 'client-item';

        const initials = (client.name || 'C').split(' ').map(n => n[0]).join('').toUpperCase();

        clientElement.innerHTML = `
            <div class="client-avatar">${initials}</div>
            <div class="client-name">${client.name || 'Клиент'}</div>
        `;

        clientElement.onclick = () => {
            if (window.selectClient) {
                window.selectClient(client.name);
            }
        };

        clientListElement.appendChild(clientElement);
    });

    // Add "new client" option
    const newClientElement = document.createElement('div');
    newClientElement.className = 'client-item';
    newClientElement.innerHTML = `
        <div class="client-avatar">+</div>
        <div class="client-name add-new">Добавить нового клиента</div>
    `;
    newClientElement.onclick = () => {
        if (window.newClient) {
            window.newClient();
        }
    };
    clientListElement.appendChild(newClientElement);
}

// Additional client list loading (removed duplicate originalOpenBookingSheet declaration)

// Update clients badge
function updateClientsBadge() {
    const clientsCountElement = document.getElementById('clientsCount');
    if (clientsCountElement) {
        clientsCountElement.textContent = clients.length;
    }
}

// Save working hours to API
async function saveWorkingHoursAPI(workingHoursData) {
    if (!trainerId) {
        console.log('No trainer ID, cannot save working hours');
        return false;
    }

    try {
        // Convert working hours to API format
        const schedules = [];

        Object.keys(workingHoursData).forEach(day => {
            const dayData = workingHoursData[day];
            if (dayData.isWorkingDay) {
                schedules.push({
                    day_of_week: day.toUpperCase(),
                    start_time: dayData.start,
                    end_time: dayData.end,
                    is_active: true
                });

                // Note: Lunch break is handled on frontend only, not saved to backend
                // to avoid creating actual working hours for break time
            } else {
                // For day off, send inactive schedule to remove existing slots
                schedules.push({
                    day_of_week: day.toUpperCase(),
                    start_time: dayData.start || '09:00',
                    end_time: dayData.end || '18:00',
                    is_active: false
                });
            }
        });

        const response = await fetch(`${API_BASE_URL}/slots/trainer/${trainerId}/schedule`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                schedules: schedules
            })
        });

        if (response.ok) {
            console.log('Working hours saved successfully');
            // Update local working hours data
            window.workingHoursData = workingHoursData;
            // Regenerate date tabs to reflect changes
            generateDateTabs();
            // Update schedule display only if current date matches the edited day
            if (currentDate && window.currentEditingDay) {
                const currentDayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                if (currentDayOfWeek === window.currentEditingDay) {
                    updateScheduleDisplay();
                }
            }
            return true;
        } else {
            console.error('Failed to save working hours:', response.status);
            return false;
        }
    } catch (error) {
        console.error('Error saving working hours:', error);
        return false;
    }
}

// Save trainer settings (price, duration, etc.)
async function saveTrainerSettings(settings) {
    if (!trainerId) {
        console.log('No trainer ID, cannot save settings');
        return false;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/users/trainer/${trainerId}/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (response.ok) {
            console.log('Trainer settings saved successfully');
            // Reload trainer data to get updated values
            await loadTrainerData();
            updateUIWithData();
            return true;
        } else {
            console.error('Failed to save trainer settings:', response.status);
            return false;
        }
    } catch (error) {
        console.error('Error saving trainer settings:', error);
        return false;
    }
}

// Update time options in booking form
function updateBookingTimeOptions() {
    console.log('updateBookingTimeOptions called');
    // Get the correct time grid (second one in bookingSheet)
    const timeGrids = document.querySelectorAll('#bookingSheet .time-grid');
    const timeGrid = timeGrids[1]; // Second time-grid is for time selection
    console.log('timeGrids found:', timeGrids.length, 'using index 1:', !!timeGrid);
    if (!timeGrid) return;

    // Get working hours for current date
    const workingHours = getWorkingHoursForDate(currentDate);
    console.log('Working hours for booking form:', workingHours);

    // Clear existing options
    timeGrid.innerHTML = '';
    console.log('Cleared existing time options');

    if (workingHours.length === 0) {
        timeGrid.innerHTML = '<div style="text-align: center; color: var(--tg-theme-hint-color);">Нет доступного времени</div>';
        return;
    }

    // Generate time options from available slots
    workingHours.forEach(slot => {
        let timeStr;
        if (typeof slot === 'number') {
            timeStr = `${slot.toString().padStart(2, '0')}:00`;
        } else {
            timeStr = slot.timeString;
        }

        // Check if this time slot is already booked
        const isBooked = bookings.some(booking => {
            const bookingDate = new Date(booking.datetime);
            return bookingDate.getHours() === (typeof slot === 'number' ? slot : slot.hour) &&
                   bookingDate.toDateString() === currentDate.toDateString();
        });

        // Check if this time slot should show lunch break
        const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const dayData = window.workingHoursData && window.workingHoursData[dayOfWeek];
        const isLunchBreak = dayData && dayData.hasBreak && (typeof slot === 'number' ? slot : slot.hour) === 12;

        const timeOption = document.createElement('div');
        timeOption.className = `time-option ${isBooked || isLunchBreak ? 'disabled' : ''}`;
        timeOption.textContent = timeStr;

        console.log(`Time slot ${timeStr}: booked=${isBooked}, lunchBreak=${isLunchBreak}, disabled=${isBooked || isLunchBreak}`);

        if (!isBooked && !isLunchBreak) {
            timeOption.onclick = () => {
                // Remove selection from all options
                document.querySelectorAll('.time-option').forEach(option => {
                    option.classList.remove('selected');
                });
                // Select this option
                timeOption.classList.add('selected');
                window.selectedTime = timeStr;

                // Haptic feedback
                if (window.Telegram && window.Telegram.WebApp) {
                    window.Telegram.WebApp.HapticFeedback.selectionChanged();
                }
            };
        }

        timeGrid.appendChild(timeOption);
    });

    // Auto-select the pre-selected time if available
    if (window.selectedTimeForBooking) {
        const targetOption = Array.from(timeGrid.children).find(option =>
            option.textContent === window.selectedTimeForBooking && !option.classList.contains('disabled')
        );
        if (targetOption) {
            targetOption.classList.add('selected');
            window.selectedTime = window.selectedTimeForBooking;
        }
        window.selectedTimeForBooking = null; // Clear after use
    }
}

// Make functions available globally for HTML
window.saveWorkingHoursAPI = saveWorkingHoursAPI;
window.saveTrainerSettings = saveTrainerSettings;
window.updateBookingTimeOptions = updateBookingTimeOptions;