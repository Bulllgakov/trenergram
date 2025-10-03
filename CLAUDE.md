# Памятка для Claude о проекте Trenergram

## ⚠️ КРИТИЧЕСКИ ВАЖНО: ДЕПЛОЙ
**ДЕПЛОЙ ТОЛЬКО ЧЕРЕЗ GITHUB ACTIONS!**
- При `git push origin main` автоматически запускается деплой
- НЕ использовать ручной деплой через SSH
- НЕ использовать прямые команды на сервере
- Инфраструктура: Docker Compose в `/opt/trenergram/`
- Если нужно что-то исправить на сервере - делай через коммит и push

## Структура URL (ВАЖНО!)
- **trenergram.ru/** - Веб-витрина (в разработке)
- **trenergram.ru/app/** - Mini App (только через Telegram)
  - `/app/trainer/:id` - для тренеров
  - `/app/client/:id` - для клиентов
- **trenergram.ru/api/** - Backend API
- **trenergram.ru/club-admin/** - Панель клуба (в разработке)
- **trenergram.ru/admin/** - Супер-админка (в разработке)

## Mini App
- **Локальная разработка:** папка `webapp/` в корне проекта
  - `webapp/trainer/` - Mini App тренера (HTML/JS)
  - `webapp/client/` - Mini App клиента (HTML/JS)
- **На сервере:** `/opt/trenergram/webapp/`
- Разные интерфейсы в зависимости от роли
- URL: `trenergram.ru/app/trainer/:id` и `trenergram.ru/app/client/:id`
- Доступ только через Telegram бота

## Сервер
- IP: 81.200.157.102
- Домен: trenergram.ru
- SSH: root@81.200.157.102 (НЕ ИСПОЛЬЗОВАТЬ для деплоя!)
- Проект: /opt/trenergram
- **ВАЖНО: Структура директорий на сервере:**
  - `/opt/trenergram/webapp/` - Mini Apps (НЕ /var/www/trenergram/!)
  - `/opt/trenergram/webapp/trainer/` - Mini App тренера
  - `/opt/trenergram/webapp/client/` - Mini App клиента
  - `/opt/trenergram/backend/` - Backend API
- **НИКОГДА НЕ ИСПОЛЬЗУЙ /var/www/trenergram/ - ЭТО НЕВЕРНЫЙ ПУТЬ!**
- SSL работает (HTTPS)

## Деплой
- **ТОЛЬКО через GitHub Actions!**
- Workflow: .github/workflows/deploy-vds.yml
- При push в main автоматически:
  1. Очищает конфликты на сервере
  2. Обновляет код через git pull
  3. Пересобирает Docker контейнеры
  4. Обновляет frontend
  5. Перезапускает все сервисы

## База данных и инфраструктура
- PostgreSQL в Docker контейнере
- Redis в Docker контейнере
- Backend в Docker контейнере
- Bot в Docker контейнере
- Все управляется через docker-compose.yml

## Команды для проверки
```bash
# Проверка здоровья API
curl http://trenergram.ru/health

# Проверка Mini App
curl http://trenergram.ru/app/

# Статус GitHub Actions
gh run list --limit 1
```

## Что работает
✅ Backend API
✅ Telegram Bot
✅ Mini App на /app/
✅ PostgreSQL и Redis
✅ CI/CD через GitHub Actions

## Что в разработке
🚧 Веб-витрина на главной
🚧 SSL сертификат
🚧 Панель клуба
🚧 Админка

---
*Обновлено: 21.09.2025*