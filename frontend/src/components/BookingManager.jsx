import React, { useState } from 'react';
import { Calendar, Clock, User, X, Check, XCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';
import './BookingManager.css';

const BookingManager = ({ booking, trainerId, onClose, onUpdate }) => {
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState(booking.datetime.split('T')[0]);
  const [newTime, setNewTime] = useState(booking.datetime.split('T')[1].substring(0, 5));
  const [cancellationReason, setCancellationReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await api.updateBooking(booking.id, trainerId, {
        status: 'CONFIRMED'
      });
      alert('Запись подтверждена!');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Error confirming booking:', error);
      alert('Ошибка при подтверждении записи');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancellationReason.trim()) {
      alert('Укажите причину отмены');
      return;
    }

    setLoading(true);
    try {
      await api.updateBooking(booking.id, trainerId, {
        status: 'CANCELLED',
        cancellation_reason: cancellationReason
      });
      alert('Запись отменена');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Ошибка при отмене записи');
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async () => {
    const newDateTime = `${newDate}T${newTime}:00`;

    setLoading(true);
    try {
      await api.updateBooking(booking.id, trainerId, {
        datetime: newDateTime
      });
      alert('Запись перенесена!');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Error rescheduling booking:', error);
      if (error.response?.data?.detail === 'Time slot already booked') {
        alert('Это время уже занято!');
      } else {
        alert('Ошибка при переносе записи');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (datetime) => {
    const date = new Date(datetime);
    return date.toLocaleString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch(status.toLowerCase()) {
      case 'confirmed': return '#34c759';
      case 'pending': return '#ff9500';
      case 'cancelled': return '#ff3b30';
      case 'completed': return '#007aff';
      default: return '#8e8e93';
    }
  };

  const getStatusText = (status) => {
    switch(status.toLowerCase()) {
      case 'confirmed': return 'Подтверждено';
      case 'pending': return 'Ожидает подтверждения';
      case 'cancelled': return 'Отменено';
      case 'completed': return 'Завершено';
      default: return status;
    }
  };

  return (
    <div className="booking-manager-overlay">
      <div className="booking-manager">
        <div className="booking-header">
          <h2>Управление записью</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="booking-details">
          <div className="detail-item">
            <User size={18} />
            <span>{booking.client_name}</span>
          </div>
          <div className="detail-item">
            <Calendar size={18} />
            <span>{formatDateTime(booking.datetime)}</span>
          </div>
          {booking.price && (
            <div className="detail-item">
              <span>💰</span>
              <span>{booking.price} ₽</span>
            </div>
          )}
          <div className="detail-item">
            <div
              className="status-badge"
              style={{ backgroundColor: getStatusColor(booking.status) }}
            >
              {getStatusText(booking.status)}
            </div>
          </div>
        </div>

        {booking.notes && (
          <div className="booking-notes">
            <h3>Комментарий:</h3>
            <p>{booking.notes}</p>
          </div>
        )}

        {booking.status.toLowerCase() === 'pending' && (
          <div className="booking-actions">
            <button
              className="action-btn confirm"
              onClick={handleConfirm}
              disabled={loading}
            >
              <Check size={18} />
              Подтвердить
            </button>
            <button
              className="action-btn reschedule"
              onClick={() => setShowReschedule(!showReschedule)}
              disabled={loading}
            >
              <RefreshCw size={18} />
              Перенести
            </button>
            <button
              className="action-btn cancel"
              onClick={() => setCancellationReason('') || setShowReschedule(false)}
              disabled={loading}
            >
              <XCircle size={18} />
              Отменить
            </button>
          </div>
        )}

        {booking.status.toLowerCase() === 'confirmed' && (
          <div className="booking-actions">
            <button
              className="action-btn reschedule"
              onClick={() => setShowReschedule(!showReschedule)}
              disabled={loading}
            >
              <RefreshCw size={18} />
              Перенести
            </button>
            <button
              className="action-btn cancel"
              onClick={() => setCancellationReason('') || setShowReschedule(false)}
              disabled={loading}
            >
              <XCircle size={18} />
              Отменить
            </button>
          </div>
        )}

        {showReschedule && (
          <div className="reschedule-form">
            <h3>Перенос записи</h3>
            <div className="form-group">
              <label>Новая дата:</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="form-group">
              <label>Новое время:</label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
            <button
              className="submit-btn"
              onClick={handleReschedule}
              disabled={loading}
            >
              {loading ? 'Переносим...' : 'Перенести запись'}
            </button>
          </div>
        )}

        {cancellationReason !== undefined && booking.status.toLowerCase() !== 'cancelled' && !showReschedule && (
          <div className="cancel-form">
            <h3>Отмена записи</h3>
            <div className="form-group">
              <label>Причина отмены:</label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Укажите причину отмены записи..."
                rows={3}
              />
            </div>
            <div className="cancel-actions">
              <button
                className="cancel-btn secondary"
                onClick={() => setCancellationReason('')}
              >
                Назад
              </button>
              <button
                className="cancel-btn danger"
                onClick={handleCancel}
                disabled={loading || !cancellationReason.trim()}
              >
                {loading ? 'Отменяем...' : 'Отменить запись'}
              </button>
            </div>
          </div>
        )}

        {booking.cancellation_reason && (
          <div className="cancellation-info">
            <h3>Причина отмены:</h3>
            <p>{booking.cancellation_reason}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingManager;