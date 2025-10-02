import React, { useState, useEffect } from 'react';
import { Clock, Save, X } from 'lucide-react';
import api from '../services/api';
import './WorkingHoursSettings.css';

const DAYS = [
  { value: 'monday', label: 'Понедельник' },
  { value: 'tuesday', label: 'Вторник' },
  { value: 'wednesday', label: 'Среда' },
  { value: 'thursday', label: 'Четверг' },
  { value: 'friday', label: 'Пятница' },
  { value: 'saturday', label: 'Суббота' },
  { value: 'sunday', label: 'Воскресенье' }
];

const WorkingHoursSettings = ({ trainerId, onClose, onSave }) => {
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('weekdays');

  useEffect(() => {
    loadSchedule();
  }, [trainerId]);

  const loadSchedule = async () => {
    try {
      const scheduleData = await api.getTrainerScheduleTemplate(trainerId);

      // Group schedule by day
      const groupedSchedule = {};
      DAYS.forEach(day => {
        const daySlots = scheduleData.filter(s => s.day_of_week === day.value);
        if (daySlots.length > 0) {
          groupedSchedule[day.value] = {
            enabled: true,
            start_time: daySlots[0].start_time || '09:00',
            end_time: daySlots[0].end_time || '20:00',
            is_recurring: daySlots[0].is_recurring !== false
          };
        } else {
          groupedSchedule[day.value] = {
            enabled: false,
            start_time: '09:00',
            end_time: '20:00',
            is_recurring: true
          };
        }
      });

      setSchedule(groupedSchedule);
    } catch (error) {
      console.error('Failed to load schedule:', error);
      // Initialize with default values
      const defaultSchedule = {};
      DAYS.forEach(day => {
        defaultSchedule[day.value] = {
          enabled: day.value !== 'sunday',
          start_time: '09:00',
          end_time: '20:00',
          is_recurring: true
        };
      });
      setSchedule(defaultSchedule);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = (day) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled
      }
    }));
  };

  const handleTimeChange = (day, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const applyToWeekdays = () => {
    const mondaySchedule = schedule.monday;
    const weekdays = ['tuesday', 'wednesday', 'thursday', 'friday'];

    const updatedSchedule = { ...schedule };
    weekdays.forEach(day => {
      updatedSchedule[day] = { ...mondaySchedule };
    });

    setSchedule(updatedSchedule);
    alert('Расписание понедельника применено к будням');
  };

  const applyToWeekends = () => {
    const saturdaySchedule = schedule.saturday;

    setSchedule(prev => ({
      ...prev,
      sunday: { ...saturdaySchedule }
    }));

    alert('Расписание субботы применено к воскресенью');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Clear existing schedule
      const currentSchedule = await api.getTrainerScheduleTemplate(trainerId);
      for (const slot of currentSchedule) {
        await api.deleteScheduleSlot(slot.id, trainerId);
      }

      // Add new schedule
      for (const [day, daySchedule] of Object.entries(schedule)) {
        if (daySchedule.enabled) {
          await api.addScheduleSlot(trainerId, {
            day_of_week: day,
            start_time: daySchedule.start_time,
            end_time: daySchedule.end_time,
            is_recurring: daySchedule.is_recurring
          });
        }
      }

      alert('Расписание сохранено успешно!');
      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save schedule:', error);
      alert('Ошибка при сохранении расписания');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="working-hours-overlay">
        <div className="working-hours-settings">
          <div className="settings-header">
            <h2>Рабочие часы</h2>
            <button className="close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <div className="loading">Загрузка...</div>
        </div>
      </div>
    );
  }

  const weekdays = DAYS.slice(0, 5);
  const weekends = DAYS.slice(5);

  return (
    <div className="working-hours-overlay">
      <div className="working-hours-settings">
        <div className="settings-header">
          <h2>Рабочие часы</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'weekdays' ? 'active' : ''}`}
            onClick={() => setActiveTab('weekdays')}
          >
            Будни
          </button>
          <button
            className={`tab ${activeTab === 'weekends' ? 'active' : ''}`}
            onClick={() => setActiveTab('weekends')}
          >
            Выходные
          </button>
          <button
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Все дни
          </button>
        </div>

        <div className="schedule-content">
          {activeTab === 'weekdays' && (
            <>
              {weekdays.map(day => (
                <div key={day.value} className="day-schedule">
                  <div className="day-header">
                    <label className="day-toggle">
                      <input
                        type="checkbox"
                        checked={schedule[day.value]?.enabled || false}
                        onChange={() => handleToggleDay(day.value)}
                      />
                      <span>{day.label}</span>
                    </label>
                  </div>
                  {schedule[day.value]?.enabled && (
                    <div className="time-inputs">
                      <input
                        type="time"
                        value={schedule[day.value]?.start_time || '09:00'}
                        onChange={(e) => handleTimeChange(day.value, 'start_time', e.target.value)}
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={schedule[day.value]?.end_time || '20:00'}
                        onChange={(e) => handleTimeChange(day.value, 'end_time', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              ))}
              <button className="apply-btn" onClick={applyToWeekdays}>
                Применить время понедельника ко всем будням
              </button>
            </>
          )}

          {activeTab === 'weekends' && (
            <>
              {weekends.map(day => (
                <div key={day.value} className="day-schedule">
                  <div className="day-header">
                    <label className="day-toggle">
                      <input
                        type="checkbox"
                        checked={schedule[day.value]?.enabled || false}
                        onChange={() => handleToggleDay(day.value)}
                      />
                      <span>{day.label}</span>
                    </label>
                  </div>
                  {schedule[day.value]?.enabled && (
                    <div className="time-inputs">
                      <input
                        type="time"
                        value={schedule[day.value]?.start_time || '10:00'}
                        onChange={(e) => handleTimeChange(day.value, 'start_time', e.target.value)}
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={schedule[day.value]?.end_time || '18:00'}
                        onChange={(e) => handleTimeChange(day.value, 'end_time', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              ))}
              <button className="apply-btn" onClick={applyToWeekends}>
                Применить время субботы к воскресенью
              </button>
            </>
          )}

          {activeTab === 'all' && (
            <>
              {DAYS.map(day => (
                <div key={day.value} className="day-schedule">
                  <div className="day-header">
                    <label className="day-toggle">
                      <input
                        type="checkbox"
                        checked={schedule[day.value]?.enabled || false}
                        onChange={() => handleToggleDay(day.value)}
                      />
                      <span>{day.label}</span>
                    </label>
                  </div>
                  {schedule[day.value]?.enabled && (
                    <div className="time-inputs">
                      <input
                        type="time"
                        value={schedule[day.value]?.start_time || '09:00'}
                        onChange={(e) => handleTimeChange(day.value, 'start_time', e.target.value)}
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={schedule[day.value]?.end_time || '20:00'}
                        onChange={(e) => handleTimeChange(day.value, 'end_time', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="settings-actions">
          <button
            className="cancel-btn"
            onClick={onClose}
            disabled={saving}
          >
            Отмена
          </button>
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              'Сохраняем...'
            ) : (
              <>
                <Save size={16} />
                Сохранить
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkingHoursSettings;