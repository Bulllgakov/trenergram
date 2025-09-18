# Настройка GitHub Actions для TimeWeb

## Варианты деплоя

### Вариант 1: Через TimeWeb API (рекомендуется)

1. Получите API токен TimeWeb:
   - Зайдите в личный кабинет TimeWeb
   - Раздел "API" или "Настройки" → "API токены"
   - Создайте новый токен

2. Получите ID вашего приложения:
   - В панели управления приложением
   - URL будет вида: `https://timeweb.cloud/apps/YOUR_APP_ID`

3. Добавьте секреты в GitHub:
   - Откройте https://github.com/Bulllgakov/trenergram/settings/secrets/actions
   - Добавьте:
     - `TIMEWEB_API_TOKEN` - API токен из п.1
     - `TIMEWEB_APP_ID` - ID приложения из п.2

### Вариант 2: Через SSH (если доступен)

1. Получите SSH доступ к серверу TimeWeb:
   - В панели управления приложением
   - Раздел "SSH доступ"

2. Добавьте секреты в GitHub:
   - `TIMEWEB_SSH_HOST` - адрес сервера
   - `TIMEWEB_SSH_USER` - имя пользователя
   - `TIMEWEB_SSH_KEY` - приватный SSH ключ
   - `TIMEWEB_APP_PATH` - путь к приложению на сервере

### Вариант 3: Через Docker Registry

Если TimeWeb предоставляет Docker Registry:

1. Получите данные реестра:
   - Адрес реестра
   - Логин и пароль

2. Добавьте секреты в GitHub:
   - `TIMEWEB_REGISTRY` - адрес реестра
   - `TIMEWEB_USERNAME` - имя пользователя
   - `TIMEWEB_PASSWORD` - пароль

## Как добавить секреты в GitHub

1. Перейдите на https://github.com/Bulllgakov/trenergram
2. Settings → Secrets and variables → Actions
3. New repository secret
4. Добавьте каждый секрет

## Проверка работы

После настройки:
1. Сделайте любое изменение в коде
2. Запушьте в main ветку
3. Перейдите в Actions на GitHub
4. Проверьте статус workflow

## Минимальная настройка

Для начала достаточно настроить только API вариант:
- `TIMEWEB_API_TOKEN`
- `TIMEWEB_APP_ID`

Остальные варианты можно добавить позже при необходимости.