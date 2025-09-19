import { useState, useEffect } from 'react';
import { trainerAPI } from '../utils/api';

function ClientsList({ trainerId }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClients();
  }, [trainerId]);

  const loadClients = async () => {
    try {
      const response = await trainerAPI.getClients(trainerId);
      setClients(response.data);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center text-telegram-hint py-8">
        Загрузка клиентов...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4">
      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Поиск клиента"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 bg-telegram-secondary rounded-lg mb-4 outline-none"
      />

      {/* Clients List */}
      <div className="space-y-2">
        {filteredClients.length > 0 ? (
          filteredClients.map((client) => (
            <div
              key={client.id}
              className="flex items-center justify-between p-3 bg-telegram-secondary rounded-lg"
            >
              <div>
                <div className="font-medium">{client.name}</div>
                <div className="text-sm text-telegram-hint">
                  {client.phone || 'Телефон не указан'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-telegram-hint">
                  Тренировок: {client.totalBookings || 0}
                </div>
                <div className="text-xs text-telegram-hint">
                  Последняя: {client.lastBookingDate || '—'}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-telegram-hint py-8">
            {searchTerm
              ? 'Клиенты не найдены'
              : 'Пока нет клиентов'}
          </div>
        )}
      </div>
    </div>
  );
}

export default ClientsList;