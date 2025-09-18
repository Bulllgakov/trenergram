# 🚀 Deployment Guide - Trenergram

## Рекомендуемая стратегия развертывания

### Этап 1: MVP и тестирование
**Платформа: Railway.app**

#### Почему Railway:
- ✅ Быстрый старт (5 минут до деплоя)
- ✅ PostgreSQL и Redis включены
- ✅ Автодеплой из GitHub
- ✅ HTTPS автоматически
- ✅ Хватит бесплатных $5 на тестирование
- ✅ Легко масштабировать

#### Как развернуть на Railway:
```bash
# 1. Установите Railway CLI
npm install -g @railway/cli

# 2. Логин
railway login

# 3. Инициализация проекта
railway init

# 4. Добавьте сервисы
railway add postgresql
railway add redis

# 5. Деплой
railway up
```

### Этап 2: Первые клиенты (10-50 клубов)
**Платформа: DigitalOcean App Platform или Hetzner VPS**

#### DigitalOcean App Platform:
```yaml
# app.yaml
name: trenergram
services:
- name: api
  github:
    repo: Bulllgakov/trenergram
    branch: main
    deploy_on_push: true
  build_command: pip install -r requirements.txt
  run_command: uvicorn backend.app.main:app --host 0.0.0.0 --port 8080

- name: bot
  github:
    repo: Bulllgakov/trenergram
    branch: main
  run_command: python backend/app/bot/main.py

databases:
- name: db
  engine: postgresql
  production: true
```

### Этап 3: Масштабирование (50+ клубов)
**Инфраструктура: Kubernetes на DigitalOcean/Yandex Cloud**

## 📦 Docker конфигурация

### Dockerfile для Backend:
```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY webapp/ ./webapp/

# API сервер
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.yml:
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/trenergram
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  bot:
    build: .
    command: python backend/app/bot/main.py
    environment:
      - BOT_TOKEN=${BOT_TOKEN}
      - DATABASE_URL=postgresql://user:pass@db:5432/trenergram
    depends_on:
      - db

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=trenergram
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## 🔧 Переменные окружения для продакшена

```bash
# Production .env
BOT_TOKEN=8229544461:AAFr-MA466IKP_egh448meK6LLKWEZagofI
BOT_USERNAME=trenergram_bot

# Database (используйте connection string от провайдера)
DATABASE_URL=postgresql://user:password@host:5432/trenergram

# Redis
REDIS_URL=redis://redis:6379/0

# Security
SECRET_KEY=$(openssl rand -hex 32)
ENVIRONMENT=production
DEBUG=False

# Domain
DOMAIN=trenergram.ru
WEBAPP_URL=https://trenergram.ru
```

## 🌐 Настройка домена

### 1. Купите домен trenergram.ru
- Рекомендую: Namecheap, Reg.ru, или Yandex Domains

### 2. Настройте DNS:
```
A     @      IP_ВАШЕГО_СЕРВЕРА
A     www    IP_ВАШЕГО_СЕРВЕРА
A     api    IP_ВАШЕГО_СЕРВЕРА
```

### 3. Настройте SSL (Let's Encrypt):
```bash
# На сервере
sudo apt update
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d trenergram.ru -d www.trenergram.ru -d api.trenergram.ru
```

## 📱 Настройка Telegram Webhook

```python
# setup_webhook.py
import asyncio
from telegram import Bot

BOT_TOKEN = "your_token"
WEBHOOK_URL = "https://api.trenergram.ru/webhook"

async def setup_webhook():
    bot = Bot(token=BOT_TOKEN)
    await bot.set_webhook(
        url=WEBHOOK_URL,
        allowed_updates=["message", "callback_query", "inline_query"]
    )
    info = await bot.get_webhook_info()
    print(f"Webhook set: {info.url}")

asyncio.run(setup_webhook())
```

## 📊 Мониторинг

### Рекомендуемые сервисы:
1. **Sentry** - для отслеживания ошибок
2. **Grafana + Prometheus** - метрики
3. **Uptime Robot** - мониторинг доступности

## 💰 Бюджет на разных этапах

| Этап | Платформа | Стоимость/мес |
|------|-----------|---------------|
| MVP | Railway | $0-5 |
| Старт (до 10 клубов) | Railway Pro | $10-20 |
| Рост (10-50 клубов) | DigitalOcean | $30-50 |
| Масштаб (50+ клубов) | DO + CDN | $100+ |

## 🚀 Quick Start на Railway

```bash
# 1. Форкните проект
# 2. Зайдите на railway.app
# 3. New Project -> Deploy from GitHub
# 4. Выберите репозиторий trenergram
# 5. Добавьте переменные окружения
# 6. Deploy!
```

## 📝 Чеклист перед деплоем

- [ ] Изменить SECRET_KEY на продакшн
- [ ] Настроить PostgreSQL вместо SQLite
- [ ] Включить Redis для кеширования
- [ ] Настроить Webhook для бота
- [ ] Проверить CORS настройки
- [ ] Настроить backup базы данных
- [ ] Настроить SSL сертификат
- [ ] Добавить мониторинг ошибок