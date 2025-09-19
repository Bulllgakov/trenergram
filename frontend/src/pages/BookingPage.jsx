import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTelegram } from '../hooks/useTelegram';
import { bookingAPI, trainerAPI } from '../utils/api';

function BookingPage() {
  const { trainerId } = useParams();
  const navigate = useNavigate();
  const { tg, user } = useTelegram();
  const [trainer, setTrainer] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  // Generate next 7 days
  const dates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  useEffect(() => {
    loadTrainerInfo();
    setupMainButton();
  }, [trainerId]);

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedTime) {
      tg.MainButton.show();
      tg.MainButton.setText('Записаться');
    } else {
      tg.MainButton.hide();
    }
  }, [selectedTime]);

  const loadTrainerInfo = async () => {
    try {
      const response = await trainerAPI.getProfile(trainerId);
      setTrainer(response.data);
    } catch (error) {
      console.error('Error loading trainer:', error);
    }
  };

  const loadAvailableSlots = async () => {
    setLoading(true);
    try {
      const response = await bookingAPI.getAvailableSlots(
        trainerId,
        format(selectedDate, 'yyyy-MM-dd')
      );
      setAvailableSlots(response.data);
    } catch (error) {
      console.error('Error loading slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupMainButton = () => {
    tg.MainButton.onClick(handleBooking);
    return () => {
      tg.MainButton.offClick();
      tg.MainButton.hide();
    };
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) return;

    try {
      await bookingAPI.createBooking({
        trainerId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        clientId: user?.id,
        clientName: user?.first_name + ' ' + (user?.last_name || ''),
      });

      tg.showPopup({
        title: 'Успешно!',
        message: `Вы записаны на ${format(selectedDate, 'd MMMM', { locale: ru })} в ${selectedTime}`,
        buttons: [{ type: 'ok' }],
      });

      setTimeout(() => {
        navigate(`/client/${user?.id}`);
      }, 2000);
    } catch (error) {
      tg.showPopup({
        title: 'Ошибка',
        message: 'Не удалось записаться. Попробуйте позже.',
        buttons: [{ type: 'ok' }],
      });
    }
  };

  return (
    <div className="p-4">
      {/* Trainer Info */}
      {trainer && (
        <div className="card mb-6">
          <h1 className="text-xl font-bold">{trainer.name}</h1>
          <div className="text-telegram-hint mt-2">
            💰 {trainer.price} ₽ / тренировка
          </div>
          {trainer.specialization && (
            <div className="text-telegram-hint mt-1">
              🎯 {trainer.specialization}
            </div>
          )}
        </div>
      )}

      {/* Date Selection */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Выберите дату</h2>
        <div className="grid grid-cols-3 gap-2">
          {dates.map((date) => (
            <button
              key={date.toISOString()}
              onClick={() => {
                setSelectedDate(date);
                setSelectedTime(null);
              }}
              className={`p-3 rounded-lg text-center transition-colors ${
                selectedDate?.toDateString() === date.toDateString()
                  ? 'bg-telegram-button text-white'
                  : 'bg-telegram-secondary'
              }`}
            >
              <div className="text-sm">
                {format(date, 'EEE', { locale: ru })}
              </div>
              <div className="font-bold">
                {format(date, 'd MMM', { locale: ru })}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Выберите время</h2>
          {loading ? (
            <div className="text-center text-telegram-hint py-4">
              Загрузка свободных слотов...
            </div>
          ) : availableSlots.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedTime(slot)}
                  className={`py-2 px-4 rounded-lg transition-colors ${
                    selectedTime === slot
                      ? 'bg-telegram-button text-white'
                      : 'bg-telegram-secondary'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          ) : (
            <div className="card text-center text-telegram-hint">
              Нет свободных слотов на этот день
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BookingPage;