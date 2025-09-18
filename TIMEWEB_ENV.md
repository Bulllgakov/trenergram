# Настройка переменных окружения в TimeWeb

## 1. Обязательные переменные

В панели TimeWeb перейдите в раздел "Переменные окружения" и добавьте:

### Основные:
```
BOT_TOKEN=8229544461:AAFr-MA466IKP_egh448meK6LLKWEZagofI
BOT_USERNAME=trenergram_bot
SECRET_KEY=your-secret-key-here-generate-with-openssl-rand-hex-32
ENVIRONMENT=production
DEBUG=False
```

### База данных (будет предоставлена TimeWeb):
```
DATABASE_URL=postgresql+asyncpg://user:password@host:port/dbname
```

### Redis (будет предоставлен TimeWeb):
```
REDIS_URL=redis://host:port/0
CELERY_BROKER_URL=redis://host:port/1
CELERY_RESULT_BACKEND=redis://host:port/2
```

### Домен:
```
DOMAIN=trenergram.ru
WEBAPP_URL=https://trenergram.ru
```

### Администратор:
```
SUPER_ADMIN_EMAIL=admin@trenergram.ru
SUPER_ADMIN_PASSWORD=changeme
```

## 2. Порядок настройки в TimeWeb

1. **Подключите PostgreSQL:**
   - В разделе "Базы данных" → "Добавить базу данных"
   - Выберите PostgreSQL
   - Скопируйте DATABASE_URL

2. **Подключите Redis:**
   - В разделе "Дополнения" → "Redis"
   - Включите Redis
   - Скопируйте REDIS_URL

3. **Добавьте переменные:**
   - Раздел "Переменные окружения"
   - Добавьте каждую переменную из списка выше
   - Замените значения DATABASE_URL и REDIS_URL на реальные

4. **Пересоберите приложение:**
   - После добавления всех переменных
   - Нажмите "Пересобрать" в панели управления

## 3. Проверка работы

После успешного запуска:

1. API должен быть доступен по адресу вашего приложения на `/docs`
2. Telegram бот @trenergram_bot должен отвечать на команду `/start`

## 4. Генерация SECRET_KEY

Для production используйте безопасный ключ:

```bash
openssl rand -hex 32
```

Или в Python:
```python
import secrets
print(secrets.token_urlsafe(32))
```

## 5. Важные замечания

- **НЕ используйте** DEBUG=True в production
- **Обязательно смените** SUPER_ADMIN_PASSWORD
- **Сгенерируйте новый** SECRET_KEY для production
- После настройки домена обновите DOMAIN и WEBAPP_URL