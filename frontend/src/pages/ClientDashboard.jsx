import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import api from '../services/api';
import TrainersList from '../components/TrainersList';
import '../styles/telegram-webapp.css';

function ClientDashboard() {
  const { id } = useParams(); // This is telegram_id from URL
  const { tg } = useTelegram();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showTrainersList, setShowTrainersList] = useState(false);
  const [showBookingDetails, setShowBookingDetails] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
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

  const openBookingDetails = (booking) => {
    tg.HapticFeedback?.impactOccurred('light');
    setShowBookingDetails(booking);
    setShowOverlay(true);
  };

  const closeBookingDetails = () => {
    setShowBookingDetails(null);
    setShowOverlay(false);
  };

  const confirmBooking = () => {
    tg.HapticFeedback?.notificationOccurred('success');
    tg.showAlert('Вы подтвердили участие в тренировке');
    closeBookingDetails();
  };

  const cancelBooking = () => {
    tg.HapticFeedback?.impactOccurred('medium');
    tg.showConfirm('Отменить запись на тренировку?', async (confirmed) => {
      if (confirmed && showBookingDetails) {
        try {
          await api.cancelBooking(showBookingDetails.id, id, 'Отменено клиентом');

          tg.HapticFeedback?.notificationOccurred('success');
          tg.showAlert('Запись на тренировку отменена');

          closeBookingDetails();
          loadClientData(); // Reload data
        } catch (error) {
          console.error('Failed to cancel booking:', error);
          tg.showAlert('Не удалось отменить запись');
        }
      }
    });
  };

  const rescheduleBooking = () => {
    tg.HapticFeedback?.impactOccurred('light');
    tg.showAlert('Свяжитесь с тренером для переноса тренировки');
  };

  const contactTrainer = (trainerUsername) => {
    tg.HapticFeedback?.impactOccurred('light');
    // Open chat with trainer using their Telegram username
    if (trainerUsername) {
      tg.openLink(`https://t.me/${trainerUsername.replace('@', '')}`);
    } else {
      tg.showAlert('Username тренера не найден');
    }
  };

  const showMyTrainers = () => {
    tg.HapticFeedback?.impactOccurred('light');
    if (trainers && trainers.length > 0) {
      const trainersList = trainers.map(t =>
        `${t.name}${t.specialization ? ` - ${t.specialization}` : ''}${t.price ? ` (${t.price}₽)` : ''}`
      ).join('\n');
      tg.showAlert(`Мои тренеры:\n${trainersList}`);
    } else {
      tg.showAlert('У вас пока нет тренеров. Нажмите "+" чтобы найти тренера.');
    }
  };

  const showHistoryStats = () => {
    tg.HapticFeedback?.impactOccurred('light');
    tg.showPopup({
      title: 'Статистика',
      message: 'Тренировок в этом месяце: 12\nПотрачено: 36,000₽\nЛюбимый тренер: Иван Петров',
      buttons: [{ type: 'ok' }]
    });
  };

  const newBooking = () => {
    tg.HapticFeedback?.impactOccurred('light');
    setShowTrainersList(true);
  };

  const getBookings = () => {
    const now = new Date();
    switch(activeTab) {
      case 'upcoming':
        return bookings
          .filter(b => new Date(b.datetime) >= now && b.status !== 'CANCELLED')
          .map(b => ({
            id: b.id,
            trainerId: b.trainer_telegram_id,
            trainerName: b.trainer_name,
            trainerInitials: b.trainer_name ? b.trainer_name.split(' ').map(n => n[0]).join('') : 'T',
            trainerUsername: b.trainer_telegram_username,
            date: new Date(b.datetime).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }),
            time: new Date(b.datetime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            location: b.club_name || 'Место не указано',
            status: b.status.toLowerCase(),
            balance: -b.price
          }));
      case 'past':
        return bookings
          .filter(b => new Date(b.datetime) < now && b.status !== 'CANCELLED')
          .map(b => ({
            id: b.id,
            trainerId: b.trainer_telegram_id,
            trainerName: b.trainer_name,
            trainerInitials: b.trainer_name ? b.trainer_name.split(' ').map(n => n[0]).join('') : 'T',
            trainerUsername: b.trainer_telegram_username,
            date: new Date(b.datetime).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }),
            time: new Date(b.datetime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            location: b.club_name || 'Место не указано',
            status: 'past',
            balance: -b.price
          }));
      case 'cancelled':
        return bookings
          .filter(b => b.status === 'CANCELLED')
          .map(b => ({
            id: b.id,
            trainerId: b.trainer_telegram_id,
            trainerName: b.trainer_name,
            trainerInitials: b.trainer_name ? b.trainer_name.split(' ').map(n => n[0]).join('') : 'T',
            trainerUsername: b.trainer_telegram_username,
            date: new Date(b.datetime).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }),
            time: new Date(b.datetime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            location: b.club_name || 'Место не указано',
            status: 'cancelled',
            balance: 0
          }));
      default: return [];
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
          <TrainersList clientId={id} />
        </div>
      ) : (
        <div className="bookings-section">
        {bookings.length > 0 ? (
          bookings.map(booking => (
            <div
              key={booking.id}
              className="booking-card"
              onClick={() => openBookingDetails(booking)}
            >
              <div className="booking-header">
                <div className="booking-trainer">
                  <div className="trainer-avatar">{booking.trainerInitials}</div>
                  <div className="trainer-info">
                    <div className="trainer-name">{booking.trainerName}</div>
                    <div className="trainer-type">{booking.trainerType}</div>
                  </div>
                </div>
                {booking.status && (
                  <div className={`booking-status ${booking.status}`}>
                    <span className="status-icon">
                      {booking.status === 'pending' && '⏳'}
                      {booking.status === 'confirmed' && '✅'}
                      {booking.status === 'cancelled' && '❌'}
                      {booking.status === 'completed' && '✓'}
                    </span>
                    <span className="status-text">
                      {booking.status === 'pending' && 'Ожидание'}
                      {booking.status === 'confirmed' && 'Подтверждено'}
                      {booking.status === 'cancelled' && 'Отменено'}
                      {booking.status === 'completed' && 'Завершено'}
                    </span>
                  </div>
                )}
              </div>

              <div className="booking-details">
                <div className="booking-detail">
                  <span>📅</span>
                  <span>{booking.date}</span>
                </div>
                <div className="booking-detail">
                  <span>🕐</span>
                  <span>{booking.time}</span>
                </div>
              </div>

              {booking.location && (
                <div className="booking-details">
                  <div className="booking-detail">
                    <span>📍</span>
                    <span>{booking.location}</span>
                  </div>
                </div>
              )}

              {booking.balance !== undefined && activeTab === 'upcoming' && (
                <div className="booking-footer">
                  <div className="booking-balance">
                    <span className="balance-label">Баланс:</span>
                    <span className={`balance-amount ${booking.balance < 0 ? 'negative' : ''}`}>
                      {booking.balance} ₽
                    </span>
                  </div>
                  {booking.balance < 0 && (
                    <div className="booking-actions">
                      <button className="booking-action">Пополнить</button>
                    </div>
                  )}
                </div>
              )}

              {booking.cancelReason && (
                <div className="booking-details">
                  <div className="booking-detail">
                    <span>ℹ️</span>
                    <span>{booking.cancelReason}</span>
                  </div>
                </div>
              )}
            </div>
          ))
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
        )}
        </div>
      )}

      {/* FAB Button */}
      {!showTrainersList && (
        <button className="fab" onClick={newBooking}>+</button>
      )}

      {/* Overlay */}
      <div className={`overlay ${showOverlay ? 'active' : ''}`} onClick={closeBookingDetails}></div>

      {/* Booking Details Bottom Sheet */}
      {showBookingDetails && (
        <div className={`bottom-sheet ${showBookingDetails ? 'active' : ''}`}>
          <div className="sheet-header">
            <div className="sheet-title">Детали записи</div>
            <div className="sheet-close" onClick={closeBookingDetails}>Закрыть</div>
          </div>
          <div className="sheet-content">
            <div className="booking-trainer" style={{marginBottom: '20px'}}>
              <div className="trainer-avatar" style={{width: '48px', height: '48px', fontSize: '16px'}}>
                {showBookingDetails.trainerInitials}
              </div>
              <div className="trainer-info">
                <div className="trainer-name" style={{fontSize: '18px'}}>
                  {showBookingDetails.trainerName}
                </div>
                <div className="trainer-type">
                  {showBookingDetails.trainerType}
                </div>
              </div>
            </div>

            <div style={{background: 'var(--tg-theme-secondary-bg-color)', borderRadius: '10px', padding: '16px', marginBottom: '20px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.33px solid rgba(0, 0, 0, 0.08)'}}>
                <span style={{color: 'var(--tg-theme-hint-color)'}}>Дата</span>
                <span style={{fontWeight: '500'}}>{showBookingDetails.date}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.33px solid rgba(0, 0, 0, 0.08)'}}>
                <span style={{color: 'var(--tg-theme-hint-color)'}}>Время</span>
                <span style={{fontWeight: '500'}}>{showBookingDetails.time}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.33px solid rgba(0, 0, 0, 0.08)'}}>
                <span style={{color: 'var(--tg-theme-hint-color)'}}>Место</span>
                <span style={{fontWeight: '500', textAlign: 'right'}}>{showBookingDetails.location}</span>
              </div>
              {showBookingDetails.balance !== undefined && (
                <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0'}}>
                  <span style={{color: 'var(--tg-theme-hint-color)'}}>Ваш баланс</span>
                  <span style={{fontWeight: '500', color: showBookingDetails.balance < 0 ? 'var(--tg-theme-destructive-text-color)' : 'var(--tg-theme-text-color)'}}>
                    {showBookingDetails.balance} ₽
                  </span>
                </div>
              )}
            </div>

            <div className="action-buttons">
              {showBookingDetails.status === 'pending' && (
                <button className="action-button confirm" onClick={confirmBooking}>
                  ✅ Подтвердить участие
                </button>
              )}
              <button className="action-button" onClick={() => contactTrainer(showBookingDetails.trainerUsername)}>
                💬 Связаться с тренером
              </button>
              {showBookingDetails.status !== 'cancelled' && showBookingDetails.status !== 'completed' && (
                <>
                  <button className="action-button reschedule" onClick={rescheduleBooking}>
                    📅 Перенести
                  </button>
                  <button className="action-button cancel" onClick={cancelBooking}>
                    ❌ Отменить запись
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientDashboard;