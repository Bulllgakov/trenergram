# 🚀 Deployment на TimeWeb Cloud

## Почему TimeWeb может быть хорошим выбором:

### ✅ Преимущества для Trenergram:
1. **Российский хостинг** - низкий пинг для РФ аудитории
2. **Оплата в рублях** - без конвертации валюты
3. **App Platform** - есть PaaS с GitHub интеграцией
4. **Дешевле** - от 200₽/мес за VPS
5. **PostgreSQL + Redis** - доступны как managed сервисы

### ⚠️ Особенности:
- Документация в основном на русском
- Меньше готовых интеграций чем у западных
- Нет бесплатного тарифа (но есть тестовый период)

## 💰 Стоимость для Trenergram на TimeWeb:

### Вариант 1: VPS (полный контроль)
```
S1 тариф (начальный):
- 1 vCPU
- 1 GB RAM
- 10 GB SSD
- 200₽/мес

M2 тариф (рекомендуемый):
- 2 vCPU
- 4 GB RAM
- 30 GB SSD
- 590₽/мес
```

### Вариант 2: App Platform (PaaS)
```
Приложение:
- Автодеплой из GitHub ✅
- SSL сертификат ✅
- От 300₽/мес

PostgreSQL:
- 1 GB RAM
- 10 GB SSD
- От 590₽/мес

Redis:
- 512 MB RAM
- От 300₽/мес

Итого: ~1200₽/мес (≈$15)
```

## 🔧 Настройка деплоя на TimeWeb

### Шаг 1: Создание App Platform проекта

1. Зарегистрируйтесь на timeweb.cloud
2. Перейдите в раздел "App Platform"
3. Нажмите "Создать приложение"
4. Выберите "GitHub" как источник

### Шаг 2: Настройка GitHub интеграции

```yaml
# timeweb.yaml - конфигурация для App Platform
name: trenergram

services:
  - name: api
    github:
      repo: Bulllgakov/trenergram
      branch: main
      auto_deploy: true
    build:
      dockerfile: Dockerfile
    env:
      - key: DATABASE_URL
        value: ${DATABASE_URL}
      - key: BOT_TOKEN
        value: ${BOT_TOKEN}
    port: 8000
    health_check:
      path: /health

  - name: bot
    github:
      repo: Bulllgakov/trenergram
      branch: main
    run: python backend/app/bot/main.py
    env:
      - key: BOT_TOKEN
        value: ${BOT_TOKEN}

databases:
  - name: postgres
    type: postgresql
    version: 14
    size: small

  - name: redis
    type: redis
    version: 7
    size: small
```

### Шаг 3: Dockerfile для TimeWeb

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Копирование зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода
COPY . .

# Переменные окружения
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Запуск
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT}"]
```

### Шаг 4: GitHub Actions для автодеплоя

```yaml
# .github/workflows/timeweb-deploy.yml
name: Deploy to TimeWeb

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Deploy to TimeWeb
      env:
        TIMEWEB_API_TOKEN: ${{ secrets.TIMEWEB_API_TOKEN }}
      run: |
        curl -X POST \
          -H "Authorization: Bearer ${TIMEWEB_API_TOKEN}" \
          -H "Content-Type: application/json" \
          -d '{"branch": "main"}' \
          https://api.timeweb.cloud/api/v1/apps/${APP_ID}/deploy
```

### Шаг 5: Настройка базы данных

```bash
# Подключение к PostgreSQL на TimeWeb
psql postgresql://user:password@your-db.timeweb.cloud:5432/trenergram

# Запуск миграций
python backend/init_db.py
```

## 🆚 Сравнение TimeWeb vs Railway vs DigitalOcean:

| Критерий | TimeWeb | Railway | DigitalOcean |
|----------|---------|---------|--------------|
| **Стоимость старта** | 1200₽ ($15) | $5-20 | $20-30 |
| **GitHub деплой** | ✅ Есть | ✅ Отлично | ✅ Хорошо |
| **PostgreSQL** | ✅ 590₽/мес | ✅ Включено | ✅ $15/мес |
| **Redis** | ✅ 300₽/мес | ✅ Включено | ✅ $15/мес |
| **Бесплатный период** | 10 дней | $5/мес | $200/60дней |
| **Автомасштабирование** | ⚠️ Вручную | ✅ Авто | ✅ Авто |
| **Поддержка** | 🇷🇺 Русская | 🇬🇧 Англ | 🇬🇧 Англ |
| **Для РФ аудитории** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Простота** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## 🎯 Рекомендация для Trenergram:

### Выберите TimeWeb если:
✅ Основная аудитория в России/СНГ
✅ Важна оплата в рублях
✅ Нужна русскоязычная поддержка
✅ Готовы настраивать вручную

### Выберите Railway если:
✅ Нужен максимально быстрый старт
✅ Важен автодеплой и простота
✅ Международная аудитория
✅ Минимум настроек

## 📝 Пошаговая инструкция для TimeWeb:

### 1. Регистрация и настройка
```bash
# 1. Зарегистрируйтесь на timeweb.cloud
# 2. Пополните баланс на 1200₽
# 3. Создайте App Platform приложение
```

### 2. Настройка переменных окружения
```
DATABASE_URL=postgresql://user:pass@postgres.timeweb.cloud/trenergram
REDIS_URL=redis://redis.timeweb.cloud:6379
BOT_TOKEN=8229544461:AAFr-MA466IKP_egh448meK6LLKWEZagofI
SECRET_KEY=сгенерированный_ключ
```

### 3. Деплой
```bash
# Подключите GitHub репозиторий в панели TimeWeb
# Нажмите "Deploy"
# Приложение запустится автоматически
```

## 💡 Советы по TimeWeb:

1. **Используйте App Platform** вместо голого VPS - проще
2. **Настройте автобекапы** базы данных
3. **Включите мониторинг** в панели управления
4. **Используйте CDN** для статики (встроенный)

## 🚀 Альтернативный вариант - TimeWeb VPS:

Если хотите полный контроль, возьмите VPS и настройте всё вручную:

```bash
# На VPS TimeWeb
apt update && apt upgrade -y
apt install python3-pip postgresql redis nginx certbot

# Клонируйте проект
git clone https://github.com/Bulllgakov/trenergram.git
cd trenergram

# Установите зависимости
pip3 install -r requirements.txt

# Настройте systemd сервисы
# ... далее стандартная настройка
```

## 📞 Поддержка TimeWeb:

- Телефон: 8 (800) 333-19-68 (бесплатно по РФ)
- Telegram: @timeweb_support
- Email: support@timeweb.ru
- Чат на сайте 24/7