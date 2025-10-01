import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import api from '../services/api';
import SlotManager from '../components/SlotManager';
import '../styles/telegram-webapp.css';

function TrainerDashboard() {
  const { id } = useParams();
  const { tg } = useTelegram();
  const [selectedDate, setSelectedDate] = useState('2025-08-13');
  const [showBookingSheet, setShowBookingSheet] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showSlotManager, setShowSlotManager] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [trainerInfo, setTrainerInfo] = useState(null);
  const [clients, setClients] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tg.ready();
    tg.expand();
    tg.BackButton.hide();
    loadTrainerData();
  }, [tg]);

  useEffect(() => {
    if (id) {
      loadTrainerBookings();
    }
  }, [selectedDate, id]);

  const loadTrainerData = async () => {
    try {
      setLoading(true);

      // Get trainer info
      const trainerData = await api.getTrainerInfo(id);
      setTrainerInfo(trainerData);

      // Get clients
      const clientsList = await api.getTrainerClients(id);
      setClients(clientsList.map(c => ({
        id: c.id,
        telegram_id: c.telegram_id,
        name: c.name,
        initials: c.name ? `${c.name.split(' ')[0]?.[0] || ''}${c.name.split(' ')[1]?.[0] || ''}` : '??'
      })));
    } catch (error) {
      console.error('Failed to load trainer data:', error);
      // Use mock data on error
      setClients([
        { id: 1, telegram_id: '987654321', name: 'Мария Сидорова', initials: 'МС' },
        { id: 2, telegram_id: '111111111', name: 'Александр Смирнов', initials: 'АС' },
        { id: 3, telegram_id: '222222222', name: 'Иван Петров', initials: 'ИП' },
        { id: 4, telegram_id: '333333333', name: 'Елена Козлова', initials: 'ЕК' },
        { id: 5, telegram_id: '444444444', name: 'Дмитрий Новиков', initials: 'ДН' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainerBookings = async () => {
    try {
      const date = new Date(selectedDate);
      const bookingsList = await api.getTrainerBookings(id, {
        from_date: date.toISOString(),
        to_date: new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      });
      setBookings(bookingsList);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  };

  // Generate schedule data from bookings
  const generateScheduleData = () => {
    const times = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
    const schedule = [];

    for (const time of times) {
      const hour = parseInt(time.split(':')[0]);
      const booking = bookings.find(b => {
        const bookingDate = new Date(b.datetime);
        return bookingDate.getHours() === hour;
      });

      if (time === '12:00') {
        schedule.push({ time, isBreak: true });
      } else if (booking) {
        schedule.push({
          time,
          client: booking.client_name,
          type: booking.notes || 'Тренировка',
          status: booking.status === 'PENDING' ? 'waiting-confirmation' :
                  booking.status === 'CONFIRMED' ? 'confirmed' :
                  booking.status === 'CANCELLED' ? 'cancelled' : 'free',
          info: booking.status === 'PENDING' ? 'Ждет подтверждения' : null
        });
      } else {
        schedule.push({ time, client: null, status: 'free' });
      }
    }

    return schedule;
  };

  const scheduleData = generateScheduleData();

  const availableTimes = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

  const selectDate = (date) => {
    tg.HapticFeedback?.selectionChanged();
    setSelectedDate(date);
  };

  const openBookingSheet = () => {
    tg.HapticFeedback?.impactOccurred('light');
    setShowBookingSheet(true);
    setShowOverlay(true);
  };

  const openSettingsSheet = () => {
    tg.HapticFeedback?.impactOccurred('light');
    setShowSettingsSheet(true);
    setShowOverlay(true);
  };

  const closeAllSheets = () => {
    setShowBookingSheet(false);
    setShowSettingsSheet(false);
    setShowOverlay(false);
    setSelectedClient(null);
    setSelectedTime(null);
  };

  const quickBook = (time) => {
    tg.HapticFeedback?.impactOccurred('light');
    setSelectedTime(time);
    openBookingSheet();
  };

  const selectClient = (client) => {
    tg.HapticFeedback?.selectionChanged();
    setSelectedClient(client);
  };

  const selectTimeSlot = (time) => {
    tg.HapticFeedback?.selectionChanged();
    setSelectedTime(time);
  };

  const submitBooking = async () => {
    if (selectedClient && selectedTime) {
      try {
        const [hours, minutes] = selectedTime.split(':');
        const bookingDate = new Date(selectedDate);
        bookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        await api.createBooking({
          trainer_telegram_id: id,
          client_telegram_id: selectedClient.telegram_id || `client_${selectedClient.id}`,
          datetime: bookingDate.toISOString(),
          duration: 60,
          price: trainerInfo?.price || 2500
        });

        tg.HapticFeedback?.notificationOccurred('success');
        tg.showPopup({
          title: 'Запись создана',
          message: `${selectedClient.name} записан на ${selectedTime}`,
          buttons: [{ type: 'ok' }]
        });

        closeAllSheets();
        loadTrainerBookings(); // Reload bookings
      } catch (error) {
        console.error('Failed to create booking:', error);
        tg.showPopup({
          title: 'Ошибка',
          message: 'Не удалось создать запись. Попробуйте еще раз.',
          buttons: [{ type: 'ok' }]
        });
      }
    }
  };

  const showTrainerStats = () => {
    tg.HapticFeedback?.impactOccurred('light');
    const todayBookings = bookings.filter(b => b.status === 'CONFIRMED').length;
    const monthIncome = bookings.reduce((sum, b) => sum + (b.price || 0), 0);

    tg.showPopup({
      title: 'Статистика',
      message: `Тренировок сегодня: ${todayBookings}\nДоход за месяц: ${monthIncome.toLocaleString()}₽\nВсего клиентов: ${clients.length}`,
      buttons: [{ type: 'ok' }]
    });
  };

  const showClients = () => {
    tg.HapticFeedback?.impactOccurred('light');
    // Navigate to clients page
  };

  const showLink = () => {
    const link = `https://t.me/trenergram_bot?start=trainer_${id}`;
    navigator.clipboard.writeText(link);
    tg.HapticFeedback?.notificationOccurred('success');
    tg.showPopup({
      title: 'Ссылка скопирована',
      message: 'Поделитесь ссылкой с клиентами для регистрации',
      buttons: [{ type: 'ok' }]
    });
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'confirmed': return '✓';
      case 'waiting-confirmation': return '?';
      case 'reminder-sent': return '📨';
      case 'auto-cancelled': return '❌';
      case 'free': return '+';
      default: return '';
    }
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div>
          <div className="header-title">Trenergram</div>
          <div className="header-subtitle" id="headerStats">
            ✅ {bookings.filter(b => b.status === 'CONFIRMED').length} подтверждено •
            ⏳ {bookings.filter(b => b.status === 'PENDING').length} ожидает •
            ➕ {scheduleData.filter(s => s.status === 'free' && !s.isBreak).length} свободно
          </div>
        </div>
        <div>
          <a href="#" className="header-action" onClick={showTrainerStats}>📊</a>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="quick-action" onClick={showClients}>
          👥 Мои клиенты
          <span className="badge">{clients.length}</span>
        </button>
        <button className="quick-action" onClick={showLink}>
          🔗 Моя ссылка
        </button>
        <button className="quick-action" onClick={showTrainerStats}>
          📊 Статистика
        </button>
      </div>

      {/* Settings FAB */}
      <button className="settings-fab" onClick={openSettingsSheet}>⚙️</button>

      {/* Date Tabs */}
      <div className="date-tabs">
        <button className="date-tab" onClick={() => selectDate('2025-08-11')}>Пн, 11</button>
        <button className="date-tab" onClick={() => selectDate('2025-08-12')}>Вт, 12</button>
        <button className={`date-tab ${selectedDate === '2025-08-13' ? 'active' : ''}`} onClick={() => selectDate('2025-08-13')}>Сегодня</button>
        <button className="date-tab" onClick={() => selectDate('2025-08-14')}>Завтра</button>
        <button className="date-tab" onClick={() => selectDate('2025-08-15')}>Пт, 15</button>
        <button className="date-tab" onClick={() => selectDate('2025-08-16')}>Сб, 16</button>
        <button className="date-tab" onClick={() => selectDate('2025-08-17')}>Вс, 17</button>
      </div>

      {/* Section Header */}
      <div className="section-header">Среда, 13 августа • Фитнес ЭНЕРГИЯ</div>

      {/* Schedule List */}
      <div className="schedule-section">
        {scheduleData.map((slot, index) => {
          if (slot.isBreak) {
            return (
              <div key={index} className="time-slot break">
                <div className="time-slot-time">{slot.time}</div>
                <div className="time-slot-content">
                  <div className="time-slot-name">Обеденный перерыв</div>
                </div>
              </div>
            );
          }

          const isEmpty = !slot.client;
          const classes = `time-slot ${isEmpty ? 'empty' : 'draggable'} ${slot.conflict ? 'conflict' : ''} ${slot.backToBack ? 'back-to-back' : ''}`;

          return (
            <div
              key={index}
              className={classes}
              onClick={() => isEmpty ? quickBook(slot.time) : null}
            >
              <div className="time-slot-time">{slot.time}</div>
              <div className="time-slot-content">
                <div className="time-slot-name">
                  {slot.client || 'Свободно'}
                </div>
                <div className="time-slot-info">
                  {isEmpty ? 'Нажмите для записи' : (slot.info || slot.type)}
                </div>
              </div>
              <div className="time-slot-status">
                <div className={`status-icon ${slot.status}`}>
                  {getStatusIcon(slot.status)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Legend */}
      <div className="status-legend">
        <div className="legend-item">
          <div className="legend-icon" style={{background: '#34c759'}}></div>
          <span>Подтверждено</span>
        </div>
        <div className="legend-item">
          <div className="legend-icon" style={{background: '#007aff'}}></div>
          <span>Ожидает ответа</span>
        </div>
        <div className="legend-item">
          <div className="legend-icon" style={{background: '#5856d6'}}></div>
          <span>Напоминание</span>
        </div>
        <div className="legend-item">
          <div className="legend-icon" style={{background: '#ff3b30'}}></div>
          <span>Конфликт</span>
        </div>
      </div>

      {/* FAB Button */}
      <button className="fab" onClick={openBookingSheet}>+</button>

      {/* Overlay */}
      <div className={`overlay ${showOverlay ? 'active' : ''}`} onClick={closeAllSheets}></div>

      {/* Booking Bottom Sheet */}
      <div className={`bottom-sheet ${showBookingSheet ? 'active' : ''}`}>
        <div className="sheet-header">
          <div className="sheet-title">Быстрая запись</div>
          <div className="sheet-close" onClick={closeAllSheets}>Готово</div>
        </div>
        <div className="sheet-content">
          <div className="form-group">
            <label className="form-label">Поиск клиента</label>
            <input
              type="text"
              className="form-input"
              placeholder="Начните вводить имя..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Или выберите из списка</label>
            <div className="client-list">
              {clients.map(client => (
                <div
                  key={client.id}
                  className="client-item"
                  onClick={() => selectClient(client)}
                  style={{
                    background: selectedClient?.id === client.id ? 'var(--tg-theme-secondary-bg-color)' : 'transparent'
                  }}
                >
                  <div className="client-avatar">{client.initials}</div>
                  <div className="client-name">{client.name}</div>
                </div>
              ))}
              <div className="client-item">
                <div className="client-avatar">+</div>
                <div className="client-name add-new">Добавить нового клиента</div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Выберите время</label>
            <div className="time-grid">
              {availableTimes.map(time => (
                <div
                  key={time}
                  className={`time-option ${selectedTime === time ? 'selected' : ''}`}
                  onClick={() => selectTimeSlot(time)}
                >
                  {time}
                </div>
              ))}
            </div>
          </div>

          <button
            className="submit-button"
            disabled={!selectedClient || !selectedTime}
            onClick={submitBooking}
          >
            Записать клиента
          </button>
        </div>
      </div>

      {/* Settings Bottom Sheet */}
      <div className={`bottom-sheet ${showSettingsSheet ? 'active' : ''}`}>
        <div className="sheet-header">
          <div className="sheet-title">Настройки</div>
          <div className="sheet-close" onClick={closeAllSheets}>Готово</div>
        </div>
        <div className="sheet-content">
          <div className="section-header" style={{margin: '-16px -16px 10px', paddingLeft: '16px'}}>
            НАПОМИНАНИЯ КЛИЕНТАМ
          </div>

          <div className="settings-list">
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Первое напоминание</div>
                <div className="setting-description">За 24 часа в 20:00</div>
              </div>
              <div className="setting-arrow">›</div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Второе напоминание</div>
                <div className="setting-description">Через 2 часа после первого (22:00)</div>
              </div>
              <div className="setting-arrow">›</div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Третье напоминание</div>
                <div className="setting-description">Через 4 часа после первого (00:00)</div>
              </div>
              <div className="setting-arrow">›</div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Автоотмена при неответе</div>
                <div className="setting-description">Через 5 часов после первого (01:00)</div>
              </div>
              <div className="setting-arrow">›</div>
            </div>
          </div>

          <div className="section-header" style={{margin: '20px -16px 10px', paddingLeft: '16px'}}>
            ПРАВИЛА ПЕРЕНОСА
          </div>

          <div className="settings-list">
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Запрет переноса</div>
                <div className="setting-description">За 24 часа до тренировки</div>
              </div>
              <div className="setting-arrow">›</div>
            </div>
          </div>

          <div className="section-header" style={{margin: '20px -16px 10px', paddingLeft: '16px'}}>
            РАБОЧИЕ ЧАСЫ
          </div>

          <div className="settings-list">
            <div className="setting-item" onClick={() => {
              setShowSettingsSheet(false);
              setShowSlotManager(true);
            }}>
              <div className="setting-info">
                <div className="setting-label">Управление слотами</div>
                <div className="setting-description">Настройка доступных слотов</div>
              </div>
              <div className="setting-arrow">›</div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Понедельник - Пятница</div>
                <div className="setting-description">09:00 - 21:00</div>
              </div>
              <div className="setting-arrow">›</div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Суббота - Воскресенье</div>
                <div className="setting-description">10:00 - 18:00</div>
              </div>
              <div className="setting-arrow">›</div>
            </div>
          </div>

          <div className="section-header" style={{margin: '20px -16px 10px', paddingLeft: '16px'}}>
            ЦЕНА ТРЕНИРОВКИ
          </div>

          <div className="settings-list">
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Индивидуальная тренировка</div>
                <div className="setting-description">{trainerInfo?.price || 3000} ₽ за час</div>
              </div>
              <div className="setting-arrow">›</div>
            </div>
          </div>
        </div>
      </div>

      {/* Slot Manager Modal */}
      {showSlotManager && (
        <div className="modal-overlay">
          <SlotManager
            trainerId={id}
            onClose={() => setShowSlotManager(false)}
          />
        </div>
      )}
    </div>
  );
}

export default TrainerDashboard;