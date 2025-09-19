#!/bin/bash
# Cloud-init скрипт для TimeWeb VDS - Trenergram Setup

set -e

echo "========================================="
echo "Starting Trenergram Server Setup..."
echo "========================================="

# Обновление системы
apt-get update
apt-get upgrade -y

# Установка базовых пакетов
apt-get install -y \
    curl \
    wget \
    git \
    ufw \
    nginx \
    python3-pip \
    python3-venv \
    postgresql \
    postgresql-contrib \
    redis-server \
    supervisor \
    htop \
    nano

# Настройка firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
echo "y" | ufw enable

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Установка Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Создание пользователя deploy
useradd -m -s /bin/bash deploy || true
usermod -aG sudo,docker deploy
echo "deploy ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Настройка PostgreSQL
systemctl start postgresql
sudo -u postgres psql << EOF
CREATE DATABASE trenergram;
CREATE USER trenergram WITH PASSWORD 'TrenerGram2024Strong';
GRANT ALL PRIVILEGES ON DATABASE trenergram TO trenergram;
ALTER DATABASE trenergram OWNER TO trenergram;
EOF

# Настройка Redis
systemctl enable redis-server
systemctl start redis-server

# Клонирование проекта
mkdir -p /opt/trenergram
cd /opt
git clone https://github.com/Bulllgakov/trenergram.git trenergram || true
chown -R deploy:deploy /opt/trenergram

# Создание .env файла
cat > /opt/trenergram/.env << 'EOF'
# Telegram Bot
BOT_TOKEN=8229544461:AAFr-MA466IKP_egh448meK6LLKWEZagofI
BOT_USERNAME=trenergram_bot

# Database
DATABASE_URL=postgresql+asyncpg://trenergram:TrenerGram2024Strong@localhost:5432/trenergram

# Redis
REDIS_URL=redis://localhost:6379/0

# Security - будет сгенерирован автоматически
SECRET_KEY=WILL_BE_GENERATED
ALGORITHM=HS256

# Environment
ENVIRONMENT=production
DEBUG=False

# Domain
DOMAIN=trenergram.ru
WEBAPP_URL=https://trenergram.ru
EOF

# Генерация SECRET_KEY
SECRET_KEY=$(openssl rand -hex 32)
sed -i "s/WILL_BE_GENERATED/$SECRET_KEY/" /opt/trenergram/.env

# Настройка Nginx
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    server_name _;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /health {
        proxy_pass http://localhost:8000/health;
        access_log off;
    }
}
EOF

systemctl reload nginx

# Сборка и запуск Docker контейнеров
cd /opt/trenergram
sudo -u deploy docker-compose build || true
sudo -u deploy docker-compose up -d || true

# Создание скрипта для деплоя
cat > /home/deploy/deploy.sh << 'EOF'
#!/bin/bash
cd /opt/trenergram
git pull origin main
docker-compose build
docker-compose down
docker-compose up -d
echo "Deploy completed at $(date)"
EOF

chmod +x /home/deploy/deploy.sh
chown deploy:deploy /home/deploy/deploy.sh

# Вывод информации
SERVER_IP=$(curl -s ifconfig.me)

echo "========================================="
echo "Trenergram Setup Completed!"
echo "========================================="
echo "Server IP: $SERVER_IP"
echo ""
echo "Check application:"
echo "http://$SERVER_IP/health"
echo ""
echo "SSH access:"
echo "ssh root@$SERVER_IP"
echo ""
echo "View logs:"
echo "docker logs trenergram_web"
echo "docker logs trenergram_bot"
echo "========================================="