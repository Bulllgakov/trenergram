# Trenergram - Платформа для бронирования тренеров

Автоматизированная система записи на фитнес-тренировки через Telegram. Платформа полностью **БЕСПЛАТНА** для тренеров и клиентов.

## 🎯 Основные функции

### Для тренеров (бесплатно)
- Управление расписанием через Telegram Mini App
- Автоматические напоминания клиентам
- Персональная ссылка для привлечения клиентов
- Статистика тренировок
- Интеграция с фитнес-клубами

### Для клиентов (бесплатно)
- Быстрая запись на тренировки
- Напоминания в Telegram
- История тренировок
- Управление записями

### Для фитнес-клубов
- **Базовый тариф (0₽)**: до 5 тренеров, базовая статистика
- **Стандарт (9900₽/мес)**: до 20 тренеров, CRM, аналитика
- **Премиум (19900₽/мес)**: неограниченно тренеров, API, white-label

## 🏗 Архитектура

```
trenergram/
├── backend/               # Python FastAPI backend
│   ├── app/
│   │   ├── api/          # REST API endpoints
│   │   ├── bot/          # Telegram bot handlers
│   │   ├── core/         # Core configuration
│   │   ├── db/           # Database connection
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # Business logic
│   └── tests/            # Tests
├── frontend/             # React.js admin panels
│   └── src/
│       ├── components/   # React components
│       ├── pages/        # Page components
│       └── services/     # API services
├── webapp/               # Telegram Mini Apps
│   ├── trainer/          # Trainer Mini App
│   └── client/          # Client Mini App
├── migrations/           # Database migrations
└── docs/                # Documentation
```

## 🚀 Установка и запуск

### Требования
- Python 3.10+
- PostgreSQL (или SQLite для разработки)
- Redis
- Node.js 18+ (для фронтенда)

### 1. Клонирование репозитория
```bash
git clone https://github.com/yourusername/trenergram.git
cd trenergram
```

### 2. Настройка окружения
```bash
# Создание виртуального окружения
python -m venv venv
source venv/bin/activate  # На Windows: venv\Scripts\activate

# Установка зависимостей
pip install -r requirements.txt
```

### 3. Настройка переменных окружения
```bash
cp .env.example .env
# Отредактируйте .env и добавьте свои настройки
```

### 4. Настройка базы данных
```bash
# Создание миграций
alembic init migrations
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

### 5. Запуск приложения

#### Backend API
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

#### Telegram Bot
```bash
cd backend
python -m app.bot.main
```

#### Frontend (в разработке)
```bash
cd frontend
npm install
npm start
```

## 📱 Telegram Bot

### Создание бота
1. Откройте [@BotFather](https://t.me/BotFather)
2. Создайте нового бота командой `/newbot`
3. Сохраните токен в `.env` файл
4. Настройте команды через `/setcommands`

### Команды бота

**Для тренеров:**
- `/start` - начало работы
- `/schedule` - расписание на сегодня
- `/today` - клиенты на сегодня
- `/tomorrow` - клиенты на завтра
- `/my_link` - персональная ссылка
- `/settings` - настройки
- `/stats` - статистика

**Для клиентов:**
- `/book` - записаться на тренировку
- `/my` - мои тренировки
- `/cancel` - отменить тренировку
- `/trainers` - мои тренеры

## 🔧 API Endpoints

### Публичное API (v1)
- `GET /api/v1/` - информация об API
- `GET /api/v1/trainers` - список тренеров
- `GET /api/v1/clubs` - список клубов
- `POST /api/v1/bookings` - создание записи

### Админ API
- `POST /api/admin/auth/login` - вход в админку
- `GET /api/admin/clubs` - управление клубами
- `GET /api/admin/users` - управление пользователями
- `GET /api/admin/analytics` - аналитика

## 📊 База данных

### Основные таблицы
- `clubs` - фитнес-клубы
- `trainers` - тренеры
- `clients` - клиенты
- `bookings` - записи на тренировки
- `club_admins` - администраторы клубов
- `club_payments` - платежи клубов

## 🧪 Тестирование

```bash
# Запуск тестов
pytest

# С покрытием кода
pytest --cov=backend/app

# Только unit тесты
pytest tests/unit

# Только интеграционные тесты
pytest tests/integration
```

## 📝 Разработка

### Форматирование кода
```bash
# Форматирование Python кода
black backend/

# Проверка линтером
flake8 backend/

# Проверка типов
mypy backend/
```

### Создание миграций
```bash
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

## 🚢 Деплой

### Подготовка к продакшену
1. Настройте PostgreSQL вместо SQLite
2. Настройте Redis для кеширования
3. Используйте настоящий токен бота
4. Настройте SSL сертификат
5. Настройте домен trenergram.ru

### Docker (в разработке)
```bash
docker-compose up -d
```

### Системные требования
- VPS/VDS сервер минимум 4GB RAM
- Ubuntu 20.04+ или аналог
- Nginx для проксирования
- SSL сертификат (Let's Encrypt)

## 📄 Лицензия

MIT

## 👥 Команда

Проект разрабатывается для автоматизации записи на фитнес-тренировки.

## 📞 Контакты

- Email: support@trenergram.ru
- Telegram: @trenergram_support

---

**Trenergram** - платформа полностью БЕСПЛАТНА для тренеров и клиентов! 🚀