# 🚀 Deployment Guide - Trenergram

## ⚠️ ВАЖНО: Деплой происходит ТОЛЬКО через GitHub Actions!

При push в main ветку автоматически запускается деплой на сервер.
Ручной деплой не требуется и не рекомендуется.

## Автоматический деплой через GitHub

```bash
# Делаем изменения локально
git add -A
git commit -m "Описание изменений"
git push origin main

# GitHub Actions автоматически:
# 1. Запускает тесты
# 2. Деплоит на сервер
# 3. Перезапускает Docker контейнеры
```

## Инфраструктура на сервере

### Docker контейнеры
- **trenergram-backend-1**: FastAPI backend (port 8000)
- **trenergram-bot-1**: Telegram bot
- **trenergram-postgres-1**: PostgreSQL database
- **trenergram-redis-1**: Redis cache

### Пути на сервере
- **Проект**: `/opt/trenergram/`
- **Frontend**: `/var/www/trenergram/`
- **Nginx конфиг**: `/etc/nginx/sites-available/trenergram`
- **Docker Compose**: `/opt/trenergram/docker-compose.yml`

## Ручной деплой (только для экстренных случаев)

### Использование deploy.sh скрипта
```bash
# Деплой только frontend
./deploy.sh frontend

# Деплой только backend
./deploy.sh backend

# Деплой всего проекта
./deploy.sh all

# Проверка статуса
./deploy.sh status

# Просмотр логов
./deploy.sh logs
```

### Прямые команды на сервере
```bash
# Подключение к серверу
ssh -i ~/.ssh/trenergram_vds root@81.200.157.102

# Обновление кода
cd /opt/trenergram
git pull origin main

# Перезапуск контейнеров
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f backend
docker-compose logs -f bot
```

## Работа с базой данных

### Подключение к PostgreSQL
```bash
ssh -i ~/.ssh/trenergram_vds root@81.200.157.102
cd /opt/trenergram
docker-compose exec postgres psql -U trenergram -d trenergram
```

### Инициализация базы данных
```bash
# На сервере
cd /opt/trenergram
docker-compose exec backend python init_db.py
```

## Мониторинг

### Проверка здоровья API
```bash
curl https://trenergram.ru/api/v1/health
```

### Проверка контейнеров
```bash
ssh -i ~/.ssh/trenergram_vds root@81.200.157.102 "docker-compose ps"
```

### Просмотр логов в реальном времени
```bash
# Backend логи
ssh -i ~/.ssh/trenergram_vds root@81.200.157.102 "cd /opt/trenergram && docker-compose logs -f backend"

# Bot логи
ssh -i ~/.ssh/trenergram_vds root@81.200.157.102 "cd /opt/trenergram && docker-compose logs -f bot"
```

## Переменные окружения

Файл `.env` на сервере в `/opt/trenergram/.env`:
```bash
# Telegram Bot
BOT_TOKEN=8229544461:AAFr-MA466IKP_egh448meK6LLKWEZagofI
BOT_USERNAME=trenergram_bot

# Database
DATABASE_URL=postgresql://trenergram:trenergram123@postgres:5432/trenergram

# Redis
REDIS_URL=redis://redis:6379/0

# Environment
ENVIRONMENT=production
DEBUG=False
```

## URLs проекта
- **Production App**: https://trenergram.ru/app/
- **API**: https://trenergram.ru/api/v1/
- **Telegram Bot**: @trenergram_bot

## Решение проблем

### Если GitHub Actions падает
1. Проверьте логи: `gh run view --log-failed`
2. Очистите конфликты на сервере:
   ```bash
   ssh -i ~/.ssh/trenergram_vds root@81.200.157.102
   cd /opt/trenergram
   git stash
   git clean -fd
   git pull origin main
   ```

### Если контейнеры не запускаются
```bash
# Проверка логов
docker-compose logs

# Пересборка с нуля
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Если база данных пустая
```bash
cd /opt/trenergram
docker-compose exec backend python init_db.py
```

---

**Последнее обновление**: 21.09.2025