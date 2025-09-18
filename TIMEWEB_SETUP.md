# 🚀 Настройка автодеплоя Trenergram на TimeWeb

## ✅ У вас уже создано App в TimeWeb с параметрами:
- **Регион**: Нидерланды
- **Окружение**: Python
- **Фреймворк**: FastAPI
- **Ресурсы**: 1 CPU, 1GB RAM, 15GB SSD
- **Автодеплой**: Включено

## 📝 Шаг 1: Получите API токен TimeWeb

1. Зайдите в панель TimeWeb Cloud
2. Перейдите в **Настройки** → **API токены**
3. Создайте новый токен с правами на App Platform
4. Скопируйте токен (показывается только один раз!)

## 🔐 Шаг 2: Добавьте секреты в GitHub

1. Откройте ваш репозиторий: https://github.com/Bulllgakov/trenergram
2. Перейдите в **Settings** → **Secrets and variables** → **Actions**
3. Добавьте следующие секреты:

```
TIMEWEB_API_TOKEN = ваш_api_токен_из_шага_1
TIMEWEB_APP_ID = id_вашего_app_из_панели_timeweb
```

## 🔗 Шаг 3: Подключите GitHub к TimeWeb

В панели TimeWeb для вашего App:

1. Перейдите в раздел **Деплой** → **GitHub интеграция**
2. Нажмите **Подключить GitHub**
3. Авторизуйте TimeWeb в GitHub
4. Выберите репозиторий: `Bulllgakov/trenergram`
5. Выберите ветку: `main`
6. Включите **Автодеплой при push**

## ⚙️ Шаг 4: Настройте переменные окружения

В панели TimeWeb для вашего App:

1. Перейдите в **Настройки** → **Переменные окружения**
2. Добавьте следующие переменные:

```bash
# ОБЯЗАТЕЛЬНЫЕ
BOT_TOKEN=8229544461:AAFr-MA466IKP_egh448meK6LLKWEZagofI
BOT_USERNAME=trenergram_bot
SECRET_KEY=сгенерируйте_ключ_командой_ниже

# ОПЦИОНАЛЬНЫЕ (TimeWeb добавит автоматически)
DATABASE_URL=(будет добавлен автоматически)
REDIS_URL=(будет добавлен автоматически)
PORT=(будет добавлен автоматически)

# Настройки
ENVIRONMENT=production
DEBUG=False
PYTHONUNBUFFERED=1
```

Для генерации SECRET_KEY выполните:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## 🗄️ Шаг 5: Добавьте PostgreSQL и Redis

В панели TimeWeb:

1. Перейдите в **Дополнения** → **Базы данных**
2. Добавьте **PostgreSQL**:
   - Версия: 14
   - План: Starter
   - Имя БД: trenergram
3. Добавьте **Redis**:
   - Версия: 7
   - План: Starter

TimeWeb автоматически добавит `DATABASE_URL` и `REDIS_URL` в переменные окружения!

## 🚀 Шаг 6: Настройте команды запуска

В панели TimeWeb в разделе **Настройки сборки**:

### Build команда:
```bash
pip install -r requirements.txt && python backend/init_db.py
```

### Start команда:
```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

### Worker процесс (для бота):
Добавьте второй процесс:
```bash
python backend/app/bot/main.py
```

## 📦 Шаг 7: Первый деплой

### Вариант А: Через GitHub (автоматически)
```bash
git add .
git commit -m "Setup TimeWeb deployment"
git push origin main
```

### Вариант Б: Через панель TimeWeb
1. В панели TimeWeb нажмите кнопку **Deploy**
2. Выберите ветку `main`
3. Нажмите **Start Deployment**

## ✅ Шаг 8: Проверка

1. **Проверьте API**:
   ```
   https://ваш-app.timeweb.cloud/
   https://ваш-app.timeweb.cloud/api/docs
   ```

2. **Проверьте бота**:
   - Откройте @trenergram_bot в Telegram
   - Отправьте `/start`

3. **Проверьте логи** в панели TimeWeb:
   - Раздел **Логи** → **Реальное время**

## 🔄 Автодеплой настроен!

Теперь каждый push в ветку `main` будет автоматически деплоиться на TimeWeb!

```bash
# Для деплоя просто делайте:
git add .
git commit -m "Ваши изменения"
git push origin main

# GitHub Actions автоматически задеплоит на TimeWeb
```

## 🆘 Troubleshooting

### Ошибка "Module not found"
```bash
# Убедитесь что все зависимости в requirements.txt
pip freeze > requirements.txt
git add requirements.txt
git commit -m "Update requirements"
git push
```

### Бот не отвечает
1. Проверьте что worker процесс запущен
2. Проверьте переменную BOT_TOKEN
3. Смотрите логи worker процесса

### База данных не подключается
1. Проверьте что PostgreSQL addon добавлен
2. DATABASE_URL должен быть в переменных автоматически
3. Перезапустите приложение

## 📞 Поддержка TimeWeb

- **Чат**: В панели TimeWeb (правый нижний угол)
- **Telegram**: @timeweb_support
- **Email**: support@timeweb.ru
- **Телефон**: 8 (800) 333-19-68

## 🎉 Готово!

Ваше приложение Trenergram теперь работает на TimeWeb с автодеплоем!