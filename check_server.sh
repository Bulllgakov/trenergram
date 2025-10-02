#!/bin/bash

echo "Checking webapp deployment on server..."

# Check if webapp files exist
echo -e "\n1. Checking /var/www/trenergram/:"
ssh root@81.200.157.102 "ls -la /var/www/trenergram/ | head -20"

echo -e "\n2. Checking trainer app:"
ssh root@81.200.157.102 "ls -la /var/www/trenergram/trainer/ 2>&1 | head -10"

echo -e "\n3. Checking client app:"
ssh root@81.200.157.102 "ls -la /var/www/trenergram/client/ 2>&1 | head -10"

echo -e "\n4. Checking nginx error logs:"
ssh root@81.200.157.102 "tail -20 /var/log/nginx/error.log"

echo -e "\n5. Checking nginx config:"
ssh root@81.200.157.102 "grep -A 10 'location /app' /etc/nginx/sites-available/trenergram"

echo -e "\n6. Checking docker status:"
ssh root@81.200.157.102 "cd /opt/trenergram && docker-compose ps"