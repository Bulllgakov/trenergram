import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import api from '../services/api';
import TrainersList from '../components/TrainersList';
import ClientBookingManager from '../components/ClientBookingManager';
import '../styles/telegram-webapp.css';

function ClientDashboard() {
  const { id } = useParams(); // This is telegram_id from URL
  const { tg } = useTelegram();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showTrainersList, setShowTrainersList] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState(null);

  useEffect(() => {
    tg.ready();
    tg.expand();
    tg.BackButton.hide();
    if (id) {
      loadClientData();
    }
  }, [tg, id]);

  const loadClientData = async () => {
    try {
      setLoading(true);

      // Get client info with trainers using telegram_id
      const clientData = await api.getClientInfo(id);
      setClientInfo(clientData);
      setTrainers(clientData.trainers || []);

      // Get bookings using telegram_id
      const bookingsList = await api.getClientBookings(id);
      setBookings(bookingsList);
    } catch (error) {
      console.error('Failed to load client data:', error);
      // Don't use mock data - show empty state instead
      setTrainers([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  // All booking and trainer data is loaded from API via loadClientData()

  const selectTab = (tab) => {
    tg.HapticFeedback?.selectionChanged();
    setActiveTab(tab);
  };

  const handleBookingClick = (booking) => {
    tg.HapticFeedback?.impactOccurred('light');
    // Find the full booking object from the original data
    const fullBooking = bookings.find(b => b.id === booking.id);
    if (fullBooking) {
      setSelectedBooking(fullBooking);
    }
  };

  const handleBookingUpdate = () => {
    loadClientData(); // Reload data after booking is updated
    setSelectedBooking(null);
  };

  const showMyTrainers = () => {
    tg.HapticFeedback?.impactOccurred('light');
    if (trainers && trainers.length > 0) {
      const trainersList = trainers.map(t =>
        `${t.name}${t.specialization ? ` - ${t.specialization}` : ''}${t.price ? ` (${t.price}₽)` : ''}`
      ).join('\n');
      // Use native alert as fallback for unsupported Telegram methods
      alert(`Мои тренеры:\n${trainersList}`);
    } else {
      alert('У вас пока нет тренеров. Нажмите "+" чтобы найти тренера.');
    }
  };

  const showHistoryStats = () => {
    tg.HapticFeedback?.impactOccurred('light');
    const pastBookings = bookings.filter(b => b.status === 'completed' || new Date(b.datetime) < new Date());
    alert(`Статистика:\nПрошедшие тренировки: ${pastBookings.length}\nОтмененные: ${bookings.filter(b => b.status === 'cancelled').length}\nВсего тренеров: ${trainers.length}`);
  };

  const newBooking = () => {
    tg.HapticFeedback?.impactOccurred('light');
    setShowTrainersList(true);
  };

  const getBookings = () => {
    const now = new Date();
    switch(activeTab) {
      case 'upcoming':
        return bookings.filter(b => new Date(b.datetime) >= now && b.status.toUpperCase() !== 'CANCELLED');
      case 'past':
        return bookings.filter(b => new Date(b.datetime) < now && b.status.toUpperCase() !== 'CANCELLED');
      case 'cancelled':
        return bookings.filter(b => b.status.toUpperCase() === 'CANCELLED');
      default:
        return [];
    }
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-title">Мои тренировки</div>
          </div>
          <div className="header-actions">
            <span className="header-action">🔔</span>
            <span className="header-action">👤</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="quick-action" onClick={showMyTrainers}>
          🏆 Мои тренеры
          {trainers.length > 0 && <span className="badge info">{trainers.length}</span>}
        </button>
        <button className="quick-action" onClick={showHistoryStats}>
          📊 История и статистика
        </button>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        <button
          className={`category-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => selectTab('upcoming')}
        >
          Предстоящие
        </button>
        <button
          className={`category-tab ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => selectTab('past')}
        >
          Прошедшие
        </button>
        <button
          className={`category-tab ${activeTab === 'cancelled' ? 'active' : ''}`}
          onClick={() => selectTab('cancelled')}
        >
          Отмененные
        </button>
      </div>

      {/* Bookings Section or Trainers List */}
      {showTrainersList ? (
        <div>
          <button
            className="back-button"
            onClick={() => setShowTrainersList(false)}
            style={{
              padding: '10px 20px',
              margin: '10px 20px',
              background: 'var(--tg-theme-button-color)',
              color: 'var(--tg-theme-button-text-color)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            ← Назад к записям
          </button>
          <TrainersList clientId={id} preloadedTrainers={trainers} />
        </div>
      ) : (
        <div className="bookings-section">
          {(() => {
            const filteredBookings = getBookings();
            return filteredBookings.length > 0 ? (
              filteredBookings.map(booking => {
                const bookingDate = new Date(booking.datetime);
                const trainerInitials = booking.trainer_name ?
                  booking.trainer_name.split(' ').map(n => n[0]).join('') : 'T';
                const status = booking.status.toLowerCase();

                return (
                  <div
                    key={booking.id}
                    className="booking-card"
                    onClick={() => handleBookingClick(booking)}
                  >
                    <div className="booking-header">
                      <div className="booking-trainer">
                        <div className="trainer-avatar">{trainerInitials}</div>
                        <div className="trainer-info">
                          <div className="trainer-name">{booking.trainer_name}</div>
                        </div>
                      </div>
                      <div className={`booking-status ${status}`}>
                        <span className="status-icon">
                          {status === 'pending' && '⏳'}
                          {status === 'confirmed' && '✅'}
                          {status === 'cancelled' && '❌'}
                          {status === 'completed' && '✓'}
                        </span>
                        <span className="status-text">
                          {status === 'pending' && 'Ожидание'}
                          {status === 'confirmed' && 'Подтверждено'}
                          {status === 'cancelled' && 'Отменено'}
                          {status === 'completed' && 'Завершено'}
                        </span>
                      </div>
                    </div>

                    <div className="booking-details">
                      <div className="booking-detail">
                        <span>📅</span>
                        <span>{bookingDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                      </div>
                      <div className="booking-detail">
                        <span>🕐</span>
                        <span>{bookingDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {booking.duration && (
                        <div className="booking-detail">
                          <span>⏱️</span>
                          <span>{booking.duration} мин</span>
                        </div>
                      )}
                    </div>

                    {booking.club_name && (
                      <div className="booking-details">
                        <div className="booking-detail">
                          <span>📍</span>
                          <span>{booking.club_name}</span>
                        </div>
                      </div>
                    )}

                    {booking.price && activeTab === 'upcoming' && (
                      <div className="booking-footer">
                        <div className="booking-balance">
                          <span className="balance-label">Стоимость:</span>
                          <span className="balance-amount">
                            {booking.price} ₽
                          </span>
                        </div>
                      </div>
                    )}

                    {booking.cancellation_reason && (
                      <div className="booking-details">
                        <div className="booking-detail">
                          <span>ℹ️</span>
                          <span>{booking.cancellation_reason}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  {activeTab === 'upcoming' && '📅'}
                  {activeTab === 'past' && '📆'}
                  {activeTab === 'cancelled' && '❌'}
                </div>
                <div className="empty-title">
                  {activeTab === 'upcoming' && 'Нет предстоящих тренировок'}
                  {activeTab === 'past' && 'Нет прошедших тренировок'}
                  {activeTab === 'cancelled' && 'Нет отмененных тренировок'}
                </div>
                <div className="empty-description">
                  {activeTab === 'upcoming' && 'Запишитесь на тренировку к вашему тренеру'}
                  {activeTab === 'past' && 'Здесь будет история ваших тренировок'}
                  {activeTab === 'cancelled' && 'Здесь будут отмененные тренировки'}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* FAB Button */}
      {!showTrainersList && (
        <button className="fab" onClick={newBooking}>+</button>
      )}

      {/* Client Booking Manager Modal */}
      {selectedBooking && (
        <ClientBookingManager
          booking={selectedBooking}
          clientId={id}
          onClose={() => setSelectedBooking(null)}
          onUpdate={handleBookingUpdate}
        />
      )}
    </div>
  );
}

export default ClientDashboard;