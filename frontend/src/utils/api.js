import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add Telegram auth data to requests
api.interceptors.request.use((config) => {
  const tg = window.Telegram?.WebApp;
  if (tg?.initData) {
    config.headers['X-Telegram-Init-Data'] = tg.initData;
  }
  return config;
});

// Trainer API
export const trainerAPI = {
  getProfile: (telegramId) => api.get(`/users/trainer/${telegramId}`),
  updateProfile: (telegramId, data) => api.put(`/users/profile?telegram_id=${telegramId}`, data),
  getClients: (telegramId) => api.get(`/users/trainer/${telegramId}/clients`),
  getBookings: (telegramId) => api.get(`/bookings/trainer/${telegramId}`),
  getSchedule: (telegramId) => api.get(`/schedule/trainer/${telegramId}`),
  updateSchedule: (telegramId, data) => api.put(`/schedule/trainer/${telegramId}`, data),
  getStats: (telegramId) => api.get(`/users/trainer/${telegramId}/stats`),
};

// Client API
export const clientAPI = {
  getProfile: (telegramId) => api.get(`/users/client/${telegramId}`),
  updateProfile: (telegramId, data) => api.put(`/users/profile?telegram_id=${telegramId}`, data),
  getBookings: (telegramId) => api.get(`/bookings/client/${telegramId}`),
  getTrainers: (telegramId) => api.get(`/users/client/${telegramId}`),
  createBooking: (data) => api.post('/bookings/', data),
  cancelBooking: (bookingId, telegramId) => api.delete(`/bookings/${bookingId}?telegram_id=${telegramId}`),
};

// Booking API
export const bookingAPI = {
  getAvailableSlots: (trainerId, date) =>
    api.get(`/schedule/trainer/${trainerId}/slots`, { params: { date } }),
  createBooking: (data) => api.post('/bookings/', data),
  updateBooking: (bookingId, data, telegramId) => api.put(`/bookings/${bookingId}?telegram_id=${telegramId}`, data),
  cancelBooking: (bookingId, telegramId) => api.delete(`/bookings/${bookingId}?telegram_id=${telegramId}`),
  getBooking: (bookingId) => api.get(`/bookings/${bookingId}`),
};

export default api;