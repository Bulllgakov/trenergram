# Trenergram - Локальная разработка

Инструкции по настройке окружения для локальной разработки Trenergram.

## Требования

- Docker Desktop (или Docker Engine + Docker Compose)
- Git
- (Опционально) Python 3.11+ для разработки без Docker

## Быстрый старт

### 1. Клонирование репозитория

```bash
git clone https://github.com/Bulllgakov/trenergram.git
cd trenergram
```

### 2. Настройка переменных окружения

```bash
# Скопируйте пример конфигурации
cp .env.example .env

# Отредактируйте .env файл
# Для локальной разработки достаточно оставить значения по умолчанию
```

**Минимальная конфигурация для старта:**

```env
# .env
BOT_TOKEN=your_test_bot_token  # Получите у @BotFather
BOT_USERNAME=your_bot_username
DATABASE_URL=postgresql://trenergram:trenergram123@localhost:5432/trenergram
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=dev-secret-key-change-in-production
ENVIRONMENT=development
DEBUG=True
DOMAIN=localhost
WEBAPP_URL=http://localhost:8080
```

### 3. Запуск с Docker Compose

```bash
# Запустить все сервисы (БД, Redis, Backend, Frontend)
docker-compose -f docker-compose.dev.yml up -d

# Посмотреть логи
docker-compose -f docker-compose.dev.yml logs -f

# Остановить сервисы
docker-compose -f docker-compose.dev.yml down
```

### 4. Применить миграцию для создания super_admin

```bash
# Дождитесь, пока запустится база данных (около 10 секунд)
docker exec -i trenergram-dev-postgres psql -U trenergram -d trenergram < backend/migrations/create_super_admin.sql
```

### 5. Открыть приложение

- **Публичный сайт**: http://localhost:8080
- **Админ-панель**: http://localhost:8080/admin
  - Email: `admin@trenergram.ru`
  - Пароль: `changeme`
- **Trainer Mini App**: http://localhost:8080/trainer
- **Client Mini App**: http://localhost:8080/client
- **API документация**: http://localhost:8000/api/docs
- **Backend health**: http://localhost:8000/health

## Структура проекта

```
trenergram/
├── backend/               # Backend API (FastAPI)
│   ├── api/              # API endpoints
│   │   ├── v1/          # API v1 (Mini Apps)
│   │   └── admin/       # Admin API
│   ├── core/            # Core utilities (auth, config)
│   ├── models/          # Database models
│   ├── services/        # Business logic
│   ├── tasks/           # Celery tasks
│   ├── db/              # Database configuration
│   └── migrations/      # SQL migrations
├── bot/                  # Telegram Bot
├── public/              # Публичный сайт
│   ├── admin/          # Админ-панель
│   ├── css/
│   └── js/
├── webapp/              # Telegram Mini Apps
│   ├── trainer/        # Trainer Mini App
│   └── client/         # Client Mini App
├── docker-compose.yml         # Production compose
├── docker-compose.dev.yml     # Development compose
└── nginx-dev.conf            # Nginx config for dev
```

## Разработка

### Backend (FastAPI)

Backend запускается с **hot-reload** - изменения в коде автоматически перезагружают сервер.

```bash
# Логи backend
docker-compose -f docker-compose.dev.yml logs -f backend

# Перезапустить backend
docker-compose -f docker-compose.dev.yml restart backend

# Войти в контейнер backend для отладки
docker exec -it trenergram-dev-backend /bin/bash
```

**Полезные команды внутри контейнера:**

```bash
# Запустить Python shell с контекстом приложения
python

# Выполнить SQL запрос
docker exec -i trenergram-dev-postgres psql -U trenergram -d trenergram -c "SELECT * FROM users LIMIT 5;"
```

### Frontend (HTML/CSS/JS)

Frontend файлы монтируются как volumes, изменения видны сразу после обновления страницы.

- **Админ-панель**: `public/admin/`
- **Mini Apps**: `webapp/trainer/`, `webapp/client/`
- **Публичный сайт**: `public/`

**Для редактирования:**

1. Открой файлы в любом редакторе
2. Внеси изменения
3. Обнови страницу в браузере (Ctrl+Shift+R для полной перезагрузки)

### База данных

PostgreSQL доступна на `localhost:5432`.

```bash
# Подключиться к БД через psql
docker exec -it trenergram-dev-postgres psql -U trenergram -d trenergram

# Или через любой GUI клиент (DBeaver, pgAdmin, etc.)
# Host: localhost
# Port: 5432
# User: trenergram
# Password: trenergram123
# Database: trenergram
```

**Полезные SQL команды:**

```sql
-- Посмотреть все таблицы
\dt

-- Посмотреть пользователей
SELECT * FROM users LIMIT 10;

-- Посмотреть admin пользователей
SELECT * FROM club_admins;

-- Посмотреть тренировки
SELECT * FROM bookings ORDER BY created_at DESC LIMIT 10;
```

### Redis

Redis доступен на `localhost:6379`.

```bash
# Подключиться к Redis
docker exec -it trenergram-dev-redis redis-cli

# Команды внутри redis-cli:
# KEYS * - посмотреть все ключи
# GET key - получить значение
# FLUSHALL - очистить все данные
```

## Отладка

