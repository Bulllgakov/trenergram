import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { trainerAPI } from '../utils/api';

function ScheduleCalendar({ trainerId }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    loadBookings();
  }, [selectedDate]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const response = await trainerAPI.getBookings(trainerId);
      setBookings(response.data);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDayBookings = (date) => {
    return bookings.filter(booking => 
      isSameDay(new Date(booking.date), date)
    );
  };

  return (
    <div className="bg-white rounded-xl p-4">
      {/* Week Days */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {weekDays.map((day, index) => (
          <button
            key={index}
            onClick={() => setSelectedDate(day)}
            className={`py-2 px-1 rounded-lg text-center transition-colors ${
              isSameDay(day, selectedDate)
                ? 'bg-telegram-button text-white'
                : 'bg-telegram-secondary'
            }`}
          >
            <div className="text-xs">
              {format(day, 'EEE', { locale: ru })}
            </div>
            <div className="font-bold">
              {format(day, 'd')}
            </div>
            <div className="text-xs mt-1">
              {getDayBookings(day).length > 0 && (
                <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Selected Day Bookings */}
      <div className="border-t pt-4">
        <h3 className="font-semibold mb-3">
          {format(selectedDate, 'd MMMM', { locale: ru })}
        </h3>
        
        {loading ? (
          <div className="text-center text-telegram-hint py-4">
            Загрузка...
          </div>
        ) : (
          <div className="space-y-2">
            {getDayBookings(selectedDate).length > 0 ? (
              getDayBookings(selectedDate).map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 bg-telegram-secondary rounded-lg"
                >
                  <div>
                    <div className="font-medium">{booking.time}</div>
                    <div className="text-sm text-telegram-hint">
                      {booking.clientName}
                    </div>
                  </div>
                  <div className="text-sm text-telegram-hint">
                    {booking.status === 'confirmed' ? '✅' : '⏳'}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-telegram-hint py-8">
                Нет записей на этот день
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ScheduleCalendar;