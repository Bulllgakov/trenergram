/**
 * Utility functions for admin panel
 */

/**
 * Format date in Russian locale
 */
function formatDate(date, options = {}) {
    if (!date) return '-';

    const d = typeof date === 'string' ? new Date(date) : date;

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    };

    return d.toLocaleDateString('ru-RU', defaultOptions);
}

/**
 * Format datetime in Russian locale
 */
function formatDateTime(date) {
    if (!date) return '-';

    const d = typeof date === 'string' ? new Date(date) : date;

    return d.toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format phone number
 */
function formatPhone(phone) {
    if (!phone) return '-';

    // Remove non-digits
    const digits = phone.replace(/\D/g, '');

    // Format as +7 (XXX) XXX-XX-XX
    if (digits.length === 11 && digits.startsWith('7')) {
        return `+7 (${digits.substr(1, 3)}) ${digits.substr(4, 3)}-${digits.substr(7, 2)}-${digits.substr(9, 2)}`;
    }

    return phone;
}

/**
 * Format price in rubles
 */
function formatPrice(price) {
    if (price === null || price === undefined) return '-';
    return `${price.toLocaleString('ru-RU')} ₽`;
}

/**
 * Get status badge HTML
 */
function getStatusBadge(status) {
    const badges = {
        'active': '<span class="badge bg-success">Активен</span>',
        'inactive': '<span class="badge bg-secondary">Неактивен</span>',
        'pending': '<span class="badge bg-warning">Ожидание</span>',
        'confirmed': '<span class="badge bg-success">Подтверждено</span>',
        'cancelled': '<span class="badge bg-danger">Отменено</span>',
        'completed': '<span class="badge bg-info">Завершено</span>'
    };

    return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
}

/**
 * Get tariff badge HTML
 */
function getTariffBadge(tariff) {
    const badges = {
        'basic': '<span class="badge bg-secondary">Basic</span>',
        'standard': '<span class="badge bg-primary">Standard</span>',
        'premium': '<span class="badge bg-success">Premium</span>'
    };

    return badges[tariff] || `<span class="badge bg-secondary">${tariff}</span>`;
}

/**
 * Show loading spinner
 */
function showLoading(element) {
    if (typeof element === 'string') {
        element = document.querySelector(element);
    }
    if (element) {
        element.innerHTML = '<div class="text-center p-4"><div class="spinner-border" role="status"><span class="visually-hidden">Загрузка...</span></div></div>';
    }
}

/**
 * Show error message
 */
function showError(element, message) {
    if (typeof element === 'string') {
        element = document.querySelector(element);
    }
    if (element) {
        element.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
    }
}

/**
 * Show success message
 */
function showSuccess(element, message) {
    if (typeof element === 'string') {
        element = document.querySelector(element);
    }
    if (element) {
        element.innerHTML = `<div class="alert alert-success" role="alert">${message}</div>`;
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
    toast.style.zIndex = '9999';
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