### Проверка здоровья сервисов

```bash
# Backend
curl http://localhost:8000/health

# Admin API
curl http://localhost:8000/api/admin/

# Postgres
docker exec trenergram-dev-postgres pg_isready -U trenergram

# Redis
docker exec trenergram-dev-redis redis-cli ping
```

### Логи

```bash
# Все логи
docker-compose -f docker-compose.dev.yml logs -f

# Конкретный сервис
docker-compose -f docker-compose.dev.yml logs -f backend
docker-compose -f docker-compose.dev.yml logs -f postgres
docker-compose -f docker-compose.dev.yml logs -f frontend
```

### Очистка и перезапуск

```bash
# Остановить и удалить все контейнеры
docker-compose -f docker-compose.dev.yml down

# Удалить volumes (БД будет очищена!)
docker-compose -f docker-compose.dev.yml down -v

# Пересобрать образы
docker-compose -f docker-compose.dev.yml build --no-cache

# Запустить заново
docker-compose -f docker-compose.dev.yml up -d
```

## Тестирование админ-панели

### 1. Вход в админ-панель

1. Открой http://localhost:8080/admin
2. Email: `admin@trenergram.ru`
3. Пароль: `changeme`

### 2. Создание тестовых данных

Через API:

```bash
# Создать тренера
curl -X POST http://localhost:8000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "telegram_id": "123456789",
    "name": "Иван Тренеров",
    "role": "trainer",
    "phone": "+79991234567"
  }'

# Создать клиента
curl -X POST http://localhost:8000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "telegram_id": "987654321",
    "name": "Петр Клиентов",
    "role": "client",
    "phone": "+79997654321"
  }'
```

Или напрямую через SQL:

```sql
-- Создать тестового тренера
INSERT INTO users (telegram_id, name, role, phone, is_active)
VALUES ('123456789', 'Иван Тренеров', 'trainer', '+79991234567', true);

-- Создать тестового клиента
INSERT INTO users (telegram_id, name, role, phone, is_active)
VALUES ('987654321', 'Петр Клиентов', 'client', '+79997654321', true);
```

### 3. Проверка функционала

- **Dashboard**: Должна показать статистику
- **Trainers**: Список тренеров с поиском
- **Clients**: Список клиентов с поиском
- **Clubs**: Управление клубами (только для super_admin)

## Работа с Telegram Bot (опционально)

Для тестирования Telegram бота локально:

### 1. Раскомментируй bot service в docker-compose.dev.yml

```yaml
# Убери комментарии с:
bot:
  build: .
  container_name: trenergram-dev-bot
  # ... остальная конфигурация
```

### 2. Получи тестовый токен бота

1. Открой Telegram и найди @BotFather
2. Создай нового бота: `/newbot`
3. Скопируй полученный токен
4. Добавь в `.env`:

```env
BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
BOT_USERNAME=your_test_bot
```

### 3. Настрой ngrok для локального webhook (если нужен)

```bash
# Установи ngrok
brew install ngrok  # для macOS

# Запусти tunnel
ngrok http 8000

# Используй https URL от ngrok в WEBAPP_URL
```

## Разработка без Docker

Если хочешь запускать backend локально без Docker:

### 1. Установи зависимости

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/macOS
# или
venv\Scripts\activate  # Windows

pip install -r ../requirements.txt
```

### 2. Запусти PostgreSQL и Redis

```bash
# Через Docker только БД
docker-compose -f docker-compose.dev.yml up -d postgres redis
```

### 3. Обнови .env

```env
DATABASE_URL=postgresql+asyncpg://trenergram:trenergram123@localhost:5432/trenergram
```

### 4. Запусти backend

```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Запусти frontend (простой HTTP сервер)

```bash
# В корне проекта
python -m http.server 8080

# Или используй Live Server в VS Code
```

## Полезные ссылки

- **FastAPI документация**: https://fastapi.tiangolo.com/
- **SQLAlchemy**: https://docs.sqlalchemy.org/
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Tabler (админка)**: https://tabler.io/docs
- **Docker Compose**: https://docs.docker.com/compose/

## Проблемы и решения

### Порт уже занят

```bash
# Найти процесс на порту 8000
lsof -i :8000

# Убить процесс
kill -9 <PID>

# Или измени порт в docker-compose.dev.yml
```

### БД не запускается

```bash
# Проверь логи
docker-compose -f docker-compose.dev.yml logs postgres

# Удали volume и попробуй снова
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d postgres
```

### Backend падает с ошибкой импорта

```bash
# Пересобери образ
docker-compose -f docker-compose.dev.yml build backend
docker-compose -f docker-compose.dev.yml up -d backend
```

### Админ-панель не открывается

1. Проверь, что frontend контейнер запущен
2. Проверь nginx логи
3. Проверь, что файлы в `public/admin/` на месте

```bash
docker-compose -f docker-compose.dev.yml logs frontend
docker exec trenergram-dev-frontend ls -la /usr/share/nginx/html/public/admin
```

## Контакты и помощь

Если возникли проблемы:
1. Проверь логи: `docker-compose -f docker-compose.dev.yml logs`
2. Посмотри issues на GitHub
3. Создай новый issue с описанием проблемы

---

**Удачной разработки! 🚀**
