import { useState, useEffect } from 'react';
import api from '../services/api';
import '../styles/telegram-webapp.css';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Понедельник' },
  { value: 1, label: 'Вторник' },
  { value: 2, label: 'Среда' },
  { value: 3, label: 'Четверг' },
  { value: 4, label: 'Пятница' },
  { value: 5, label: 'Суббота' },
  { value: 6, label: 'Воскресенье' }
];

function SlotManager({ trainerId, onClose }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSlot, setNewSlot] = useState({
    day_of_week: 0,
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
      const slotsData = await api.getTrainerSlots(trainerId);

      // Group slots by day
      const groupedSlots = DAYS_OF_WEEK.map(day => ({
        ...day,
        slots: slotsData.filter(s => s.day_of_week === day.value)
      }));

      setSlots(groupedSlots);
    } catch (error) {
      console.error('Failed to load slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async () => {
    try {
      await api.createSlot(trainerId, newSlot);
      await loadSlots();
      setShowAddForm(false);
      setNewSlot({
        day_of_week: 0,
        start_time: '09:00',
        end_time: '10:00',
        is_recurring: true
      });
    } catch (error) {
      console.error('Failed to add slot:', error);
      alert('Не удалось добавить слот');
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!confirm('Удалить этот слот?')) return;

    try {
      await api.deleteSlot(slotId, trainerId);
      await loadSlots();
    } catch (error) {
      console.error('Failed to delete slot:', error);
      alert('Не удалось удалить слот');
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
        <h2>Управление слотами</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="slots-container">
        {slots.map(day => (
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
                      onClick={() => handleDeleteSlot(slot.id)}
                    >
                      🗑
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddForm ? (
        <div className="add-slot-form">
          <h3>Добавить слот</h3>

          <div className="form-group">
            <label>День недели</label>
            <select
              value={newSlot.day_of_week}
              onChange={(e) => setNewSlot({...newSlot, day_of_week: parseInt(e.target.value)})}
            >
              {DAYS_OF_WEEK.map(day => (
                <option key={day.value} value={day.value}>{day.label}</option>
              ))}
            </select>
          </div>

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