/**
 * Authentication module for admin panel
 * Manages JWT tokens and user authentication
 */

const AUTH_TOKEN_KEY = 'trenergram_admin_token';
const USER_DATA_KEY = 'trenergram_admin_user';

/**
 * Save JWT token to localStorage
 */
function saveToken(token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/**
 * Get JWT token from localStorage
 */
function getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Remove JWT token from localStorage
 */
function removeToken() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
}

/**
 * Save user data to localStorage
 */
function saveUserData(userData) {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
}

/**
 * Get user data from localStorage
 */
function getUserData() {
    const data = localStorage.getItem(USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    const token = getToken();
    if (!token) return false;

    // Check if token is expired (simple JWT decode)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // Convert to milliseconds
        return Date.now() < exp;
    } catch (e) {
        return false;
    }
}

/**
 * Get user role from token
 */
function getUserRole() {
    const userData = getUserData();
    return userData ? userData.role : null;
}

/**
 * Check if user is super admin
 */
function isSuperAdmin() {
    const userData = getUserData();
    return userData && userData.role === 'owner' && !userData.club_id;
}

/**
 * Get club ID from user data
 */
function getClubId() {
    const userData = getUserData();
    return userData ? userData.club_id : null;
}

/**
 * Redirect to login if not authenticated
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/admin/login.html';
        return false;
    }
    return true;
}

/**
 * Logout user and redirect to login
 */
function logout() {
    removeToken();
    window.location.href = '/admin/login.html';
}

/**
 * Login with email and password
 */
async function login(email, password) {
    try {
        const response = await fetch('/api/admin/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }

        const data = await response.json();
        saveToken(data.access_token);
        saveUserData(data.user);

        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

/**
 * Get current user info from API
 */
async function getCurrentUser() {
    const token = getToken();
    if (!token) {
        throw new Error('No token found');
    }

    try {
        const response = await fetch('/api/admin/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                logout();
            }
            throw new Error('Failed to get user info');
        }

        const userData = await response.json();
        saveUserData(userData);
        return userData;
    } catch (error) {
        console.error('Get current user error:', error);
        throw error;
    }
}
