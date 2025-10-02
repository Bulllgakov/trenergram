import { useState, useEffect } from 'react';
import api from '../services/api';
import '../styles/telegram-webapp.css';

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Понедельник', order: 0 },
  { value: 'tuesday', label: 'Вторник', order: 1 },
  { value: 'wednesday', label: 'Среда', order: 2 },
  { value: 'thursday', label: 'Четверг', order: 3 },
  { value: 'friday', label: 'Пятница', order: 4 },
  { value: 'saturday', label: 'Суббота', order: 5 },
  { value: 'sunday', label: 'Воскресенье', order: 6 }
];

function SlotManager({ trainerId, onClose, onUpdate }) {
  const [schedule, setSchedule] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' or 'slots'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSlot, setNewSlot] = useState({
    day_of_week: 'monday',
    start_time: '09:00',
    end_time: '10:00',
    is_recurring: true
  });

  useEffect(() => {
    loadSlots();
  }, [trainerId]);

  const loadSlots = async () => {
    try {
      setLoading(true);

      // Load weekly schedule template
      const scheduleData = await api.getTrainerScheduleTemplate(trainerId);

      // Group schedule by day
      const groupedSchedule = DAYS_OF_WEEK.map(day => ({
        ...day,
        slots: scheduleData.filter(s => s.day_of_week === day.value)
      }));
      setSchedule(groupedSchedule);

      // Load time slots for selected date
      const fromDate = selectedDate;
      const toDate = new Date(selectedDate);
      toDate.setDate(toDate.getDate() + 7);
      const slotsData = await api.getTrainerSlots(
        trainerId,
        fromDate,
        toDate.toISOString().split('T')[0]
      );
      setTimeSlots(slotsData);

    } catch (error) {
      console.error('Failed to load slots:', error);
      // Initialize with empty data on error
      const emptySchedule = DAYS_OF_WEEK.map(day => ({
        ...day,
        slots: []
      }));
      setSchedule(emptySchedule);
      setTimeSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async () => {
    try {
      if (activeTab === 'schedule') {
        // Add recurring schedule slot
        await api.addScheduleSlot(trainerId, newSlot);
      } else {
        // Add specific time slot
        await api.createTimeSlot(trainerId, {
          date: selectedDate,
          start_time: newSlot.start_time,
          end_time: newSlot.end_time
        });
      }

      await loadSlots();
      setShowAddForm(false);
      setNewSlot({
        day_of_week: 'monday',
        start_time: '09:00',
        end_time: '10:00',
        is_recurring: true
      });

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to add slot:', error);
      alert('Не удалось добавить слот');
    }
  };

  const handleDeleteSlot = async (slotId, isSchedule = false) => {
    if (!confirm('Удалить этот слот?')) return;

    try {
      if (isSchedule) {
        await api.deleteScheduleSlot(slotId, trainerId);
      } else {
        await api.updateSlot(slotId, trainerId, { status: 'blocked' });
      }
      await loadSlots();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to delete slot:', error);
      alert('Не удалось удалить слот');
    }
  };

  const handleGenerateSlots = async () => {
    if (!confirm('Сгенерировать слоты на неделю вперед?')) return;

    try {
      const fromDate = new Date().toISOString().split('T')[0];
      const toDate = new Date();
      toDate.setDate(toDate.getDate() + 7);

      const result = await api.generateSlotsFromSchedule(
        trainerId,
        fromDate,
        toDate.toISOString().split('T')[0]
      );

      alert(result.message);
      await loadSlots();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to generate slots:', error);
      alert('Не удалось сгенерировать слоты');
    }
  };

  if (loading) {
    return (
      <div className="slot-manager">
        <div className="section-header">
          <h2>Управление слотами</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="slot-manager">
      <div className="section-header">
        <h2>Управление расписанием</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          📅 Шаблон расписания
        </button>
        <button
          className={`tab ${activeTab === 'slots' ? 'active' : ''}`}
          onClick={() => setActiveTab('slots')}
        >
          ⏰ Конкретные слоты
        </button>
      </div>

      {activeTab === 'schedule' ? (
        <div className="slots-container">
          {schedule.map(day => (
            <div key={day.value} className="day-section">
              <h3>{day.label}</h3>
              <div className="day-slots">
                {day.slots.length === 0 ? (
                  <p className="no-slots">Нет слотов</p>
                ) : (
                  day.slots.map(slot => (
                    <div key={slot.id} className="slot-item">
                      <span>{slot.start_time} - {slot.end_time}</span>
                      <button
                        className="delete-slot-btn"
                        onClick={() => handleDeleteSlot(slot.id, true)}
                      >
                        🗑
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}

          <button
            className="btn btn-secondary generate-btn"
            onClick={handleGenerateSlots}
          >
            🔄 Сгенерировать слоты на неделю
          </button>
        </div>
      ) : (
        <div className="time-slots-container">
          <div className="date-selector">
            <label>Выберите дату:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                loadSlots();
              }}
            />
          </div>

          <div className="time-slots-list">
            {timeSlots.length === 0 ? (
              <p className="no-slots">Нет слотов на выбранную дату</p>
            ) : (
              timeSlots.map(slot => (
                <div key={slot.id} className={`time-slot-item status-${slot.status}`}>
                  <span>{slot.date} {slot.start_time} - {slot.end_time}</span>
                  <span className="slot-status">{slot.status === 'available' ? 'Свободно' :
                                                   slot.status === 'booked' ? 'Занято' :
                                                   slot.status === 'blocked' ? 'Заблокировано' : 'Перерыв'}</span>
                  {slot.status === 'available' && (
                    <button
                      className="delete-slot-btn"
                      onClick={() => handleDeleteSlot(slot.id, false)}
                    >
                      🚫
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showAddForm ? (
        <div className="add-slot-form">
          <h3>Добавить слот</h3>

          {activeTab === 'schedule' && (
            <div className="form-group">
              <label>День недели</label>
              <select
                value={newSlot.day_of_week}
                onChange={(e) => setNewSlot({...newSlot, day_of_week: e.target.value})}
              >
                {DAYS_OF_WEEK.map(day => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Время начала</label>
            <input
              type="time"
              value={newSlot.start_time}
              onChange={(e) => setNewSlot({...newSlot, start_time: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Время окончания</label>
            <input
              type="time"
              value={newSlot.end_time}
              onChange={(e) => setNewSlot({...newSlot, end_time: e.target.value})}
            />
          </div>

          {activeTab === 'schedule' && (
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={newSlot.is_recurring}
                  onChange={(e) => setNewSlot({...newSlot, is_recurring: e.target.checked})}
                />
                Повторяющийся слот
              </label>
            </div>
          )}

          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
              Отмена
            </button>
            <button className="btn btn-primary" onClick={handleAddSlot}>
              Добавить
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-primary add-slot-btn"
          onClick={() => setShowAddForm(true)}
        >
          + Добавить слот
        </button>
      )}
    </div>
  );
}

export default SlotManager;