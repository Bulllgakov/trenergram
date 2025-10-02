const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // User endpoints
  async getCurrentUser(telegramId) {
    return this.request(`/users/me?telegram_id=${telegramId}`);
  }

  async getTrainerInfo(telegramId) {
    return this.request(`/users/trainer/${telegramId}`);
  }

  async getTrainerClients(telegramId) {
    return this.request(`/users/trainer/${telegramId}/clients`);
  }

  async getClientInfo(telegramId) {
    return this.request(`/users/client/${telegramId}`);
  }

  async updateProfile(telegramId, data) {
    const params = new URLSearchParams({ telegram_id: telegramId, ...data });
    return this.request(`/users/profile?${params}`, {
      method: 'PUT',
    });
  }

  // Booking endpoints
  async createBooking(data) {
    return this.request('/bookings/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTrainerBookings(telegramId, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return this.request(`/bookings/trainer/${telegramId}${queryParams ? '?' + queryParams : ''}`);
  }

  async getClientBookings(telegramId, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return this.request(`/bookings/client/${telegramId}${queryParams ? '?' + queryParams : ''}`);
  }

  async getBooking(bookingId) {
    return this.request(`/bookings/${bookingId}`);
  }

  async updateBooking(bookingId, telegramId, data) {
    return this.request(`/bookings/${bookingId}?telegram_id=${telegramId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async cancelBooking(bookingId, telegramId, reason = null) {
    const params = new URLSearchParams({ telegram_id: telegramId });
    if (reason) params.append('reason', reason);

    return this.request(`/bookings/${bookingId}?${params}`, {
      method: 'DELETE',
    });
  }

  // Schedule endpoints (to be implemented)
  async getTrainerSchedule(telegramId, date) {
    // Temporary: return mock data until schedule API is implemented
    const bookings = await this.getTrainerBookings(telegramId, {
      from_date: new Date(date).toISOString(),
      to_date: new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    });

    // Transform bookings into schedule slots
    const schedule = [];
    for (let hour = 8; hour <= 20; hour++) {
      const booking = bookings.find(b => {
        const bookingHour = new Date(b.datetime).getHours();
        return bookingHour === hour;
      });

      if (booking) {
        schedule.push({
          time: `${hour}:00`,
          status: booking.status.toLowerCase(),
          clientName: booking.client_name,
          price: booking.price,
        });
      } else {
        schedule.push({
          time: `${hour}:00`,
          status: 'free',
        });
      }
    }

    return schedule;
  }

  async getClientTrainers(telegramId) {
    const clientInfo = await this.getClientInfo(telegramId);
    return clientInfo.trainers || [];
  }

  // Slot endpoints
  async getTrainerSlots(telegramId) {
    return this.request(`/slots/trainer/${telegramId}`);
  }

  async createSlot(telegramId, data) {
    return this.request(`/slots/trainer/${telegramId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSlot(slotId, telegramId, data) {
    return this.request(`/slots/${slotId}?telegram_id=${telegramId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSlot(slotId, telegramId) {
    return this.request(`/slots/${slotId}?telegram_id=${telegramId}`, {
      method: 'DELETE',
    });
  }

  // Trainer endpoints
  async getTrainers(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return this.request(`/trainers/${queryParams ? '?' + queryParams : ''}`);
  }

  async getTrainer(telegramId) {
    return this.request(`/trainers/${telegramId}`);
  }

  // Helper methods
  get(endpoint) {
    return this.request(endpoint);
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();
export default api;