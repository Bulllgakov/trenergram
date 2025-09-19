# Настройка VDS TimeWeb для Trenergram

## 1. Первоначальная настройка сервера

```bash
# Подключение к серверу
ssh root@YOUR_SERVER_IP

# Обновление системы
apt update && apt upgrade -y

# Установка базовых пакетов
apt install -y curl wget git nano ufw
```

## 2. Установка Docker

```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установка Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Проверка
docker --version
docker-compose --version
```

## 3. Настройка PostgreSQL и Redis

```bash
# Создание docker-compose.yml для БД
mkdir -p /opt/trenergram
cd /opt/trenergram

cat > docker-compose.db.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: trenergram_postgres
    environment:
      POSTGRES_DB: trenergram
      POSTGRES_USER: trenergram
      POSTGRES_PASSWORD: CHANGE_ME_STRONG_PASSWORD
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: trenergram_redis
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  postgres_data:
EOF

# Запуск БД
docker-compose -f docker-compose.db.yml up -d
```

## 4. Клонирование проекта

```bash
# Создание директории для проекта
cd /opt
git clone https://github.com/Bulllgakov/trenergram.git
cd trenergram

# Создание .env файла
cp .env.example .env
nano .env  # Отредактируйте переменные
```

## 5. Создание docker-compose.yml для приложения

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  web:
    build: .
    container_name: trenergram_web
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://trenergram:CHANGE_ME@postgres:5432/trenergram
      - REDIS_URL=redis://redis:6379/0
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  bot:
    build: .
    container_name: trenergram_bot
    command: python -m app.bot.main
    environment:
      - DATABASE_URL=postgresql+asyncpg://trenergram:CHANGE_ME@postgres:5432/trenergram
      - REDIS_URL=redis://redis:6379/0
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    external: true
    name: trenergram_postgres

  redis:
    external: true
    name: trenergram_redis
EOF
```

## 6. Настройка Nginx

```bash
# Установка Nginx
apt install -y nginx certbot python3-certbot-nginx

# Создание конфигурации
cat > /etc/nginx/sites-available/trenergram << 'EOF'
server {
    listen 80;
    server_name trenergram.ru www.trenergram.ru YOUR_SERVER_IP;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Активация сайта
ln -s /etc/nginx/sites-available/trenergram /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## 7. Настройка SSL (после подключения домена)

```bash
certbot --nginx -d trenergram.ru -d www.trenergram.ru
```

## 8. Настройка GitHub Actions деплоя

### Создание пользователя для деплоя
```bash
# Создание пользователя
adduser deploy
usermod -aG docker deploy

# Настройка SSH ключа
su - deploy
ssh-keygen -t ed25519 -C "github-actions"
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/id_ed25519  # Скопируйте приватный ключ для GitHub Secrets
```

### Настройка sudo без пароля для деплоя
```bash
echo "deploy ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/local/bin/docker-compose, /bin/systemctl" >> /etc/sudoers
```

## 9. Скрипт автоматического деплоя

```bash
# Создание скрипта деплоя
cat > /home/deploy/deploy.sh << 'EOF'
#!/bin/bash
cd /opt/trenergram
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
echo "Deployment completed at $(date)"
EOF

chmod +x /home/deploy/deploy.sh
```

## 10. Настройка firewall

```bash
# Настройка UFW
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 8000
ufw --force enable
```

## 11. GitHub Secrets для Actions

Добавьте в GitHub Secrets:
- `TIMEWEB_SSH_HOST`: IP вашего сервера
- `TIMEWEB_SSH_USER`: deploy
- `TIMEWEB_SSH_KEY`: приватный ключ из п.8
- `TIMEWEB_APP_PATH`: /opt/trenergram

## 12. Мониторинг и логи

```bash
# Просмотр логов
docker-compose logs -f web
docker-compose logs -f bot

# Статус контейнеров
docker ps

# Мониторинг ресурсов
docker stats
```

## Полезные команды

```bash
# Перезапуск приложения
docker-compose restart

# Обновление приложения
git pull && docker-compose up -d --build

# Backup БД
docker exec trenergram_postgres pg_dump -U trenergram trenergram > backup.sql

# Восстановление БД
docker exec -i trenergram_postgres psql -U trenergram trenergram < backup.sql
```