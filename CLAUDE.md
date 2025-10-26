# Памятка для Claude о проекте Trenergram

## ⚠️ КРИТИЧЕСКИ ВАЖНО: ДЕПЛОЙ
**ДЕПЛОЙ ТОЛЬКО ЧЕРЕЗ GITHUB ACTIONS!**
- При `git push origin main` автоматически запускается деплой
- НЕ использовать ручной деплой через SSH
- НЕ использовать прямые команды на сервере
- Инфраструктура: Docker Compose в `/opt/trenergram/`
- Если нужно что-то исправить на сервере - делай через коммит и push

## Структура URL (ВАЖНО!)

### Публичный сайт (обычный браузер)
- **trenergram.ru/** - Главная веб-витрина
- **trenergram.ru/trainers** - Лендинг для тренеров (временно, станет каталогом)
- **trenergram.ru/clubs** - Лендинг для клубов (временно, станет каталогом)
- **trenergram.ru/admin/** - Единая панель администрирования (в разработке)
  - Разграничение прав по ролям: super_admin, club_admin, club_owner
  - Супер-админы видят все клубы, администраторы - только свой

### Mini Apps (только через Telegram бота)
- **trenergram.ru/trainer/:id** - Mini App тренера
- **trenergram.ru/client/:id** - Mini App клиента

### API
- **trenergram.ru/api/** - Backend API

## Структура файлов (ВАЖНО!)

### 🌐 Публичный сайт + Админка (`public/`)
- **Назначение:** Обычные веб-страницы, доступные через браузер
- **Локально:** `/Users/bulat/trenergram/public/`
- **На сервере:** `/var/www/trenergram/public/`
- **Авторизация:** JWT (email/password) для админки
- **Содержимое:**
  - `index.html` - главная страница
  - `trainers.html` - лендинг для тренеров (временно)
  - `clubs.html` - лендинг для клубов (временно)
  - `admin/` - единая панель администрирования (будет создана)
    - `admin/index.html` - главная админки
    - `admin/login.html` - вход (email/password)
    - `admin/dashboard.html` - дашборд
    - `admin/clubs.html` - управление клубами (super_admin)
    - `admin/trainers.html` - управление тренерами
    - `admin/clients.html` - CRM клиенты
    - `admin/js/`, `admin/css/` - ресурсы
  - `css/`, `js/`, `img/` - общие ресурсы

### 📱 Telegram Mini Apps (`webapp/`)
- **Назначение:** ТОЛЬКО Telegram Mini Apps (доступны ТОЛЬКО через бота)
- **Локально:** `/Users/bulat/trenergram/webapp/`
- **На сервере:** `/var/www/trenergram/webapp/`
- **Авторизация:** Telegram WebApp initData
- **Содержимое:**
  - `webapp/trainer/` - Mini App тренера (HTML/JS/CSS)
  - `webapp/client/` - Mini App клиента (HTML/JS/CSS)
- **URL:** `trenergram.ru/trainer/:id` и `trenergram.ru/client/:id`
- **Доступ:** только через Telegram бота, НЕ напрямую через браузер

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
🚧 Единая админка в `public/admin/` (с разграничением прав)
🚧 API для клубов
🚧 Каталоги тренеров и клубов (заменят лендинги)

---
*Обновлено: 25.10.2025*