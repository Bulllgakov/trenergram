import React, { useState } from 'react';
import { Calendar, Clock, User, X, XCircle, MessageCircle } from 'lucide-react';
import api from '../services/api';
import './ClientBookingManager.css';

const ClientBookingManager = ({ booking, clientId, onClose, onUpdate }) => {
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!cancellationReason.trim()) {
      alert('Пожалуйста, укажите причину отмены');
      return;
    }

    setLoading(true);
    try {
      await api.cancelBooking(booking.id, clientId, cancellationReason);
      alert('Запись отменена');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Ошибка при отмене записи. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (datetime) => {
    const date = new Date(datetime.replace('Z', ''));
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

  const isUpcoming = new Date(booking.datetime.replace('Z', '')) > new Date();
  const canCancel = isUpcoming && booking.status.toLowerCase() !== 'cancelled' && booking.status.toLowerCase() !== 'completed';

  // Calculate if cancellation is allowed (24 hours before)
  const hoursBeforeBooking = (new Date(booking.datetime.replace('Z', '')) - new Date()) / (1000 * 60 * 60);
  const canCancelWithoutPenalty = hoursBeforeBooking > 24;

  return (
    <div className="client-booking-manager-overlay">
      <div className="client-booking-manager">
        <div className="booking-header">
          <h2>Детали записи</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="booking-details">
          <div className="trainer-info">
            <div className="trainer-avatar">
              <User size={24} />
            </div>
            <div className="trainer-name">
              <h3>{booking.trainer_name}</h3>
              {booking.trainer_telegram_username && (
                <a
                  href={`https://t.me/${booking.trainer_telegram_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="trainer-link"
                >
                  @{booking.trainer_telegram_username}
                </a>
              )}
            </div>
          </div>

          <div className="booking-info-list">
            <div className="info-item">
              <Calendar size={18} />
              <span>{formatDateTime(booking.datetime)}</span>
            </div>

            <div className="info-item">
              <Clock size={18} />
              <span>Длительность: {booking.duration} мин</span>
            </div>

            {booking.price && (
              <div className="info-item">
                <span>💰</span>
                <span>{booking.price} ₽</span>
              </div>
            )}

            <div className="info-item">
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
              <h4>Ваш комментарий:</h4>
              <p>{booking.notes}</p>
            </div>
          )}

          {booking.cancellation_reason && (
            <div className="cancellation-info">
              <h4>Причина отмены:</h4>
              <p>{booking.cancellation_reason}</p>
            </div>
          )}
        </div>

        <div className="booking-actions">
          {canCancel && (
            <>
              {!canCancelWithoutPenalty && (
                <div className="warning-message">
                  ⚠️ Внимание: отмена менее чем за 24 часа может привести к штрафу
                </div>
              )}

              {!showCancelForm ? (
                <button
                  className="action-btn cancel"
                  onClick={() => setShowCancelForm(true)}
                  disabled={loading}
                >
                  <XCircle size={18} />
                  Отменить запись
                </button>
              ) : (
                <div className="cancel-form">
                  <h3>Отмена записи</h3>
                  <div className="form-group">
                    <label>Причина отмены:</label>
                    <textarea
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="Например: изменились планы, заболел(а)..."
                      rows={3}
                    />
                  </div>
                  <div className="cancel-actions">
                    <button
                      className="cancel-btn secondary"
                      onClick={() => {
                        setShowCancelForm(false);
                        setCancellationReason('');
                      }}
                      disabled={loading}
                    >
                      Назад
                    </button>
                    <button
                      className="cancel-btn danger"
                      onClick={handleCancel}
                      disabled={loading || !cancellationReason.trim()}
                    >
                      {loading ? 'Отменяем...' : 'Подтвердить отмену'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {booking.trainer_telegram_username && (
            <a
              href={`https://t.me/${booking.trainer_telegram_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="action-btn contact"
            >
              <MessageCircle size={18} />
              Связаться с тренером
            </a>
          )}
        </div>

        {isUpcoming && booking.status.toLowerCase() === 'confirmed' && (
          <div className="booking-tips">
            <h4>Памятка:</h4>
            <ul>
              <li>Приходите за 10 минут до начала</li>
              <li>Не забудьте спортивную форму и воду</li>
              <li>При отмене предупредите заранее</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientBookingManager;