// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;

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
    // TODO: Navigate to booking page
    tg.showAlert('Открытие формы записи...');
}

// Contact trainer
function contactTrainer(trainerId) {
    // TODO: Open chat with trainer
    tg.showAlert('Открытие чата с тренером...');
}

// Show trainer schedule
function showTrainerSchedule(trainerId) {
    // TODO: Show trainer's available slots
    tg.showAlert('Загрузка расписания тренера...');
}

// Find new trainer
function findTrainer() {
    tg.showPopup({
        title: 'Найти тренера',
        message: 'Как вы хотите найти тренера?',
        buttons: [
            {id: 'link', type: 'default', text: 'У меня есть ссылка'},
            {id: 'qr', type: 'default', text: 'Сканировать QR-код'},
            {id: 'catalog', type: 'default', text: 'Каталог тренеров'},
            {type: 'cancel'}
        ]
    }, (buttonId) => {
        if (buttonId === 'link') {
            tg.showAlert('Попросите ссылку у вашего тренера');
        } else if (buttonId === 'qr') {
            tg.showAlert('Откройте камеру Telegram для сканирования QR');
        } else if (buttonId === 'catalog') {
            tg.openLink('https://trenergram.ru/trainers');
        }
    });
}

// Cancel training
function cancelTraining(bookingId) {
    tg.showConfirm('Вы уверены, что хотите отменить тренировку?', (confirmed) => {
        if (confirmed) {
            // TODO: Cancel booking via API
            tg.showAlert('Тренировка отменена');
        }
    });
}

// Handle training card clicks
document.querySelectorAll('.training-card').forEach(card => {
    card.addEventListener('click', function() {
        const status = this.querySelector('.training-status').classList.contains('pending') ? 'pending' : 'confirmed';

        tg.showPopup({
            title: 'Тренировка',
            message: 'Выберите действие',
            buttons: [
                {id: 'details', type: 'default', text: 'Подробнее'},
                {id: 'cancel', type: 'destructive', text: 'Отменить'},
                {type: 'cancel', text: 'Закрыть'}
            ]
        }, (buttonId) => {
            if (buttonId === 'cancel') {
                cancelTraining('booking_id');
            } else if (buttonId === 'details') {
                tg.showAlert('Загрузка деталей тренировки...');
            }
        });
    });
});

// Handle back button
tg.BackButton.show();
tg.BackButton.onClick(() => {
    tg.close();
});

// Set main button based on current tab
function updateMainButton() {
    const activeTab = document.querySelector('.tab-content.active').id;

    if (activeTab === 'upcoming') {
        tg.MainButton.setText('Записаться на тренировку');
        tg.MainButton.show();
        tg.MainButton.onClick(() => {
            findTrainer();
        });
    } else {
        tg.MainButton.hide();
    }
}

updateMainButton();