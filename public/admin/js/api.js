/**
 * API client module for admin panel
 * Wraps fetch with authentication and error handling
 */

const API_BASE = '/api/admin';

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    if (!token && !endpoint.includes('/auth/login')) {
        throw new Error('Not authenticated');
    }

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        // Handle 401 Unauthorized
        if (response.status === 401) {
            logout();
            throw new Error('Session expired, please login again');
        }

        // Handle other errors
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `Request failed with status ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

/**
 * Dashboard API
 */
const dashboardAPI = {
    getStats: () => apiRequest('/dashboard/stats')
};

/**
 * Trainers API
 */
const trainersAPI = {
    list: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/trainers?${query}`);
    },
    get: (id) => apiRequest(`/trainers/${id}`),
    update: (id, data) => apiRequest(`/trainers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    })
};

/**
 * Clients API
 */
const clientsAPI = {
    list: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/clients?${query}`);
    },
    get: (id) => apiRequest(`/clients/${id}`)
};

/**
 * Clubs API (super_admin only)
 */
const clubsAPI = {
    list: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/clubs?${query}`);
    },
    get: (id) => apiRequest(`/clubs/${id}`),
    create: (data) => apiRequest('/clubs', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => apiRequest(`/clubs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => apiRequest(`/clubs/${id}`, {
        method: 'DELETE'
    }),
    listAdmins: (clubId) => apiRequest(`/clubs/${clubId}/admins`),
    createAdmin: (clubId, data) => apiRequest(`/clubs/${clubId}/admins`, {
        method: 'POST',
        body: JSON.stringify(data)
    })
};

/**
 * Auth API
 */
const authAPI = {
    login: (email, password) => login(email, password),
    me: () => getCurrentUser(),
    updateProfile: (data) => apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    changePassword: (oldPassword, newPassword) => apiRequest('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
            old_password: oldPassword,
            new_password: newPassword
        })
    })
};
