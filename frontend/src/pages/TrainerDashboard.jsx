import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { trainerAPI } from '../utils/api';
import ScheduleCalendar from '../components/ScheduleCalendar';
import ClientsList from '../components/ClientsList';
import StatsCard from '../components/StatsCard';

function TrainerDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tg, user } = useTelegram();
  const [activeTab, setActiveTab] = useState('schedule');
  const [trainer, setTrainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadTrainerData();
    setupMainButton();
  }, [id]);

  const loadTrainerData = async () => {
    try {
      const [profileRes, statsRes] = await Promise.all([
        trainerAPI.getProfile(id),
        trainerAPI.getStats(id),
      ]);
      setTrainer(profileRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading trainer data:', error);
      tg.showPopup({
        title: 'Ошибка',
        message: 'Не удалось загрузить данные',
        buttons: [{ type: 'ok' }],
      });
    } finally {
      setLoading(false);
    }
  };

  const setupMainButton = () => {
    tg.MainButton.setText('Настройки');
    tg.MainButton.show();
    tg.MainButton.onClick(() => {
      navigate(`/trainer/${id}/settings`);
    });

    return () => {
      tg.MainButton.hide();
      tg.MainButton.offClick();
    };
  };

  const copyTrainerLink = () => {
    const link = `https://t.me/${process.env.REACT_APP_BOT_USERNAME}?start=trainer_${id}`;
    navigator.clipboard.writeText(link);
    tg.showPopup({
      title: 'Ссылка скопирована',
      message: 'Поделитесь ссылкой с клиентами',
      buttons: [{ type: 'ok' }],
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-telegram-hint">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Кабинет тренера</h1>
        <p className="text-telegram-hint mt-1">
          Привет, {trainer?.name || user?.first_name}!
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatsCard
            title="Клиенты"
            value={stats.totalClients}
            icon="👥"
          />
          <StatsCard
            title="Тренировки сегодня"
            value={stats.todayBookings}
            icon="📅"
          />
          <StatsCard
            title="Доход за месяц"
            value={`${stats.monthlyIncome} ₽`}
            icon="💰"
          />
          <StatsCard
            title="Рейтинг"
            value={stats.rating || '-'}
            icon="⭐"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'schedule'
              ? 'bg-telegram-button text-white'
              : 'bg-telegram-secondary text-telegram-text'
          }`}
        >
          Расписание
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'clients'
              ? 'bg-telegram-button text-white'
              : 'bg-telegram-secondary text-telegram-text'
          }`}
        >
          Клиенты
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'schedule' && <ScheduleCalendar trainerId={id} />}
        {activeTab === 'clients' && <ClientsList trainerId={id} />}
      </div>

      {/* Copy Link Button */}
      <button
        onClick={copyTrainerLink}
        className="fixed bottom-20 right-4 bg-telegram-button text-white p-4 rounded-full shadow-lg"
      >
        🔗
      </button>
    </div>
  );
}

export default TrainerDashboard;