import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { clientAPI } from '../utils/api';

function ClientDashboard() {
  const { id } = useParams();
  const { tg, user } = useTelegram();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
    setupMainButton();
  }, [id]);

  const loadBookings = async () => {
    try {
      const response = await clientAPI.getBookings(id);
      setBookings(response.data);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupMainButton = () => {
    tg.MainButton.setText('Записаться на тренировку');
    tg.MainButton.show();
    tg.MainButton.onClick(() => {
      // Open trainer selection
      tg.openLink(`https://t.me/${process.env.REACT_APP_BOT_USERNAME}`);
    });

    return () => {
      tg.MainButton.hide();
      tg.MainButton.offClick();
    };
  };

  const cancelBooking = async (bookingId) => {
    try {
      await clientAPI.cancelBooking(bookingId);
      await loadBookings();
      tg.showPopup({
        title: 'Успешно',
        message: 'Запись отменена',
        buttons: [{ type: 'ok' }],
      });
    } catch (error) {
      tg.showPopup({
        title: 'Ошибка',
        message: 'Не удалось отменить запись',
        buttons: [{ type: 'ok' }],
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-telegram-hint">Загрузка...</div>
      </div>
    );
  }

  const upcomingBookings = bookings.filter(
    b => new Date(b.date) >= new Date()
  );
  const pastBookings = bookings.filter(
    b => new Date(b.date) < new Date()
  );

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Мои тренировки</h1>

      {/* Upcoming Bookings */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Предстоящие</h2>
        {upcomingBookings.length > 0 ? (
          <div className="space-y-3">
            {upcomingBookings.map((booking) => (
              <div key={booking.id} className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">
                      {booking.trainerName}
                    </div>
                    <div className="text-sm text-telegram-hint mt-1">
                      📅 {booking.date} в {booking.time}
                    </div>
                    {booking.address && (
                      <div className="text-sm text-telegram-hint mt-1">
                        📍 {booking.address}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => cancelBooking(booking.id)}
                    className="text-telegram-destructive text-sm font-medium"
                  >
                    Отменить
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center text-telegram-hint">
            Нет предстоящих тренировок
          </div>
        )}
      </div>

      {/* Past Bookings */}
      {pastBookings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">История</h2>
          <div className="space-y-3">
            {pastBookings.slice(0, 5).map((booking) => (
              <div key={booking.id} className="card opacity-75">
                <div className="font-medium">{booking.trainerName}</div>
                <div className="text-sm text-telegram-hint mt-1">
                  {booking.date} в {booking.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientDashboard;