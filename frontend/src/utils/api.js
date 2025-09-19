import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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
  getProfile: (trainerId) => api.get(`/trainers/${trainerId}`),
  updateProfile: (trainerId, data) => api.put(`/trainers/${trainerId}`, data),
  getClients: (trainerId) => api.get(`/trainers/${trainerId}/clients`),
  getBookings: (trainerId) => api.get(`/trainers/${trainerId}/bookings`),
  getSchedule: (trainerId) => api.get(`/trainers/${trainerId}/schedule`),
  updateSchedule: (trainerId, data) => api.put(`/trainers/${trainerId}/schedule`, data),
  getStats: (trainerId) => api.get(`/trainers/${trainerId}/stats`),
};

// Client API
export const clientAPI = {
  getProfile: (clientId) => api.get(`/clients/${clientId}`),
  updateProfile: (clientId, data) => api.put(`/clients/${clientId}`, data),
  getBookings: (clientId) => api.get(`/clients/${clientId}/bookings`),
  createBooking: (data) => api.post('/bookings', data),
  cancelBooking: (bookingId) => api.delete(`/bookings/${bookingId}`),
};

// Booking API
export const bookingAPI = {
  getAvailableSlots: (trainerId, date) => 
    api.get(`/trainers/${trainerId}/available-slots`, { params: { date } }),
  createBooking: (data) => api.post('/bookings', data),
  updateBooking: (bookingId, data) => api.put(`/bookings/${bookingId}`, data),
  cancelBooking: (bookingId) => api.delete(`/bookings/${bookingId}`),
};

export default api;