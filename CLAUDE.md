# Памятка для Claude о проекте Trenergram

## ⚠️ КРИТИЧЕСКИ ВАЖНО: ДЕПЛОЙ
**ДЕПЛОЙ ТОЛЬКО ЧЕРЕЗ GITHUB ACTIONS!**
- При `git push origin main` автоматически запускается деплой
- НЕ использовать ручной деплой через SSH
- НЕ использовать прямые команды на сервере
- Инфраструктура: Docker Compose в `/opt/trenergram/`
- Если нужно что-то исправить на сервере - делай через коммит и push

## Структура URL (ВАЖНО!)

### Публичный сайт
- **trenergram.ru/** - Главная веб-витрина
- **trenergram.ru/clubs** - Лендинг для клубов (SEO/реклама)
- **trenergram.ru/trainers** - Лендинг для тренеров (SEO/реклама)

### Mini Apps (только через Telegram)
- **trenergram.ru/trainer/:id** - Mini App тренера
- **trenergram.ru/client/:id** - Mini App клиента

### API и админки
- **trenergram.ru/api/** - Backend API
- **trenergram.ru/club-admin/** - Панель клуба (в разработке)
- **trenergram.ru/admin/** - Супер-админка (в разработке)

## Структура файлов

### Публичный сайт (`public/`)
- **Назначение:** Статические HTML/CSS/JS страницы для публичного сайта
- **Локально:** `/Users/bulat/trenergram/public/`
- **На сервере:** `/var/www/trenergram/public/`
- **Страницы:**
  - `index.html` - главная страница
  - `clubs.html` - лендинг для клубов
  - `trainers.html` - лендинг для тренеров
  - `css/`, `js/`, `img/` - ресурсы

### Mini Apps (`webapp/`)
- **Назначение:** Telegram Mini Apps (доступны только через бота)
- **Локально:** `/Users/bulat/trenergram/webapp/`
- **На сервере:** `/var/www/trenergram/webapp/`
- **Структура:**
  - `webapp/trainer/` - Mini App тренера (HTML/JS)
  - `webapp/client/` - Mini App клиента (HTML/JS)
- **URL:** `trenergram.ru/trainer/:id` и `trenergram.ru/client/:id`
- **Доступ:** только через Telegram бота

## Сервер
- IP: 81.200.157.102
- Домен: trenergram.ru
- SSH: root@81.200.157.102 (НЕ ИСПОЛЬЗОВАТЬ для деплоя!)
- Проект: /opt/trenergram (Git репозиторий)
- **ВАЖНО: Структура директорий на сервере:**
  - `/var/www/trenergram/public/` - Публичный сайт (nginx)
  - `/var/www/trenergram/webapp/` - Mini Apps (nginx)
  - `/opt/trenergram/` - Git репозиторий с исходниками
  - `/opt/trenergram/backend/` - Backend API (Docker)
- **ВАЖНО: Структура папок локально и на сервере одинаковая!**
- SSL работает (HTTPS)

## Деплой
- **ТОЛЬКО через GitHub Actions!**
- Workflow: .github/workflows/deploy-vds.yml (ЕДИНСТВЕННЫЙ рабочий workflow)
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

## Уведомления
- **Инструкции по уведомлениям:** см. раздел 10.6 в `docs/trenergram-tz-v2.md`
- **Файл реализации:** `backend/services/notifications.py`
- **Логика:** упрощенная система с четким разделением сценариев тренер/клиент
- **Принцип:** тренер НЕ получает уведомления при создании тренировки самим собой
- **Первое напоминание** = первое уведомление клиенту

## Часовые пояса (Timezones)
- **Концепция:** Тренер имеет timezone, клиент НЕ имеет (использует timezone тренера)
- **Реализация:** см. раздел после 10.6 в `docs/trenergram-tz-v2.md`
- **Важно:**
  - Дата и время тренировок используют **timezone тренера**
  - Клиент **жестко** использует timezone тренера (не свой местный)
  - API возвращает `trainer_timezone` во всех booking responses
  - Напоминания отправляются в timezone тренера (`reminder_1_time = "20:00"` означает 20:00 по времени тренера)
- **Файлы:**
  - `backend/models/user.py` - поле `timezone` (default: "Europe/Moscow")
  - `backend/tasks/reminders.py` - учет timezone при отправке напоминаний
  - `backend/migrations/add_trainer_timezone.sql` - миграция БД
- **Статус:** Backend ✅ реализован, Frontend 🚧 в разработке

## Команды для проверки
```bash
# Проверка здоровья API
curl http://trenergram.ru/health

# Проверка Mini App
curl http://trenergram.ru/trainer/

# Статус GitHub Actions
gh run list --limit 1
```

## Что работает
✅ Backend API
✅ Telegram Bot
✅ Mini App на /trainer/:id и /client/:id
✅ PostgreSQL и Redis
✅ CI/CD через GitHub Actions
✅ Публичный сайт (trenergram.ru, /clubs, /trainers)

## Что в разработке
🚧 SSL сертификат
🚧 Панель клуба
🚧 Админка

---
*Обновлено: 09.10.2025*