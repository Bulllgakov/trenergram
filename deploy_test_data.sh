#!/bin/bash

# Deploy test data to server
echo "📦 Deploying test data script to server..."

# Copy test script
scp backend/test_miniapp.py root@81.200.157.102:/opt/trenergram/backend/

# Run test script on server
ssh root@81.200.157.102 << 'EOF'
  cd /opt/trenergram/backend
  docker-compose exec -T backend python test_miniapp.py
EOF

echo "✅ Test data deployed!"