import React, { useState, useEffect } from 'react';
import { User, MapPin, DollarSign, Star, Calendar } from 'lucide-react';
import api from '../services/api';
import BookingCalendar from './BookingCalendar';
import './TrainersList.css';

const TrainersList = ({ clientId }) => {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [showBookingCalendar, setShowBookingCalendar] = useState(false);

  useEffect(() => {
    loadTrainers();
  }, []);

  const loadTrainers = async () => {
    setLoading(true);
    try {
      // Get trainers linked to this client
      const clientData = await api.getClientInfo(clientId);
      setTrainers(clientData.trainers || []);
    } catch (error) {
      console.error('Error loading trainers:', error);
      setTrainers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookTrainer = (trainer) => {
    setSelectedTrainer(trainer);
    setShowBookingCalendar(true);
  };

  const handleBookingSuccess = () => {
    setShowBookingCalendar(false);
    setSelectedTrainer(null);
  };

  if (loading) {
    return (
      <div className="trainers-list-loading">
        <div className="spinner"></div>
        <p>Загружаем список тренеров...</p>
      </div>
    );
  }

  return (
    <div className="trainers-list">
      <div className="trainers-header">
        <h2>Выберите тренера</h2>
        <p>Найдите подходящего тренера и запишитесь на тренировку</p>
      </div>

      {trainers.length === 0 ? (
        <div className="no-trainers">
          <User size={48} />
          <p>Пока нет доступных тренеров</p>
        </div>
      ) : (
        <div className="trainers-grid">
          {trainers.map(trainer => (
            <div key={trainer.id} className="trainer-card">
              <div className="trainer-avatar">
                {trainer.photo_url ? (
                  <img src={trainer.photo_url} alt={trainer.name} />
                ) : (
                  <User size={40} />
                )}
              </div>

              <div className="trainer-info">
                <h3>{trainer.name}</h3>
                {trainer.specialization && (
                  <p className="specialization">{trainer.specialization}</p>
                )}

                <div className="trainer-details">
                  {trainer.club_name && (
                    <div className="detail">
                      <MapPin size={14} />
                      <span>{trainer.club_name}</span>
                    </div>
                  )}

                  {trainer.price && (
                    <div className="detail">
                      <DollarSign size={14} />
                      <span>{trainer.price} ₽/час</span>
                    </div>
                  )}

                  {trainer.rating && (
                    <div className="detail">
                      <Star size={14} />
                      <span>{trainer.rating}</span>
                    </div>
                  )}
                </div>

                {trainer.description && (
                  <p className="trainer-bio">{trainer.description}</p>
                )}

                <div className="trainer-stats">
                  <div className="stat">
                    <span className="stat-value">{trainer.total_clients || 0}</span>
                    <span className="stat-label">клиентов</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{trainer.total_sessions || 0}</span>
                    <span className="stat-label">тренировок</span>
                  </div>
                </div>

                <button
                  className="book-trainer-btn"
                  onClick={() => handleBookTrainer(trainer)}
                >
                  <Calendar size={16} />
                  Записаться
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showBookingCalendar && selectedTrainer && (
        <BookingCalendar
          trainerId={selectedTrainer.telegram_id}
          trainerName={selectedTrainer.name}
          clientId={clientId}
          onClose={() => setShowBookingCalendar(false)}
          onBookingSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
};

export default TrainersList;