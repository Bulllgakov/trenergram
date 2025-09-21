#!/bin/bash

# Deployment script for Trenergram project
# Uses SSH key authentication: ~/.ssh/trenergram_vds

SERVER="root@trenergram.ru"
SSH_KEY="~/.ssh/trenergram_vds"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting deployment to trenergram.ru${NC}"

# Function to deploy frontend
deploy_frontend() {
    echo -e "${YELLOW}📦 Building frontend...${NC}"
    cd frontend
    npm run build

    echo -e "${YELLOW}📤 Uploading frontend to server...${NC}"
    tar -czf frontend-build.tar.gz dist/
    scp -i $SSH_KEY frontend-build.tar.gz $SERVER:/tmp/

    echo -e "${YELLOW}🔧 Installing frontend on server...${NC}"
    ssh -i $SSH_KEY $SERVER "
        cd /tmp && \
        tar -xzf frontend-build.tar.gz && \
        cp -r dist/* /var/www/trenergram/ && \
        rm -rf /tmp/dist /tmp/frontend-build.tar.gz && \
        systemctl restart nginx
    "

    rm frontend-build.tar.gz
    cd ..

    echo -e "${GREEN}✅ Frontend deployed successfully!${NC}"
}

# Function to deploy backend
deploy_backend() {
    echo -e "${YELLOW}📤 Uploading backend to server...${NC}"

    # Create archive excluding unnecessary files
    tar -czf backend-build.tar.gz \
        --exclude='*.pyc' \
        --exclude='__pycache__' \
        --exclude='.env' \
        --exclude='venv' \
        --exclude='.pytest_cache' \
        backend/

    scp -i $SSH_KEY backend-build.tar.gz $SERVER:/tmp/

    echo -e "${YELLOW}🔧 Installing backend on server...${NC}"
    ssh -i $SSH_KEY $SERVER "
        cd /home/trenergram && \
        tar -xzf /tmp/backend-build.tar.gz && \
        cd trenergram/backend && \
        source venv/bin/activate && \
        pip install -r requirements.txt && \
        systemctl restart trenergram-backend trenergram-bot && \
        rm /tmp/backend-build.tar.gz
    "

    rm backend-build.tar.gz

    echo -e "${GREEN}✅ Backend deployed successfully!${NC}"
}

# Function to deploy both
deploy_all() {
    deploy_frontend
    deploy_backend
}

# Function to check server status
check_status() {
    echo -e "${YELLOW}🔍 Checking server status...${NC}"
    ssh -i $SSH_KEY $SERVER "
        echo -e '${YELLOW}Nginx status:${NC}' && \
        systemctl status nginx --no-pager | head -5 && \
        echo -e '\n${YELLOW}Backend status:${NC}' && \
        systemctl status trenergram-backend --no-pager | head -5 && \
        echo -e '\n${YELLOW}Bot status:${NC}' && \
        systemctl status trenergram-bot --no-pager | head -5
    "
}

# Function to view logs
view_logs() {
    echo -e "${YELLOW}📋 Recent logs:${NC}"
    ssh -i $SSH_KEY $SERVER "
        echo -e '${YELLOW}Backend logs:${NC}' && \
        journalctl -u trenergram-backend -n 20 --no-pager && \
        echo -e '\n${YELLOW}Bot logs:${NC}' && \
        journalctl -u trenergram-bot -n 20 --no-pager && \
        echo -e '\n${YELLOW}Nginx error logs:${NC}' && \
        tail -20 /var/log/nginx/error.log
    "
}

# Quick deploy (frontend only)
quick_deploy() {
    echo -e "${YELLOW}⚡ Quick deploy (frontend only)${NC}"
    cd frontend
    npm run build
    tar -czf dist.tar.gz dist/
    scp -i $SSH_KEY dist.tar.gz $SERVER:/tmp/
    ssh -i $SSH_KEY $SERVER "cd /tmp && tar -xzf dist.tar.gz && cp -r dist/* /var/www/trenergram/ && rm -rf dist dist.tar.gz && systemctl reload nginx"
    rm dist.tar.gz
    cd ..
    echo -e "${GREEN}✅ Quick deploy completed!${NC}"
}

# Main menu
if [ $# -eq 0 ]; then
    echo "Usage: ./deploy.sh [option]"
    echo "Options:"
    echo "  frontend    - Deploy frontend only"
    echo "  backend     - Deploy backend only"
    echo "  all         - Deploy both frontend and backend"
    echo "  quick       - Quick frontend deploy (no git pull)"
    echo "  status      - Check server status"
    echo "  logs        - View recent logs"
    exit 1
fi

case $1 in
    frontend)
        deploy_frontend
        ;;
    backend)
        deploy_backend
        ;;
    all)
        deploy_all
        ;;
    quick)
        quick_deploy
        ;;
    status)
        check_status
        ;;
    logs)
        view_logs
        ;;
    *)
        echo -e "${RED}Invalid option: $1${NC}"
        echo "Use: frontend, backend, all, quick, status, or logs"
        exit 1
        ;;
esac