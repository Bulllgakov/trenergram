# 🔷 Google Cloud Deployment для Trenergram

## Когда стоит выбрать Google Cloud:

### ✅ Используйте GCP если:
- У вас есть опыт с Google Cloud
- Планируете 100+ клубов в первый год
- Нужна глобальная инфраструктура
- Важна интеграция с Google сервисами (Maps, Analytics)
- Есть бюджет $100+/мес после MVP

### ⚠️ НЕ используйте GCP если:
- Это ваш первый проект
- Нужно быстро запустить MVP
- Бюджет ограничен
- Нет опыта с Kubernetes/Docker

## 🚀 Deployment на Google Cloud Run

### Преимущества Cloud Run для Trenergram:
- Автоматическое масштабирование
- Платите только за использование
- HTTPS из коробки
- Поддержка контейнеров

### Шаг 1: Подготовка проекта

```bash
# Создайте проект в Google Cloud Console
gcloud projects create trenergram-app
gcloud config set project trenergram-app
```

### Шаг 2: Dockerfile

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Установка зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода
COPY . .

# Cloud Run использует PORT переменную
ENV PORT 8080
EXPOSE 8080

# Запуск приложения
CMD exec uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

### Шаг 3: Cloud Build конфигурация

```yaml
# cloudbuild.yaml
steps:
  # Build API image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/trenergram-api', '-f', 'Dockerfile', '.']

  # Push API image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/trenergram-api']

  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'trenergram-api'
      - '--image=gcr.io/$PROJECT_ID/trenergram-api'
      - '--region=europe-west1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--set-env-vars=DATABASE_URL=${_DATABASE_URL}'
```

### Шаг 4: База данных - Cloud SQL

```bash
# Создание PostgreSQL инстанса
gcloud sql instances create trenergram-db \
    --database-version=POSTGRES_14 \
    --tier=db-f1-micro \
    --region=europe-west1

# Создание базы данных
gcloud sql databases create trenergram \
    --instance=trenergram-db
```

### Шаг 5: Telegram Bot на Cloud Functions

```python
# bot_function.py
import functions_framework
from telegram import Update, Bot
from backend.app.bot.main import application

@functions_framework.http
def telegram_webhook(request):
    """Обработчик вебхуков от Telegram"""
    bot = Bot(token=os.environ['BOT_TOKEN'])
    update = Update.de_json(request.get_json(force=True), bot)

    # Обработка update
    application.process_update(update)

    return {'statusCode': 200}
```

### Шаг 6: Деплой через GitHub Actions

```yaml
# .github/workflows/deploy-gcp.yml
name: Deploy to Google Cloud

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - id: 'auth'
      uses: 'google-github-actions/auth@v1'
      with:
        credentials_json: '${{ secrets.GCP_SA_KEY }}'

    - name: 'Set up Cloud SDK'
      uses: 'google-github-actions/setup-gcloud@v1'

    - name: 'Deploy to Cloud Run'
      run: |
        gcloud run deploy trenergram-api \
          --source . \
          --region europe-west1 \
          --allow-unauthenticated
```

## 💰 Оценка стоимости на Google Cloud

### Минимальная конфигурация (MVP):
```
Cloud Run (API): ~$10-20/мес
Cloud Functions (Bot): ~$5-10/мес
Cloud SQL (PostgreSQL): ~$25/мес
Memorystore (Redis): ~$30/мес
---
Итого: ~$70-85/мес
```

### Рекомендуемая конфигурация:
```
Cloud Run (2 инстанса): ~$40/мес
Cloud SQL (высокая доступность): ~$60/мес
Memorystore: ~$30/мес
Cloud CDN: ~$20/мес
---
Итого: ~$150/мес
```

## 📊 Сравнение с Railway для MVP:

| Аспект | Google Cloud | Railway |
|--------|-------------|---------|
| Настройка | 1-2 дня | 5 минут |
| Сложность | Высокая | Низкая |
| Стоимость MVP | $70-85/мес | $5-20/мес |
| Автомасштабирование | ✅ Отлично | ✅ Хорошо |
| Для начала | ❌ Сложно | ✅ Идеально |

## 🎯 Рекомендация для Trenergram:

### План развития:
1. **Месяц 1-3**: Railway ($5-20/мес)
   - Быстрый запуск
   - Тестирование с реальными пользователями
   - Минимальные затраты

2. **Месяц 4-6**: DigitalOcean ($30-50/мес)
   - Первые платящие клубы
   - Стабильная работа
   - Простое управление

3. **Месяц 7+**: Google Cloud ($100+/мес)
   - Когда будет 20+ платящих клубов
   - Нужно автомасштабирование
   - Глобальное расширение

## 🚀 Quick Start на Google Cloud (если решили):

```bash
# 1. Установите gcloud CLI
curl https://sdk.cloud.google.com | bash

# 2. Авторизация
gcloud auth login

# 3. Создайте проект
gcloud projects create trenergram-$(date +%s)

# 4. Включите необходимые API
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com

# 5. Деплой
gcloud run deploy trenergram-api \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated
```

## ⚠️ Важные моменты:

1. **Используйте $300 кредитов** для экспериментов
2. **Настройте Budget Alerts** чтобы не превысить бюджет
3. **Начните с Cloud Run** - проще чем Kubernetes
4. **Используйте Firestore** вместо PostgreSQL для упрощения