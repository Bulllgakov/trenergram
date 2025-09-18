// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;

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

// Functions
function showClients() {
    tg.showAlert('Открытие списка клиентов...');
    // TODO: Navigate to clients page
}

function showLink() {
    const trainerId = tg.initDataUnsafe?.user?.id || '123456';
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
    tg.showAlert('Загрузка статистики...');
    // TODO: Navigate to statistics page
}

function showSettings() {
    tg.showAlert('Открытие настроек...');
    // TODO: Navigate to settings page
}

function selectDate(direction) {
    currentDate.setDate(currentDate.getDate() + direction);
    loadSchedule();
}

function bookSlot(time) {
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
            // TODO: Show client selection
            tg.showAlert('Выбор клиента из списка...');
        } else if (buttonId === 'new') {
            // TODO: Show new client form
            tg.showAlert('Добавление нового клиента...');
        }
    });
}

function addBooking() {
    tg.showPopup({
        title: 'Новая запись',
        message: 'Выберите тип записи',
        buttons: [
            {id: 'client', type: 'default', text: 'Записать клиента'},
            {id: 'block', type: 'default', text: 'Заблокировать время'},
            {type: 'cancel'}
        ]
    }, (buttonId) => {
        if (buttonId === 'client') {
            bookSlot('выбранное время');
        } else if (buttonId === 'block') {
            tg.showAlert('Блокировка времени...');
        }
    });
}

function loadSchedule() {
    // TODO: Load schedule from API
    console.log('Loading schedule for', currentDate);
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

// Initial load
loadSchedule();