import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import api from '../services/api';
import SlotManager from '../components/SlotManager';
import '../styles/telegram-webapp.css';

function TrainerDashboard() {
  const { id } = useParams();
  const { tg } = useTelegram();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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
  const [searchQuery, setSearchQuery] = useState('');

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
      // Don't use mock data
      setClients([]);
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

  // Generate week days dynamically
  const generateWeekDays = () => {
    const days = [];
    const today = new Date();

    for (let i = -3; i <= 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' });
      const dayNumber = date.getDate();
      const isToday = i === 0;
      const isTomorrow = i === 1;

      days.push({
        date: date.toISOString().split('T')[0],
        label: isToday ? 'Сегодня' : isTomorrow ? 'Завтра' : `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${dayNumber}`,
        isToday,
        isActive: selectedDate === date.toISOString().split('T')[0]
      });
    }
    return days;
  };

  const weekDays = generateWeekDays();

  // Format section header dynamically
  const formatSectionHeader = () => {
    const date = new Date(selectedDate);
    const dayName = date.toLocaleDateString('ru-RU', { weekday: 'long' });
    const month = date.toLocaleDateString('ru-RU', { month: 'long' });
    const day = date.getDate();
    const clubName = trainerInfo?.club_name || 'Клуб не указан';
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${day} ${month} • ${clubName}`;
  };

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
    setSearchQuery('');
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

  const handleAddNewClient = () => {
    tg.HapticFeedback?.impactOccurred('light');
    const link = `https://t.me/trenergram_bot?start=trainer_${id}`;
    navigator.clipboard.writeText(link);
    tg.showPopup({
      title: 'Ссылка скопирована',
      message: 'Отправьте эту ссылку новому клиенту для регистрации',
      buttons: [{ type: 'ok' }]
    });
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
        {weekDays.map(day => (
          <button
            key={day.date}
            className={`date-tab ${day.isActive ? 'active' : ''}`}
            onClick={() => selectDate(day.date)}
          >
            {day.label}
          </button>
        ))}
      </div>

      {/* Section Header */}
      <div className="section-header">{formatSectionHeader()}</div>

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Или выберите из списка</label>
            <div className="client-list">
              {(() => {
                const filteredClients = clients.filter(client =>
                  searchQuery === '' ||
                  client.name.toLowerCase().includes(searchQuery.toLowerCase())
                );

                if (filteredClients.length === 0 && searchQuery !== '') {
                  return (
                    <div style={{
                      padding: '16px',
                      textAlign: 'center',
                      color: 'var(--tg-theme-hint-color)'
                    }}>
                      Клиенты не найдены
                    </div>
                  );
                }

                return filteredClients.slice(0, 3).map(client => (
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
              ));
              })()}
              <div className="client-item" onClick={handleAddNewClient}>
                <div className="client-avatar">+</div>
                <div className="client-name add-new">Добавить нового клиента</div>
              </div>
              {(() => {
                const filteredCount = clients.filter(client =>
                  searchQuery === '' ||
                  client.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).length;

                return filteredCount > 3 && (
                  <div style={{
                    padding: '8px 16px',
                    color: 'var(--tg-theme-hint-color)',
                    fontSize: '13px',
                    textAlign: 'center'
                  }}>
                    Показаны 3 клиента из {filteredCount} найденных
                  </div>
                );
              })()}
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