# Структура проекта Trenergram

## URL структура

### Продакшн (trenergram.ru)

**Публичный сайт (обычный браузер):**
- **`trenergram.ru/`** - Главная веб-витрина
- **`trenergram.ru/trainers`** - Лендинг/каталог тренеров
- **`trenergram.ru/clubs`** - Лендинг/каталог клубов
- **`trenergram.ru/admin/`** - Единая панель администрирования *[в разработке]*
  - Разграничение прав: super_admin, club_admin, club_owner

**Mini Apps (только через Telegram бота):**
- **`trenergram.ru/trainer/:id`** - Mini App тренера
- **`trenergram.ru/client/:id`** - Mini App клиента

**API:**
- **`trenergram.ru/api/`** - Backend API
- **`trenergram.ru/health`** - Health check endpoint

### Локальная разработка
- **`localhost:3000`** - Frontend (Vite dev server)
- **`localhost:8000`** - Backend API (FastAPI)
- **`localhost:5432`** - PostgreSQL
- **`localhost:6379`** - Redis

## Структура файлов

```
trenergram/
├── backend/                    # Backend API
│   ├── api/
│   │   ├── v1/                # API v1 endpoints
│   │   │   ├── users.py       # Пользователи
│   │   │   ├── bookings.py    # Бронирования
│   │   │   ├── trainers.py    # Тренеры (публичный API)
│   │   │   └── slots.py       # Слоты
│   │   └── admin/             # Admin API
│   │       ├── router.py      # Главный роутер (заглушка)
│   │       ├── auth.py        # JWT авторизация (создать)
│   │       ├── clubs.py       # Управление клубами (создать)
│   │       └── users.py       # Управление пользователями (создать)
│   ├── models/                # SQLAlchemy models
│   ├── core/                  # Настройки, security
│   ├── services/              # Бизнес-логика
│   ├── tasks/                 # Celery задачи
│   ├── alembic/              # Database migrations
│   ├── main.py               # FastAPI app
│   └── Dockerfile
│
├── public/                    # 🌐 Публичный сайт (обычный браузер)
│   ├── index.html            # Главная страница
│   ├── trainers.html         # Лендинг тренеров (временно)
│   ├── clubs.html            # Лендинг клубов (временно)
│   ├── admin/                # ✅ Единая админка (создать)
│   │   ├── index.html        # Главная админки
│   │   ├── login.html        # Вход (email/password)
│   │   ├── dashboard.html    # Дашборд
│   │   ├── clubs.html        # Управление клубами (super_admin)
│   │   ├── trainers.html     # Управление тренерами
│   │   ├── clients.html      # CRM клиенты
│   │   ├── analytics.html    # Аналитика
│   │   ├── js/
│   │   │   ├── auth.js       # JWT авторизация
│   │   │   ├── api.js        # API клиент
│   │   │   └── ...
│   │   └── css/
│   │       └── admin.css
│   ├── css/
│   ├── js/
│   └── img/
│
├── webapp/                    # 📱 Telegram Mini Apps (только через бота)
│   ├── trainer/              # Mini App тренера
│   │   ├── index.html
│   │   ├── app.js
│   │   └── styles.css
│   └── client/               # Mini App клиента
│       ├── index.html
│       ├── app.js
│       └── styles.css
│
├── .github/
│   └── workflows/
│       └── deploy-vds.yml    # ЕДИНСТВЕННЫЙ рабочий деплой
│
├── docker-compose.yml        # Docker оркестрация
├── requirements.txt          # Python dependencies
└── .env                      # Environment variables

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

### 📱 Telegram Mini Apps (`webapp/`)
- **Доступ:** ТОЛЬКО через Telegram бота, НЕ напрямую через браузер
- **Авторизация:** Telegram WebApp SDK (initData)
- **Содержимое:**
  - `webapp/trainer/` - Mini App тренера
  - `webapp/client/` - Mini App клиента
- **URL:** `trenergram.ru/trainer/:id` и `trenergram.ru/client/:id`

### 🌐 Публичный сайт + Админка (`public/`)
- **Доступ:** Обычный браузер, прямой URL
- **Авторизация:** JWT (email/password) для админки
- **Содержимое:**
  - Главная, лендинги, каталоги
  - `public/admin/` - единая панель администрирования
- **URL:** `trenergram.ru/`, `trenergram.ru/admin/`

### API
- Все API endpoints начинаются с `/api/`
- `/api/v1/` - публичные эндпоинты (Telegram WebApp auth)
- `/api/admin/` - админские эндпоинты (JWT auth)
- Health check доступен на `/health`

### Deployment
- GitHub Actions автоматически деплоит при push в main
- Docker containers: postgres, redis, backend, bot, celery-worker, celery-beat
- `public/` → `/var/www/trenergram/public/`
- `webapp/` → `/var/www/trenergram/webapp/`

### Текущий статус
- ✅ Backend API работает
- ✅ Telegram Bot работает
- ✅ Mini Apps развернуты (`webapp/trainer/`, `webapp/client/`)
- ✅ База данных и Redis работают
- ✅ SSL сертификат (HTTPS работает)
- ✅ Публичный сайт (лендинги)
- 🚧 Единая админка в `public/admin/` (в разработке)
- 🚧 API для клубов (в разработке)
- 🚧 Каталоги тренеров и клубов (в разработке)

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
*Последнее обновление: 25.10.2025*