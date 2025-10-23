// API Integration for Trainer Mini App
// Preserves the original Telegram-style design
// Cache buster: 2025-10-07-1600

// Debug info for production troubleshooting
console.log('Page loaded over:', window.location.protocol);
console.log('Telegram WebApp version:', window.Telegram?.WebApp?.version);
console.log('HapticFeedback available:', !!window.Telegram?.WebApp?.HapticFeedback);
console.log('showAlert available:', !!window.Telegram?.WebApp?.showAlert);
console.log('showPopup available:', !!window.Telegram?.WebApp?.showPopup);

// Safe wrappers for Telegram WebApp API calls (globally accessible)
window.safeHapticFeedback = function(type, level) {
    try {
        const haptic = window.Telegram?.WebApp?.HapticFeedback;
        if (haptic && typeof haptic[type] === 'function') {
            haptic[type](level);
        }
    } catch (e) {
        console.log(`HapticFeedback.${type} not available:`, e.message);
    }
};

window.safeShowAlert = function(message, callback) {
    try {
        if (window.Telegram?.WebApp?.showAlert) {
            window.Telegram.WebApp.showAlert(message, callback);
        } else {
            alert(message);
            if (callback) callback();
        }
    } catch (e) {
        console.log('showAlert not available, using fallback');
        alert(message);
        if (callback) callback();
    }
};

window.safeShowPopup = function(params, callback) {
    try {
        if (window.Telegram?.WebApp?.showPopup) {
            window.Telegram.WebApp.showPopup(params, callback);
        } else {
            // Fallback to alert
            alert(params.message || params.title);
            if (callback) callback();
        }
    } catch (e) {
        console.log('showPopup not available, using fallback');
        alert(params.message || params.title);
        if (callback) callback();
    }
};

// Shortcuts for internal use
const safeHapticFeedback = window.safeHapticFeedback;
const safeShowAlert = window.safeShowAlert;
const safeShowPopup = window.safeShowPopup;

// Force HTTPS for all API calls - VERY EXPLICIT
const API_BASE_URL = 'https://trenergram.ru/api/v1';
console.log('API_BASE_URL FORCED to HTTPS:', API_BASE_URL);

// Ensure no other script can override our API_BASE_URL
Object.defineProperty(window, 'API_BASE_URL', {
    value: 'https://trenergram.ru/api/v1',
    writable: false,
    configurable: false
});

// Loading indicator for system updates
let loadingIndicator = null;

