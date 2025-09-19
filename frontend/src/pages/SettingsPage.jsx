import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { trainerAPI } from '../utils/api';

function SettingsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tg } = useTelegram();
  const [settings, setSettings] = useState({
    name: '',
    price: '',
    specialization: '',
    workHours: { start: '09:00', end: '21:00' },
    reminderTime: 60,
    phone: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
    setupButtons();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await trainerAPI.getProfile(id);
      setSettings(response.data.settings || settings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const setupButtons = () => {
    tg.BackButton.show();
    tg.BackButton.onClick(() => {
      navigate(`/trainer/${id}`);
    });

    tg.MainButton.setText('Сохранить');
    tg.MainButton.show();
    tg.MainButton.onClick(handleSave);

    return () => {
      tg.BackButton.hide();
      tg.BackButton.offClick();
      tg.MainButton.hide();
      tg.MainButton.offClick();
    };
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await trainerAPI.updateProfile(id, { settings });
      tg.showPopup({
        title: 'Успешно',
        message: 'Настройки сохранены',
        buttons: [{ type: 'ok' }],
      });
      setTimeout(() => {
        navigate(`/trainer/${id}`);
      }, 1500);
    } catch (error) {
      tg.showPopup({
        title: 'Ошибка',
        message: 'Не удалось сохранить настройки',
        buttons: [{ type: 'ok' }],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Настройки</h1>

      <div className="space-y-4">
        {/* Name */}
        <div className="card">
          <label className="block text-sm text-telegram-hint mb-2">
            Имя
          </label>
          <input
            type="text"
            value={settings.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="input"
            placeholder="Ваше имя"
          />
        </div>

        {/* Price */}
        <div className="card">
          <label className="block text-sm text-telegram-hint mb-2">
            Стоимость тренировки (₽)
          </label>
          <input
            type="number"
            value={settings.price}
            onChange={(e) => handleChange('price', e.target.value)}
            className="input"
            placeholder="2000"
          />
        </div>

        {/* Specialization */}
        <div className="card">
          <label className="block text-sm text-telegram-hint mb-2">
            Специализация
          </label>
          <select
            value={settings.specialization}
            onChange={(e) => handleChange('specialization', e.target.value)}
            className="input"
          >
            <option value="">Выберите специализацию</option>
            <option value="fitness">Фитнес</option>
            <option value="yoga">Йога</option>
            <option value="boxing">Бокс</option>
            <option value="crossfit">CrossFit</option>
            <option value="personal">Персональный тренинг</option>
          </select>
        </div>

        {/* Work Hours */}
        <div className="card">
          <label className="block text-sm text-telegram-hint mb-2">
            Рабочее время
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="time"
              value={settings.workHours.start}
              onChange={(e) => handleChange('workHours', {
                ...settings.workHours,
                start: e.target.value
              })}
              className="input flex-1"
            />
            <span className="text-telegram-hint">—</span>
            <input
              type="time"
              value={settings.workHours.end}
              onChange={(e) => handleChange('workHours', {
                ...settings.workHours,
                end: e.target.value
              })}
              className="input flex-1"
            />
          </div>
        </div>

        {/* Reminder Time */}
        <div className="card">
          <label className="block text-sm text-telegram-hint mb-2">
            Напоминание за (минут)
          </label>
          <select
            value={settings.reminderTime}
            onChange={(e) => handleChange('reminderTime', e.target.value)}
            className="input"
          >
            <option value="30">30 минут</option>
            <option value="60">1 час</option>
            <option value="120">2 часа</option>
            <option value="1440">1 день</option>
          </select>
        </div>

        {/* Phone */}
        <div className="card">
          <label className="block text-sm text-telegram-hint mb-2">
            Телефон
          </label>
          <input
            type="tel"
            value={settings.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="input"
            placeholder="+7 (900) 123-45-67"
          />
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4">
            <div className="text-center">Сохраняем...</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;