# Структура проекта Trenergram

## URL структура

### Продакшн (trenergram.ru)
- **`trenergram.ru/`** - Веб-витрина (публичный сайт для поиска тренеров) *[в разработке]*
- **`trenergram.ru/trainer/:id`** - Mini App тренера (доступ только через бота)
- **`trenergram.ru/client/:id`** - Mini App клиента (доступ только через бота)
- **`trenergram.ru/api/`** - Backend API
- **`trenergram.ru/health`** - Health check endpoint
- **`trenergram.ru/club-admin/`** - Панель администратора клуба *[в разработке]*
- **`trenergram.ru/admin/`** - Админка супер-админов *[в разработке]*

### Локальная разработка
- **`localhost:3000`** - Frontend (Vite dev server)
- **`localhost:8000`** - Backend API (FastAPI)
- **`localhost:5432`** - PostgreSQL
- **`localhost:6379`** - Redis

## Структура файлов

```
trenergram/
├── backend/
│   ├── app/
│   │   ├── api/           # API endpoints
│   │   ├── bot/           # Telegram bot handlers
│   │   ├── core/          # Core settings and config
│   │   ├── db/            # Database models and sessions
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   └── main.py        # FastAPI app
│   ├── alembic/           # Database migrations
│   └── Dockerfile
│
├── frontend/              # Telegram Mini App (React + Vite)
│   ├── src/
│   │   ├── pages/         # React pages
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── utils/         # Utilities and API client
│   │   └── App.jsx        # Main app component
│   ├── vite.config.js     # Vite config
│   └── package.json
│
├── .github/
│   └── workflows/         # CI/CD pipelines
│       ├── deploy-vds.yml # Main deployment
│       └── test.yml       # Tests
│
├── docker-compose.yml     # Local development setup
├── requirements.txt       # Python dependencies
├── nginx-config.conf      # Production nginx config
└── .env                   # Environment variables

```

## Технологический стек

### Backend
- **Python 3.10**
- **FastAPI** - REST API framework
- **SQLAlchemy** - ORM
- **PostgreSQL** - База данных
- **Redis** - Кеширование и сессии
- **python-telegram-bot** - Telegram Bot API
- **Docker** - Контейнеризация

### Frontend (Mini App)
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Стилизация
- **@telegram-apps/sdk-react** - Telegram WebApp SDK
- **React Router** - Навигация
- **Axios** - HTTP client
- **Zustand** - State management

### Infrastructure
- **VDS Server** - IP: 81.200.157.102
- **Domain** - trenergram.ru
- **Nginx** - Web server и reverse proxy
- **Docker Compose** - Оркестрация контейнеров
- **GitHub Actions** - CI/CD
- **SSL/TLS** - Let's Encrypt *[требует настройки]*

## Важные заметки

### Mini App
- Mini App доступен только через Telegram бота, не напрямую через браузер
- Использует Telegram WebApp SDK для аутентификации
- Один Mini App для тренеров и клиентов с разными интерфейсами
- Разные пути для тренеров `/trainer/:id` и клиентов `/client/:id`

### API
- Все API endpoints начинаются с `/api/`
- Аутентификация через Telegram Init Data
- Health check доступен на `/health`

### Deployment
- GitHub Actions автоматически деплоит при push в main
- Docker containers: postgres, redis, backend, bot
- Frontend собирается и копируется в `/var/www/trenergram/`

### Текущий статус
- ✅ Backend API работает
- ✅ Telegram Bot работает
- ✅ Mini App развернут на `/trainer/` и `/client/`
- ✅ База данных и Redis работают
- ⚠️ SSL сертификат требует настройки
- 🚧 Веб-витрина в разработке
- 🚧 Панель клуба в разработке
- 🚧 Админка в разработке

## Переменные окружения

```env
# Backend
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost/dbname
REDIS_URL=redis://localhost:6379
BOT_TOKEN=your-telegram-bot-token

# Frontend
VITE_API_URL=/api

# Production
DOMAIN=trenergram.ru
ENVIRONMENT=production
```

## Команды для разработки

```bash
# Backend
cd backend
python -m uvicorn app.main:app --reload

# Frontend
cd frontend
npm run dev

# Docker
docker-compose up -d

# Tests
pytest

# Deployment
git push origin main  # автоматический деплой через GitHub Actions
```

---
*Последнее обновление: 20.09.2025*