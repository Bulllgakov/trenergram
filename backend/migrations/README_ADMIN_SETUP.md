# Настройка админ-панели Trenergram

## 1. Применение миграции для создания super_admin

После деплоя кода необходимо применить SQL миграцию для создания пользователя super_admin.

### Вариант А: Через Docker на сервере

```bash
# Подключиться к серверу
ssh root@81.200.157.102

# Применить миграцию через Docker
cd /opt/trenergram
docker exec -i trenergram-postgres psql -U trenergram -d trenergram < backend/migrations/create_super_admin.sql
```

### Вариант Б: Напрямую через psql

```bash
# На сервере
cd /opt/trenergram
psql postgresql://trenergram:efpj*sF_nCJ.89@localhost/trenergram -f backend/migrations/create_super_admin.sql
```

## 2. Данные для входа в админ-панель

После применения миграции будет создан super_admin со следующими данными:

- **Email**: `admin@trenergram.ru`
- **Пароль**: `changeme`

**⚠️ ВАЖНО**: Сразу после первого входа смените пароль!

## 3. Проверка работоспособности

### Проверка API:

```bash
# Проверка базового endpoint админ API
curl https://trenergram.ru/api/admin/

# Должен вернуть:
{"message":"Trenergram Admin API"}
```

### Проверка входа:

```bash
# Попытка логина
curl -X POST https://trenergram.ru/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@trenergram.ru","password":"changeme"}'

# Должен вернуть:
{
  "access_token": "...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "admin@trenergram.ru",
    "name": "Super Admin",
    "role": "owner",
    "club_id": null,
    "is_active": true,
    "created_at": "..."
  }
}
```

### Открытие админ-панели в браузере:

1. Откройте: https://trenergram.ru/admin
2. Введите email: `admin@trenergram.ru`
3. Введите пароль: `changeme`
4. После успешного входа вы попадете на дашборд

## 4. Смена пароля

После первого входа сразу смените пароль:

```bash
# Получите токен при логине (см. выше)
TOKEN="ваш_токен_здесь"

# Смените пароль
curl -X PUT https://trenergram.ru/api/admin/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "old_password": "changeme",
    "new_password": "ваш_новый_безопасный_пароль"
  }'
```

## 5. Создание администратора клуба

После входа как super_admin, вы можете создавать администраторов для клубов:

```bash
# Сначала создайте клуб (если нужно)
curl -X POST https://trenergram.ru/api/admin/clubs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Название клуба",
    "address": "Адрес",
    "phone": "+7 999 999-99-99",
    "email": "club@example.com",
    "tariff": "standard"
  }'

# Создайте администратора для клуба (club_id из ответа выше)
curl -X POST https://trenergram.ru/api/admin/clubs/1/admins \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "club_admin@example.com",
    "password": "временный_пароль",
    "name": "Администратор Клуба",
    "role": "admin"
  }'
```

## 6. Структура ролей

### Super Admin (role="owner", club_id=null)
- Видит все данные системы
- Может управлять клубами
- Может создавать администраторов клубов
- Доступ ко всем тренерам и клиентам

### Club Admin (role="admin" или "owner", club_id!=null)
- Видит только данные своего клуба
- Может управлять тренерами своего клуба
- Может видеть клиентов, которые занимаются с тренерами клуба
- Не может создавать/редактировать клубы

## 7. Доступные страницы админ-панели

- `/admin/` - редирект на дашборд или логин
- `/admin/login.html` - страница входа
- `/admin/dashboard.html` - главный дашборд со статистикой
- `/admin/trainers.html` - база тренеров
- `/admin/clients.html` - CRM клиентов
- `/admin/clubs.html` - управление клубами (только super_admin)

## 8. Troubleshooting

### Ошибка 502 при попытке открыть админ-панель
- Проверьте, что backend контейнер запущен: `docker ps | grep trenergram-backend`
- Проверьте логи backend: `docker logs trenergram-backend --tail 100`
- Проверьте, что не было ошибок при импорте admin router

### Ошибка "Invalid credentials" при логине
- Убедитесь, что миграция была применена
- Проверьте, что super_admin создан: `docker exec -i trenergram-postgres psql -U trenergram -d trenergram -c "SELECT * FROM club_admins WHERE email='admin@trenergram.ru';"`

### Пустая статистика на дашборде
- Это нормально, если в системе еще нет данных (тренеров, клиентов, тренировок)
- Дождитесь, пока пользователи начнут регистрироваться через Telegram бота

## 9. Безопасность

- ⚠️ Всегда меняйте стандартный пароль `changeme` сразу после первого входа
- ⚠️ Используйте сильные пароли (минимум 12 символов, буквы + цифры + спецсимволы)
- ⚠️ Не передавайте JWT токены в незащищенных каналах
- ⚠️ JWT токены действительны 7 дней - после этого нужно заново войти
- ⚠️ Используйте HTTPS для доступа к админ-панели
