#!/bin/bash
# Script to install SSL certificate for trenergram.ru using Let's Encrypt

echo "Installing SSL certificate for trenergram.ru..."

# Update package list
sudo apt update

# Install certbot and nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Stop nginx temporarily to avoid conflicts
sudo systemctl stop nginx

# Obtain certificate for domain
sudo certbot certonly --standalone \
  -d trenergram.ru \
  -d www.trenergram.ru \
  --non-interactive \
  --agree-tos \
  --email admin@trenergram.ru \
  --redirect \
  --expand

# Start nginx
sudo systemctl start nginx

# Configure nginx for SSL
echo "Configuring nginx for SSL..."

# Update nginx configuration
cat > /tmp/trenergram-ssl.conf << 'EOF'
server {
    listen 80;
    server_name trenergram.ru www.trenergram.ru;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name trenergram.ru www.trenergram.ru;

    ssl_certificate /etc/letsencrypt/live/trenergram.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/trenergram.ru/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Temporary root page
    location = / {
        default_type text/html;
        return 200 '<html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5"><div style="text-align:center"><h1>Trenergram</h1><p>Платформа для записи на тренировки</p><p style="color:#666;margin-top:20px">Скоро здесь будет веб-витрина</p><p style="margin-top:30px"><a href="/app/" style="color:#0088cc">Mini App (тестовая версия)</a></p></div></body></html>';
    }

    # Mini App
    location /app/ {
        alias /var/www/trenergram/;
        try_files $uri $uri/ /app/index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Future paths
    location /club-admin {
        default_type text/html;
        return 200 '<html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><h2>Панель администратора клуба (в разработке)</h2></body></html>';
    }

    location /admin {
        default_type text/html;
        return 200 '<html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><h2>Админка (в разработке)</h2></body></html>';
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
EOF

# Copy configuration
sudo cp /tmp/trenergram-ssl.conf /etc/nginx/sites-available/trenergram

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Setup auto-renewal
echo "Setting up auto-renewal..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal
sudo certbot renew --dry-run

echo "✅ SSL certificate installed successfully!"
echo "📌 Certificate will auto-renew before expiration"
echo "🔐 Your site is now available at https://trenergram.ru"