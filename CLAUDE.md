# Памятка для Claude о проекте Trenergram

## Структура URL (ВАЖНО!)
- **trenergram.ru/** - Веб-витрина (в разработке)
- **trenergram.ru/app/** - Mini App (только через Telegram)
  - `/app/trainer/:id` - для тренеров
  - `/app/client/:id` - для клиентов
- **trenergram.ru/api/** - Backend API
- **trenergram.ru/club-admin/** - Панель клуба (в разработке)
- **trenergram.ru/admin/** - Супер-админка (в разработке)

## Mini App
- Один Mini App для тренеров и клиентов
- Разные интерфейсы в зависимости от роли
- Base path: `/app/` (настроено в vite.config.js)
- Доступ только через Telegram бота

## Сервер
- IP: 81.200.157.102
- Домен: trenergram.ru
- SSH: root@81.200.157.102
- Проект: /opt/trenergram
- Frontend: /var/www/trenergram/
- SSL пока не настроен (используй http для проверки)

## Деплой
- Автоматический через GitHub Actions
- Workflow: .github/workflows/deploy-vds.yml
- При push в main автоматически деплоится

## База данных
- PostgreSQL в Docker
- Проблема с asyncpg драйвером (работает, но показывает warning)

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
*Обновлено: 20.09.2025*