function showLoadingIndicator(message = '🔄 Обновление системы...') {
    if (loadingIndicator) return; // Already showing

    loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'system-loading-indicator';
    loadingIndicator.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            backdrop-filter: blur(4px);
        ">
            <div style="
                background: var(--tg-theme-bg-color, #ffffff);
                border-radius: 16px;
                padding: 24px 32px;
                text-align: center;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                min-width: 200px;
            ">
                <div style="
                    width: 48px;
                    height: 48px;
                    border: 4px solid var(--tg-theme-hint-color, #ccc);
                    border-top-color: var(--tg-theme-button-color, #3390ec);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 16px;
                "></div>
                <div style="
                    font-size: 16px;
                    color: var(--tg-theme-text-color, #000000);
                    font-weight: 500;
                ">${message}</div>
            </div>
        </div>
        <style>
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;
    document.body.appendChild(loadingIndicator);
}

function hideLoadingIndicator() {
    if (loadingIndicator) {
        loadingIndicator.remove();
        loadingIndicator = null;
    }
}

// Fetch with automatic retry and loading indicator
async function fetchWithRetry(url, options = {}, maxRetries = 5, showIndicator = true) {
    let lastError = null;
    let indicatorShown = false;
    let indicatorShowTime = 0;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            // Check for server errors (5xx) that should trigger retry
            if (response.status >= 500 && response.status < 600) {
                console.log(`Server error ${response.status}, will retry...`);

                // Show indicator on first server error
                if (showIndicator && attempt === 0 && !indicatorShown) {
                    showLoadingIndicator('⏳ Сервер обновляется...');
                    indicatorShown = true;
                    indicatorShowTime = Date.now();
                }

                // Treat 5xx as error and retry
                if (attempt < maxRetries - 1) {
                    const delay = Math.min(2000 * Math.pow(2, attempt), 32000);
                    console.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue; // Try again
                } else {
                    // Last attempt - return the error response
                    lastError = new Error(`Server error: ${response.status}`);
                    throw lastError;
                }
            }

            // Hide indicator on successful response (with minimum show time)
            if (indicatorShown) {
                const elapsedTime = Date.now() - indicatorShowTime;
                const minShowTime = 500; // Minimum 500ms to be noticeable
                if (elapsedTime < minShowTime) {
                    await new Promise(resolve => setTimeout(resolve, minShowTime - elapsedTime));
                }
                hideLoadingIndicator();
            }

            return response;
        } catch (error) {
            lastError = error;
            console.log(`Fetch attempt ${attempt + 1}/${maxRetries} failed:`, error.message);

            // Show indicator after first failed attempt
            if (showIndicator && attempt === 0 && !indicatorShown) {
                showLoadingIndicator('⏳ Переподключение к серверу...');
                indicatorShown = true;
                indicatorShowTime = Date.now();
            }

            // Don't retry if it's the last attempt
            if (attempt < maxRetries - 1) {
                // Exponential backoff: 2s, 4s, 8s, 16s, 32s
                const delay = Math.min(2000 * Math.pow(2, attempt), 32000);
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // All retries failed - hide indicator and throw error (with minimum show time)
    if (indicatorShown) {
        const elapsedTime = Date.now() - indicatorShowTime;
        const minShowTime = 500;
        if (elapsedTime < minShowTime) {
            await new Promise(resolve => setTimeout(resolve, minShowTime - elapsedTime));
        }
        hideLoadingIndicator();
    }
    throw lastError || new Error('Failed to fetch after multiple retries');
}
console.log('PROTECTED API_BASE_URL:', window.API_BASE_URL);

// Fetch interceptor to prevent Mixed Content errors
const originalFetch = window.fetch;
window.fetch = function(url, options) {
    // Handle Request objects
    if (url instanceof Request) {
        const requestUrl = url.url;
        if (requestUrl.includes('trenergram.ru') && requestUrl.startsWith('http://')) {
            console.log('Converting HTTP Request to HTTPS:', requestUrl);
            const newUrl = requestUrl.replace('http://', 'https://');
            url = new Request(newUrl, url);
        }
    } else if (typeof url === 'string') {
        if (url.includes('trenergram.ru')) {
            if (url.startsWith('http://')) {
                console.log('Converting HTTP URL to HTTPS:', url);
                url = url.replace('http://', 'https://');
            } else if (!url.startsWith('https://') && !url.startsWith('http')) {
                if (url.startsWith('/')) {
                    url = 'https://trenergram.ru' + url;
                } else {
                    url = 'https://trenergram.ru/' + url;
                }
            }
        }

        // FORCE ANY bookings URL to HTTPS
        if (url.includes('/bookings') && url.startsWith('http://')) {
            console.log('Converting bookings HTTP URL to HTTPS:', url);
            url = url.replace('http://', 'https://');
        }
    }

    return originalFetch.call(this, url, options);
};

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

    // Auto-refresh schedule every 30 seconds to catch status changes
    setInterval(async () => {
        console.log('Auto-refreshing schedule...');
        await loadSchedule();
        updateUIWithData();
    }, 30000); // 30 seconds

    console.log('API initialization complete');
}

// Load trainer data
async function loadTrainerData() {
    try {
        // Load trainer basic info
        const response = await fetchWithRetry(`${API_BASE_URL}/users/trainer/${trainerId}`);
        if (response.ok) {
            trainerData = await response.json();
            console.log('Trainer data loaded:', trainerData);
        }

        // Load trainer's clients from separate endpoint
        console.log('Loading clients for trainer:', trainerId);
        const clientsURL = `${API_BASE_URL}/users/trainer/${trainerId}/clients`;
        console.log('Clients API URL:', clientsURL);

        const clientsResponse = await fetchWithRetry(clientsURL);
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

// Load schedule for specific date
async function loadSchedule() {
    try {
        // Format current date for API (YYYY-MM-DDTHH:MM:SS)
        // Use local time, not UTC, to match the date displayed to user
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const fromDateStr = `${dateStr}T00:00:00`;
        const toDateStr = `${dateStr}T23:59:59`;

        // Use from_date and to_date to get only bookings for this specific day
        const url = `${API_BASE_URL}/bookings/trainer/${trainerId}?from_date=${fromDateStr}&to_date=${toDateStr}`;

        const response = await fetchWithRetry(url);
        if (response.ok) {
            bookings = await response.json();
            console.log(`Bookings loaded for ${fromDateStr} to ${toDateStr}:`, bookings);
        } else {
            console.error('Failed to load schedule:', response.status, response.statusText);
            bookings = [];
        }
    } catch (error) {
        console.error('Failed to load schedule:', error);
        bookings = [];
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
    const confirmed = bookings.filter(b => b.status.toUpperCase() === 'CONFIRMED').length;
    const pending = bookings.filter(b => b.status.toUpperCase() === 'PENDING').length;

    // Calculate free slots (8 working hours minus occupied)
    const totalSlots = 8;
    const busySlots = bookings.filter(b => b.status.toUpperCase() !== 'CANCELLED').length;
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

    // Get all bookings for current date (including those outside working hours)
    const currentDateStr = currentDate.toDateString();
    const dayBookings = bookings.filter(b => {
        const bookingDate = new Date(b.datetime);
        return bookingDate.toDateString() === currentDateStr;
    });
    console.log('Bookings for current date:', dayBookings);

    // Collect all time slots (working hours + bookings outside working hours)
    const allSlots = new Map(); // Map<timeStr, slot>

    // Add working hours slots
    workingHours.forEach(slot => {
        let timeStr, endTimeStr, hour;
        if (typeof slot === 'number') {
            hour = slot;
            timeStr = `${slot.toString().padStart(2, '0')}:00`;
            endTimeStr = `${(slot + 1).toString().padStart(2, '0')}:00`;
        } else {
            hour = slot.hour;
            timeStr = slot.timeString;
            endTimeStr = slot.endTimeString;
        }
        allSlots.set(timeStr, { timeStr, endTimeStr, hour, isWorkingHour: true });
    });

    // Add booking slots (even if outside working hours)
    dayBookings.forEach(booking => {
        const bookingDate = new Date(booking.datetime);
        const timeStr = `${bookingDate.getHours().toString().padStart(2, '0')}:${bookingDate.getMinutes().toString().padStart(2, '0')}`;
        if (!allSlots.has(timeStr)) {
            const hour = bookingDate.getHours();
            const endHour = hour + 1;
            const endTimeStr = `${endHour.toString().padStart(2, '0')}:${bookingDate.getMinutes().toString().padStart(2, '0')}`;
            allSlots.set(timeStr, { timeStr, endTimeStr, hour, isWorkingHour: false });
        }
    });

    // If no slots at all (day off and no bookings), show message
    if (allSlots.size === 0) {
        scheduleSection.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: var(--tg-theme-hint-color);">
                <div style="font-size: 48px; margin-bottom: 16px;">🏖️</div>
                <div style="font-size: 17px; font-weight: 500;">Выходной день</div>
                <div style="font-size: 14px; margin-top: 8px;">В этот день нет приёма</div>
            </div>
        `;
        return;
    }

    // Sort slots by time
    const sortedSlots = Array.from(allSlots.values()).sort((a, b) => {
        return a.timeStr.localeCompare(b.timeStr);
    });

    sortedSlots.forEach(slot => {
        const { timeStr, endTimeStr, hour, isWorkingHour } = slot;
        const displayTime = `${timeStr}<br>${endTimeStr}`;

        // Check if there's a booking at this time for the current date
        const booking = dayBookings.find(b => {
            const bookingDate = new Date(b.datetime);
            const bookingTimeStr = `${bookingDate.getHours().toString().padStart(2, '0')}:${bookingDate.getMinutes().toString().padStart(2, '0')}`;
            return bookingTimeStr === timeStr;
        });

        // Create time slot element
        const timeSlot = document.createElement('div');

        // Check if this time slot should show lunch break
        const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const dayData = window.workingHoursData && window.workingHoursData[dayOfWeek];
        const shouldShowLunchBreak = dayData && dayData.hasBreak && hour === 12 && isWorkingHour;

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
                    <div class="time-slot-info">${booking.service_name || 'Тренировка'} ${booking.status.toUpperCase() === 'PENDING' ? '• Ждет подтверждения' : ''}</div>
                </div>
                <div class="time-slot-status">
                    <div class="status-icon ${statusClass}">${statusIcon}</div>
                </div>
            `;
        } else if (isWorkingHour) {
            // Free slot (only for working hours)
            timeSlot.className = 'time-slot empty';
            timeSlot.dataset.time = timeStr;
            // Store date in YYYY-MM-DD format
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
            timeSlot.dataset.date = dateStr;
            timeSlot.onclick = () => quickBookAPI(timeStr, dateStr);

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

        if (timeSlot.className) {
            scheduleSection.appendChild(timeSlot);
        }
    });

    console.log('Schedule updated. Total slots added:', sortedSlots.length);
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

        if (status.toUpperCase() === 'PENDING') {
            buttons = [
                {id: 'confirm', type: 'default', text: 'Подтвердить запись'},
                {id: 'contact', type: 'default', text: 'Связаться с клиентом'},
                {id: 'cancel', type: 'destructive', text: 'Отменить'},
                {type: 'cancel'}
            ];
        } else if (status.toUpperCase() === 'CONFIRMED') {
            buttons = [
                {id: 'contact', type: 'default', text: 'Связаться с клиентом'},
                {id: 'cancel', type: 'destructive', text: 'Отменить'},
                {type: 'cancel'}
            ];
        }

        safeShowPopup({
            title: clientName,
            message: `${booking.service_name || 'Тренировка'}\nСтатус: ${getStatusText(status)}`,
            buttons: buttons
        }, async (buttonId) => {
            if (buttonId === 'confirm') {
                await confirmBookingAPI(booking.id);
            } else if (buttonId === 'cancel') {
                await cancelBookingAPI(booking.id);
            } else if (buttonId === 'contact' && booking.client_telegram_username) {
                if (tg.openLink) {
                    tg.openLink(`https://t.me/${booking.client_telegram_username}`);
                } else {
                    window.open(`https://t.me/${booking.client_telegram_username}`, '_blank');
                }
            }
        });
    } else {
        // Fallback for browser
        showNotification(`Управление записью: ${clientName}`);
    }
}

// Quick book for API
async function quickBookAPI(time, date) {
    console.log('quickBookAPI called for time:', time, 'date:', date);

    if (clients.length === 0) {
        showNotification('У вас пока нет клиентов. Поделитесь своей ссылкой для привлечения клиентов.');
        if (window.showLink) {
            window.showLink();
        }
        return;
    }

    // Store selected time globally for auto-selection
    window.selectedTimeForBooking = time;

    // Parse and store the date from the slot
    if (date) {
        const [year, month, day] = date.split('-').map(Number);
        window.currentDate = new Date(year, month - 1, day); // month is 0-indexed
        currentDate = window.currentDate; // Also update the local variable
        console.log('Set booking date to:', window.currentDate);
    }

    // Open booking sheet directly (skip quickBook to avoid race condition with auto-selection)
    if (window.openBookingSheet) {
        window.openBookingSheet();
    } else {
        console.error('openBookingSheet function not found');
    }
}

// Ensure showNotification exists with compatibility fallback
if (!window.showNotification) {
    window.showNotification = function(message) {
        safeShowAlert(message);
    };
}

// Confirm booking via API
async function confirmBookingAPI(bookingId) {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/bookings/${bookingId}/confirm`, {
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
        const response = await fetchWithRetry(`${API_BASE_URL}/bookings/${bookingId}?telegram_id=${trainerId}&reason=Отменено тренером`, {
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

            // Get balance and stats from API response (now includes balance)
            const balance = client.balance || 0;
            const totalBookings = client.total_bookings || 0;
            const upcomingBookings = bookings.filter(b =>
                b.client_telegram_id === client.telegram_id &&
                new Date(b.datetime) >= new Date()
            ).length;

            clientCard.innerHTML = `
                <div class="client-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: var(--tg-theme-button-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 12px;">
                    ${initials}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 16px; font-weight: 500;">${client.name || 'Клиент'}</div>
                    <div style="font-size: 13px; color: var(--tg-theme-hint-color);">
                        ${totalBookings} тренировок • ${upcomingBookings} предстоящих
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                    <div style="text-align: right;">
                        <div style="font-size: 14px; font-weight: 600; color: ${balance >= 0 ? 'var(--tg-theme-text-color)' : 'var(--tg-theme-destructive-text-color)'};">
                            ${balance} ₽
                        </div>
                    </div>
                    <button
                        onclick="event.stopPropagation(); openTopupSheet('${client.telegram_id}', '${client.name}', ${balance});"
                        style="padding: 6px 12px; background: var(--tg-theme-button-color); color: var(--tg-theme-button-text-color); border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">
                        💰
                    </button>
                </div>
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
    const completedBookings = clientBookings.filter(b => b.status.toUpperCase() === 'COMPLETED').length;
    const upcomingBookings = clientBookings.filter(b => new Date(b.datetime) >= new Date() && b.status.toUpperCase() !== 'CANCELLED');

    // Get balance and stats from API response
    const balance = client.balance || 0;
    const totalSpent = client.total_spent || 0;
    const avgBookingsPerMonth = client.avg_bookings_per_month || 0;

    let message = `👤 ${client.name || 'Клиент'}\n\n`;

    message += `💰 Финансы:\n`;
    message += `• Баланс: ${balance} ₽\n`;
    message += `• Потрачено за всё время: ${totalSpent} ₽\n\n`;

    message += `📊 Статистика:\n`;
    message += `• Осталось тренировок: ${client.remaining_trainings || 0}\n`;
    message += `• Завершено: ${client.completed_bookings || 0}\n`;
    message += `• Отменено: ${client.cancelled_bookings || 0}\n`;
    message += `• Предстоящих: ${upcomingBookings.length}\n`;
    message += `• Тренировок/мес: ${avgBookingsPerMonth}\n\n`;

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

    safeShowPopup({
        title: 'Информация о клиенте',
        message: message,
        buttons: [
            client.telegram_username ? {id: 'contact', type: 'default', text: 'Написать клиенту'} : null,
            {id: 'book', type: 'default', text: 'Записать на тренировку'},
            {type: 'close'}
        ].filter(Boolean)
    }, (buttonId) => {
        if (buttonId === 'contact' && client.telegram_username) {
            if (window.Telegram?.WebApp?.openLink) {
                window.Telegram.WebApp.openLink(`https://t.me/${client.telegram_username}`);
            } else {
                window.open(`https://t.me/${client.telegram_username}`, '_blank');
            }
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

// Share trainer link
window.shareTrainerLink = function() {
    if (window.showLink) {
        window.showLink();
    }
};

// Override showLink to use real trainer ID - but make it empty
// because it's called when clicking empty slot with no clients
const originalShowLink = window.showLink;
window.showLink = function() {
    // Do nothing - link alert removed per user request
    // User will see only the notification about no clients
};

// Separate function for "My Link" button in interface
window.showLinkButton = function() {
    const link = `https://t.me/trenergram_bot?start=trainer_${trainerId}`;

    // Copy link to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(() => {
            // Show success notification
            if (window.safeShowPopup) {
                safeShowPopup({
                    title: '✅ Ссылка скопирована!',
                    message: 'Теперь вы можете поделиться ею с клиентами',
                    buttons: [
                        {
                            id: 'share',
                            type: 'default',
                            text: 'Поделиться'
                        },
                        {
                            id: 'close',
                            type: 'cancel',
                            text: 'Закрыть'
                        }
                    ]
                }, (buttonId) => {
                    if (buttonId === 'share') {
                        // Open Telegram share dialog
                        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Запишись на тренировку через этот бот!')}`;
                        if (window.Telegram && window.Telegram.WebApp) {
                            window.Telegram.WebApp.openTelegramLink(shareUrl);
                        } else {
                            window.open(shareUrl, '_blank');
                        }
                    }
                });
            } else if (window.safeShowAlert) {
                safeShowAlert('✅ Ссылка скопирована в буфер обмена!');
            }
        }).catch(err => {
            console.error('Failed to copy link:', err);
            // Fallback: show link in alert
            if (window.safeShowAlert) {
                safeShowAlert(`📎 Ваша ссылка для клиентов:\n\n${link}\n\nСкопируйте и отправьте клиентам для регистрации.`);
            }
        });
    } else {
        // Fallback for browsers without clipboard API
        if (window.safeShowAlert) {
            safeShowAlert(`📎 Ваша ссылка для клиентов:\n\n${link}\n\nСкопируйте и отправьте клиентам для регистрации.`);
        }
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
        const response = await fetchWithRetry(`${API_BASE_URL}/users/trainer/${trainerId}/settings`, {
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

    // Update date display
    updateDateDisplay();

    // Show loading indicator
    const scheduleSection = document.getElementById('scheduleSection');
    if (scheduleSection) {
        scheduleSection.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: var(--tg-theme-hint-color);">
                <div style="font-size: 32px; margin-bottom: 16px;">⏳</div>
                <div style="font-size: 15px;">Загрузка расписания...</div>
            </div>
        `;
    }

    // Load schedule for new date and update display
    await loadSchedule();
    updateUIWithData();
};

// Override confirmBooking in existing UI to use API
const originalConfirmBooking = window.confirmBooking;
window.confirmBooking = async function() {
    const clientSearch = document.getElementById('clientSearch');
    // Check client from multiple sources
    const selectedClient = window.selectedClient || (clientSearch ? clientSearch.value : null);
    // Check both possible time variables
    const selectedTime = window.selectedTimeForBooking || window.selectedTime;

    console.log('confirmBooking called:', {
        selectedClient,
        selectedTime,
        clientSearchValue: clientSearch?.value,
        windowSelectedClient: window.selectedClient,
        windowSelectedTime: window.selectedTime,
        windowSelectedTimeForBooking: window.selectedTimeForBooking,
        clientsArray: clients?.length
    });

    if (selectedClient && selectedTime) {
        // Find client by name
        const client = clients.find(c => c.name === selectedClient);

        if (client) {
            try {
                const [hour, minute] = selectedTime.split(':');
                const bookingDate = new Date(currentDate);
                bookingDate.setHours(parseInt(hour), parseInt(minute || 0), 0, 0);

                // According to TZ 10.6: all bookings created by trainer start as PENDING
                // No notifications sent immediately. First reminder = first notification to client.
                const bookingData = {
                    trainer_telegram_id: trainerId.toString(),
                    client_telegram_id: client.telegram_id.toString(),
                    datetime: bookingDate.toISOString(),
                    duration: 60,
                    status: 'PENDING',
                    created_by: 'trainer'
                };

                // Use hardcoded HTTPS URL to prevent Mixed Content errors
                const response = await fetchWithRetry('https://trenergram.ru/api/v1/bookings/', {
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
        // No client or time selected
        safeHapticFeedback('notificationOccurred', 'error');
        safeShowAlert('Выберите клиента и время');
    }
};

// Update client list in booking sheet when it opens
const originalOpenBookingSheet = window.openBookingSheet;
window.openBookingSheet = async function() {
    console.log('Custom openBookingSheet called');

    // Load clients list first
    loadClientsList();

    // Call original function to open the sheet UI
    if (originalOpenBookingSheet) {
        console.log('Calling original openBookingSheet');
        originalOpenBookingSheet();
    } else {
        console.log('No original openBookingSheet found');
    }

    // Load actual booking data from database
    console.log('Loading booking data...');
    const dataLoaded = await loadBookingData();

    if (dataLoaded) {
        console.log('Booking data loaded successfully, updating time options');
        // Update time options with fresh data
        // Increased delay to ensure DOM is fully rendered
        setTimeout(() => {
            updateBookingTimeOptions();
        }, 200);

        // Retry auto-selection after a bit more time if needed
        if (window.selectedTimeForBooking) {
            setTimeout(() => {
                if (window.selectedTimeForBooking) {
                    console.log('Retrying auto-selection...');
                    updateBookingTimeOptions();
                }
            }, 500);
        }
    } else {
        console.error('Failed to load booking data');
        // Still try to update with existing data
        setTimeout(() => {
            updateBookingTimeOptions();
        }, 200);
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
            return []; // Return empty array for day off
        }

        // Generate time slots based on session duration
        const slots = generateTimeSlots(dayData.start, dayData.end, dayData.hasBreak);
        console.log('Generated slots for', dayOfWeek, ':', slots);
        return slots;
    }

    console.log('No working hours data - using trainer settings fallback');
    // Fallback to trainer settings if available
    if (trainerData && trainerData.settings && trainerData.settings.work_hours) {
        const dayData = trainerData.settings.work_hours[dayOfWeek];
        if (dayData) {
            if (!dayData.is_working) {
                return []; // Day off
            }
            return generateTimeSlots(dayData.start, dayData.end);
        }
    }

    // Final fallback: default schedule from registration
    // Monday-Friday: 9:00-18:00, Saturday: 9:00-13:00, Sunday: off
    if (dayOfWeek === 'sunday') {
        return []; // Sunday is day off
    }
    const defaultStart = '09:00';
    const defaultEnd = (dayOfWeek === 'saturday') ? '13:00' : '18:00';

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

        const response = await fetchWithRetry(`${API_BASE_URL}/slots/trainer/${trainerId}/schedule`, {
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
        const response = await fetchWithRetry(`${API_BASE_URL}/slots/trainer/${trainerId}/schedule`);
        if (response.ok) {
            const schedules = await response.json();

            // Convert to UI format - initialize empty object
            const workingHoursData = {};

            schedules.forEach(schedule => {
                const day = schedule.day_of_week.toLowerCase();
                if (schedule.is_active) {
                    // Active working schedule
                    workingHoursData[day] = {
                        isWorkingDay: true,
                        start: schedule.start_time,
                        end: schedule.end_time,
                        hasBreak: schedule.has_break || false
                    };
                } else {
                    // Inactive schedule - day off
                    workingHoursData[day] = {
                        isWorkingDay: false,
                        start: schedule.start_time,
                        end: schedule.end_time,
                        hasBreak: schedule.has_break || false
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
        // Store date in YYYY-MM-DD format
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        timeSlot.dataset.date = dateStr;
        timeSlot.onclick = () => {
            console.log('Slot clicked:', timeStr, 'date:', dateStr);
            if (typeof quickBookAPI === 'function') {
                quickBookAPI(timeStr, dateStr);
            } else if (typeof quickBook === 'function') {
                quickBook(timeStr);
            } else {
                // Fallback
                safeShowAlert(`Выбрано время: ${displayTime}\nФункция записи будет доступна после загрузки`);
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
    if (priceElement) {
        if (trainerData.price) {
            priceElement.textContent = `${trainerData.price}₽`;
        } else {
            priceElement.textContent = 'Не указана';
            priceElement.style.color = '#999';
        }
    }

    // Update club name
    const clubElement = document.getElementById('clubNameSettings');
    if (clubElement) {
        clubElement.textContent = trainerData.club_name || 'Независимый тренер';
    }

    // Update cancellation hours
    if (trainerData.settings && trainerData.settings.cancellation_hours) {
        window.trainerSettings = trainerData.settings;
        const cancellationDesc = document.querySelector('[onclick="openTransferSettings()"] .setting-description');
        if (cancellationDesc) {
            const hours = trainerData.settings.cancellation_hours;
            cancellationDesc.textContent = `За ${hours} часов списываются деньги с баланса клиента`;
        }
    }

    // Update reminder settings from backend
    if (trainerData.reminder_1_days_before !== undefined) {
        window.selectedDaysValue = trainerData.reminder_1_days_before;
    }
    if (trainerData.reminder_2_hours_after !== undefined) {
        window.selectedAfterHoursSecond = trainerData.reminder_2_hours_after;
    }
    if (trainerData.reminder_3_hours_after !== undefined) {
        window.selectedAfterHoursThird = trainerData.reminder_3_hours_after;
    }
    if (trainerData.auto_cancel_hours_after !== undefined) {
        window.selectedAfterHoursCancel = trainerData.auto_cancel_hours_after;
    }

    // Update first reminder description
    if (trainerData.reminder_1_time) {
        const firstReminderDesc = document.getElementById('firstReminderDesc');
        if (firstReminderDesc) {
            const days = trainerData.reminder_1_days_before || 1;
            const daysText = days === 1 ? 'день' : (days === 2 ? 'два дня' : 'три дня');
            // Remove seconds from time display (HH:MM:SS -> HH:MM)
            const timeWithoutSeconds = trainerData.reminder_1_time.substring(0, 5);
            firstReminderDesc.textContent = `За ${daysText} в ${timeWithoutSeconds}`;
        }
    }

    // Update second reminder description with calculated time
    const secondReminderDesc = document.getElementById('secondReminderDesc');
    if (secondReminderDesc && trainerData.reminder_2_hours_after !== undefined && trainerData.reminder_1_time) {
        const hours = trainerData.reminder_2_hours_after;
        const hoursText = hours === 1 ? 'час' : (hours === 2 ? 'два' : 'три');

        // Calculate time for second reminder
        const firstTime = trainerData.reminder_1_time.substring(0, 5).split(':');
        const firstHour = parseInt(firstTime[0]);
        const firstMinute = parseInt(firstTime[1]);
        const secondHour = (firstHour + hours) % 24;
        const secondTime = `${String(secondHour).padStart(2, '0')}:${String(firstMinute).padStart(2, '0')}`;

        secondReminderDesc.textContent = `Через ${hoursText} после первого в ${secondTime}`;
    }

    // Update third reminder description with calculated time
    const thirdReminderDesc = document.getElementById('thirdReminderDesc');
    if (thirdReminderDesc && trainerData.reminder_3_hours_after !== undefined && trainerData.reminder_2_hours_after !== undefined && trainerData.reminder_1_time) {
        const hours = trainerData.reminder_3_hours_after;
        const hoursText = hours === 1 ? 'час' : (hours === 2 ? 'два' : 'три');

        // Calculate time for third reminder (first + second hours + third hours)
        const firstTime = trainerData.reminder_1_time.substring(0, 5).split(':');
        const firstHour = parseInt(firstTime[0]);
        const firstMinute = parseInt(firstTime[1]);
        const thirdHour = (firstHour + trainerData.reminder_2_hours_after + hours) % 24;
        const thirdTime = `${String(thirdHour).padStart(2, '0')}:${String(firstMinute).padStart(2, '0')}`;

        thirdReminderDesc.textContent = `Через ${hoursText} после второго в ${thirdTime}`;
    }

    // Update cancel reminder description with calculated time
    const cancelReminderDesc = document.getElementById('cancelReminderDesc');
    if (cancelReminderDesc && trainerData.auto_cancel_hours_after !== undefined && trainerData.reminder_2_hours_after !== undefined && trainerData.reminder_3_hours_after !== undefined && trainerData.reminder_1_time) {
        const hours = trainerData.auto_cancel_hours_after;
        const hoursText = hours === 1 ? 'час' : (hours === 2 ? 'два' : 'три');

        // Calculate time for cancel (first + second hours + third hours + cancel hours)
        const firstTime = trainerData.reminder_1_time.substring(0, 5).split(':');
        const firstHour = parseInt(firstTime[0]);
        const firstMinute = parseInt(firstTime[1]);
        const cancelHour = (firstHour + trainerData.reminder_2_hours_after + trainerData.reminder_3_hours_after + hours) % 24;
        const cancelTime = `${String(cancelHour).padStart(2, '0')}:${String(firstMinute).padStart(2, '0')}`;

        cancelReminderDesc.textContent = `Через ${hoursText} после третьего в ${cancelTime}`;
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
        const balance = client.balance || 0;
        const balanceStyle = balance < 0 ? 'color: var(--tg-theme-destructive-text-color);' : '';
        const balanceText = balance < 0 ? `${balance}₽` : `${balance.toLocaleString()}₽`;

        clientElement.innerHTML = `
            <div class="client-avatar">${initials}</div>
            <div class="client-info" style="flex: 1;">
                <div class="client-name">${client.name || 'Клиент'}</div>
                <div style="font-size: 14px; ${balanceStyle}">💰 ${balanceText}</div>
            </div>
            <button class="profile-button" onclick="event.stopPropagation(); openClientProfile('${client.telegram_id}')">Профиль</button>
        `;

        clientsListElement.appendChild(clientElement);
    });
}

// Open client profile with full details
function openClientProfile(clientTelegramId) {
    const client = clients.find(c => c.telegram_id === clientTelegramId);
    if (!client) {
        safeShowAlert('Клиент не найден');
        return;
    }

    // Set topup button click handler with client ID
    const topupButton = document.getElementById('topupButton');
    if (topupButton) {
        topupButton.onclick = () => openTopupForClient(client.telegram_id);
    }

    // Set avatar and name
    const initials = (client.name || 'C').split(' ').map(n => n[0]).join('').toUpperCase();
    document.getElementById('clientProfileAvatar').textContent = initials;
    document.getElementById('clientProfileName').textContent = client.name || 'Клиент';
    document.getElementById('clientProfilePhone').textContent = client.phone || '—';

    // Set balance
    const balance = client.balance || 0;
    const balanceElement = document.getElementById('clientProfileBalance');
    balanceElement.textContent = `${balance.toLocaleString()}₽`;

    // Set remaining trainings with proper word declension
    const remainingTrainings = client.remaining_trainings || 0;
    let trainingsWord;
    if (remainingTrainings === 1) {
        trainingsWord = 'тренировка';
    } else if (remainingTrainings >= 2 && remainingTrainings <= 4) {
        trainingsWord = 'тренировки';
    } else {
        trainingsWord = 'тренировок';
    }
    document.getElementById('clientProfileRemainingTrainings').textContent = `${remainingTrainings} ${trainingsWord}`;
    document.getElementById('clientProfileCompletedBookings').textContent = client.completed_bookings || 0;
    document.getElementById('clientProfileTotalSpent').textContent = `${(client.total_spent || 0).toLocaleString()}₽`;
    document.getElementById('clientProfileAvgPerMonth').textContent = (client.avg_bookings_per_month || 0).toFixed(1);

    // Set contact info
    document.getElementById('clientProfilePhoneDetail').textContent = client.phone || '—';

    // Set Telegram link
    const telegramContainer = document.getElementById('clientProfileTelegramContainer');
    const telegramLink = document.getElementById('clientProfileTelegram');
    if (client.telegram_username) {
        telegramContainer.style.display = 'block';
        telegramLink.textContent = `@${client.telegram_username}`;
        telegramLink.href = `https://t.me/${client.telegram_username}`;
    } else {
        telegramContainer.style.display = 'none';
    }

    // Set Email
    const emailContainer = document.getElementById('clientProfileEmailContainer');
    if (client.email) {
        emailContainer.style.display = 'block';
        document.getElementById('clientProfileEmail').textContent = client.email;
    } else {
        emailContainer.style.display = 'none';
    }

    // Open the sheet
    const sheet = document.getElementById('clientProfileSheet');
    const overlay = document.getElementById('overlay');
    sheet.classList.add('active');
    overlay.classList.add('active');

    if (window.safeHapticFeedback) {
        window.safeHapticFeedback('impactOccurred', 'light');
    }
}

// Open topup sheet for current client
function openTopupForClient(clientTelegramId) {
    const client = clients.find(c => c.telegram_id === clientTelegramId);
    if (!client) {
        safeShowAlert('Клиент не найден');
        return;
    }

    // Close client profile
    closeSheet('clientProfileSheet');

    // Set client info in topup sheet
    document.getElementById('topupClientName').textContent = client.name || 'Клиент';
    document.getElementById('topupCurrentBalance').textContent = `${(client.balance || 0).toLocaleString()}₽`;

    // Store client for topup submission
    window.currentClientForTopup = client;

    // Open topup sheet
    const sheet = document.getElementById('topupBalanceSheet');
    const overlay = document.getElementById('overlay');
    sheet.classList.add('active');
    overlay.classList.add('active');
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

        const response = await fetchWithRetry(`${API_BASE_URL}/slots/trainer/${trainerId}/schedule`, {
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
        const response = await fetchWithRetry(`${API_BASE_URL}/users/trainer/${trainerId}/settings`, {
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

    // Get the time grid for booking time selection
    const timeGrid = document.querySelector('#bookingSheet .time-grid');
    console.log('timeGrid found:', !!timeGrid);
    if (!timeGrid) {
        console.error('Time grid not found in booking sheet');
        return;
    }

    // Show loading indicator immediately
    console.log('Showing loading indicator');
    timeGrid.innerHTML = '<div style="text-align: center; color: var(--tg-theme-hint-color); padding: 20px;">Загрузка доступного времени...</div>';

    // Ensure currentDate is available
    const currentDate = window.currentDate || new Date();
    console.log('Using currentDate:', currentDate);

    // Check if working hours data is available
    if (!window.workingHoursData) {
        console.log('Working hours data not available yet, keeping loading message');
        return;
    }

    // Get working hours for current date
    const workingHours = getWorkingHoursForDate(currentDate);
    console.log('Working hours for booking form:', workingHours);

    // Get current bookings (should be loaded by loadBookingData)
    const currentBookings = window.bookings || [];
    console.log('Current bookings:', currentBookings);

    // Save currently selected time before clearing (to preserve selection during re-render)
    const previouslySelectedTime = window.selectedTime || window.selectedTimeForBooking;
    console.log('Previously selected time:', previouslySelectedTime);

    // Clear existing options
    timeGrid.innerHTML = '';
    console.log('Cleared existing time options');

    if (workingHours.length === 0) {
        timeGrid.innerHTML = '<div style="text-align: center; color: var(--tg-theme-hint-color); padding: 20px;">Нет доступного времени на выбранную дату</div>';
        return;
    }

    // Generate time options from available slots
    workingHours.forEach(slot => {
        let timeStr;
        let hour;
        if (typeof slot === 'number') {
            timeStr = `${slot.toString().padStart(2, '0')}:00`;
            hour = slot;
        } else {
            timeStr = slot.timeString;
            hour = slot.hour;
        }

        // Check if this time slot is already booked
        const isBooked = currentBookings.some(booking => {
            const bookingDate = new Date(booking.datetime);
            return bookingDate.getHours() === hour &&
                   bookingDate.toDateString() === currentDate.toDateString() &&
                   booking.status.toUpperCase() !== 'CANCELLED';
        });

        console.log(`Time slot ${timeStr}: hour=${hour}, isBooked=${isBooked}`);

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
                safeHapticFeedback('selectionChanged');
            };
        }

        timeGrid.appendChild(timeOption);
    });

    // Auto-select the pre-selected time if available (from either source)
    const timeToSelect = window.selectedTimeForBooking || previouslySelectedTime;

    if (timeToSelect) {
        console.log('Attempting to auto-select time:', timeToSelect);
        console.log('Available options:', Array.from(timeGrid.children).map(o => ({ text: o.textContent, disabled: o.classList.contains('disabled') })));

        const targetOption = Array.from(timeGrid.children).find(option =>
            option.textContent === timeToSelect && !option.classList.contains('disabled')
        );

        if (targetOption) {
            console.log('✅ Auto-selected time slot:', timeToSelect);
            targetOption.classList.add('selected');
            window.selectedTime = timeToSelect;

            // Only clear selectedTimeForBooking, not selectedTime
            if (window.selectedTimeForBooking) {
                window.selectedTimeForBooking = null;
            }
        } else {
            console.warn('❌ Could not auto-select time slot:', timeToSelect, '- slot not found or disabled');
            // Don't clear selectedTimeForBooking - will retry on next updateBookingTimeOptions call
        }
    }
}

// Load booking data for quick booking sheet
async function loadBookingData() {
    console.log('loadBookingData called');

    try {
        // Ensure currentDate is set
        if (!window.currentDate) {
            window.currentDate = new Date();
            console.log('Set currentDate to today:', window.currentDate);
        }

        // Load trainer bookings for the current date to check availability
        if (!trainerId) {
            console.error('No trainer ID available');
            return false;
        }

        const response = await fetchWithRetry(`https://trenergram.ru/api/v1/bookings/trainer/${trainerId}`);
        if (!response.ok) {
            console.error('Failed to load bookings:', response.status);
            return false;
        }

        const allBookings = await response.json();
        console.log('Loaded bookings:', allBookings);

        // Update global bookings variable with current data
        window.bookings = allBookings || [];

        // Also update the bookings used by main schedule if needed
        if (typeof updateMainSchedule === 'function') {
            updateMainSchedule();
        }

        return true;
    } catch (error) {
        console.error('Error loading booking data:', error);
        return false;
    }
}

// Balance topup functions
let currentTopupClient = null;

function openTopupSheet(clientTelegramId, clientName, currentBalance) {
    currentTopupClient = clientTelegramId;

    // Fill in client details
    document.getElementById('topupClientName').textContent = clientName;
    document.getElementById('topupCurrentBalance').textContent = `${currentBalance} ₽`;
    document.getElementById('topupAmount').value = '';

    // Open sheet
    const sheet = document.getElementById('topupBalanceSheet');
    if (sheet) {
        sheet.classList.add('active');
        document.getElementById('overlay').classList.add('active');
    }
}

async function confirmTopup() {
    const amount = parseInt(document.getElementById('topupAmount').value);

    if (!amount || amount <= 0) {
        safeShowAlert('Пожалуйста, введите корректную сумму');
        return;
    }

    if (!currentTopupClient) {
        safeShowAlert('Ошибка: клиент не выбран');
        return;
    }

    try {
        const response = await fetchWithRetry(
            `${API_BASE_URL}/users/trainer/${trainerId}/client/${currentTopupClient}/topup`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount })
            }
        );

        if (response.ok) {
            const result = await response.json();
            safeShowAlert(`✅ Баланс пополнен!\n\n${result.client_name}\nСумма: +${amount} ₽\nНовый баланс: ${result.new_balance} ₽`);

            // Close sheet and reload clients
            closeSheet('topupBalanceSheet');
            await showClients();
        } else {
            const error = await response.json();
            safeShowAlert(`Ошибка: ${error.detail || 'Не удалось пополнить баланс'}`);
        }
    } catch (error) {
        console.error('Error topping up balance:', error);
        safeShowAlert('Ошибка при пополнении баланса');
    }
}

// Make functions available globally for HTML
window.saveWorkingHoursAPI = saveWorkingHoursAPI;
window.saveTrainerSettings = saveTrainerSettings;
window.updateBookingTimeOptions = updateBookingTimeOptions;
window.loadBookingData = loadBookingData;
window.openTopupSheet = openTopupSheet;
window.confirmTopup = confirmTopup;