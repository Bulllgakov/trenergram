import React, { useState, useEffect } from 'react';
import { Calendar, Clock, X, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import api from '../services/api';
import './BookingCalendar.css';

const BookingCalendar = ({ trainerId, trainerName, clientId, onClose, onBookingSuccess }) => {
  const { tg } = useTelegram();
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [trainerSlots, setTrainerSlots] = useState([]);
  const [existingBookings, setExistingBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  useEffect(() => {
    loadTrainerSlots();
    loadExistingBookings();
  }, [trainerId]);

  useEffect(() => {
    if (selectedDate && trainerSlots.length > 0) {
      generateAvailableSlots();
    }
  }, [selectedDate, trainerSlots, existingBookings]);

  const loadTrainerSlots = async () => {
    try {
      const slots = await api.getTrainerSlots(trainerId);
      setTrainerSlots(slots);
    } catch (error) {
      console.error('Error loading trainer slots:', error);
      // Generate default slots if API fails
      const defaultSlots = [];
      for (let day = 0; day < 7; day++) {
        defaultSlots.push({
          day_of_week: day,
          start_time: '09:00',
          end_time: '20:00',
          is_active: true
        });
      }
      setTrainerSlots(defaultSlots);
    }
  };

  const loadExistingBookings = async () => {
    try {
      const bookings = await api.getTrainerBookings(trainerId);
      setExistingBookings(bookings.filter(b =>
        b.status === 'CONFIRMED' || b.status === 'PENDING'
      ));
    } catch (error) {
      console.error('Error loading bookings:', error);
      setExistingBookings([]);
    }
  };

  const generateAvailableSlots = () => {
    if (!selectedDate) return;

    const dayOfWeek = selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1;
    const daySlots = trainerSlots.filter(slot =>
      slot.day_of_week === dayOfWeek && slot.is_active
    );

    const available = [];
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();

    daySlots.forEach(slot => {
      const [startHour, startMinute] = slot.start_time.split(':').map(Number);
      const [endHour, endMinute] = slot.end_time.split(':').map(Number);

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          if (hour === startHour && minute < startMinute) continue;
          if (hour === endHour - 1 && minute >= endMinute - 30) continue;

          const slotTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          const slotDateTime = new Date(selectedDate);
          slotDateTime.setHours(hour, minute, 0, 0);

          // Skip past slots for today
          if (isToday && slotDateTime <= today) continue;

          // Check if slot is already booked
          const isBooked = existingBookings.some(booking => {
            const bookingDate = new Date(booking.datetime);
            return bookingDate.toDateString() === selectedDate.toDateString() &&
              bookingDate.getHours() === hour &&
              bookingDate.getMinutes() === minute;
          });

          if (!isBooked) {
            available.push({
              time: slotTime,
              datetime: slotDateTime
            });
          }
        }
      }
    });

    setAvailableSlots(available);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const handleDateSelect = (date) => {
    if (!date || date < new Date().setHours(0, 0, 0, 0)) return;
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleBooking = async () => {
    if (!selectedSlot || !clientId) {
      alert('Ошибка: Выберите время для записи');
      return;
    }

    setBooking(true);
    try {
      const bookingData = {
        trainer_telegram_id: trainerId,
        client_telegram_id: clientId,
        datetime: selectedSlot.datetime.toISOString(),
        duration: 60,
        notes: notes || undefined
      };

      await api.createBooking(bookingData);

      tg.HapticFeedback?.impactOccurred('medium');
      alert('Успешно! Запись успешно создана');

      if (onBookingSuccess) {
        onBookingSuccess();
      }
      onClose();
    } catch (error) {
      console.error('Booking error:', error);
      alert('Ошибка: Не удалось создать запись. Попробуйте еще раз.');
    } finally {
      setBooking(false);
    }
  };

  const changeMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const days = getDaysInMonth(currentMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="booking-calendar-overlay">
      <div className="booking-calendar">
        <div className="booking-header">
          <h3>
            <User size={20} />
            Запись к тренеру {trainerName}
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="calendar-section">
          <div className="calendar-nav">
            <button
              onClick={() => changeMonth(-1)}
              disabled={currentMonth.getMonth() === today.getMonth() &&
                       currentMonth.getFullYear() === today.getFullYear()}
            >
              <ChevronLeft size={20} />
            </button>
            <h4>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h4>
            <button onClick={() => changeMonth(1)}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="calendar-grid">
            <div className="weekdays">
              {weekDays.map(day => (
                <div key={day} className="weekday">{day}</div>
              ))}
            </div>
            <div className="days">
              {days.map((day, index) => {
                const isToday = day && day.toDateString() === today.toDateString();
                const isSelected = day && selectedDate &&
                  day.toDateString() === selectedDate.toDateString();
                const isPast = day && day < today;
                const dayOfWeek = day ? (day.getDay() === 0 ? 6 : day.getDay() - 1) : null;
                const hasSlots = day && trainerSlots.some(slot =>
                  slot.day_of_week === dayOfWeek && slot.is_active
                );

                return (
                  <div
                    key={index}
                    className={`day ${!day ? 'empty' : ''}
                      ${isPast ? 'past' : ''}
                      ${isToday ? 'today' : ''}
                      ${isSelected ? 'selected' : ''}
                      ${hasSlots && !isPast ? 'has-slots' : ''}`}
                    onClick={() => handleDateSelect(day)}
                  >
                    {day && day.getDate()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {selectedDate && (
          <div className="slots-section">
            <h4>
              <Clock size={16} />
              Доступное время на {selectedDate.toLocaleDateString('ru-RU')}
            </h4>
            <div className="time-slots">
              {loading ? (
                <div className="loading">Загрузка...</div>
              ) : availableSlots.length > 0 ? (
                availableSlots.map(slot => (
                  <button
                    key={slot.time}
                    className={`time-slot ${selectedSlot?.time === slot.time ? 'selected' : ''}`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {slot.time}
                  </button>
                ))
              ) : (
                <div className="no-slots">Нет доступного времени</div>
              )}
            </div>
          </div>
        )}

        {selectedSlot && (
          <div className="booking-form">
            <div className="form-group">
              <label>Комментарий к записи (необязательно)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Например: первое занятие, нужна консультация по питанию"
                rows={3}
              />
            </div>
            <div className="selected-info">
              <p>
                <Calendar size={16} />
                {selectedDate.toLocaleDateString('ru-RU', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p>
                <Clock size={16} />
                {selectedSlot.time}
              </p>
            </div>
            <button
              className="book-btn"
              onClick={handleBooking}
              disabled={booking}
            >
              {booking ? 'Записываем...' : 'Записаться'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingCalendar;