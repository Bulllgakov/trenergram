#!/bin/bash

# Deployment script for Trenergram project with Docker
# Uses SSH key authentication: ~/.ssh/trenergram_vds

SERVER="root@81.200.157.102"
SSH_KEY="~/.ssh/trenergram_vds"
PROJECT_PATH="/opt/trenergram"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Trenergram Deployment Script (Docker Version)${NC}"

# Function to deploy frontend
deploy_frontend() {
    echo -e "${YELLOW}📦 Building frontend...${NC}"
    cd frontend
    npm run build

    echo -e "${YELLOW}📤 Uploading frontend to server...${NC}"
    tar -czf dist.tar.gz dist/
    scp -i $SSH_KEY dist.tar.gz $SERVER:/tmp/

    echo -e "${YELLOW}🔧 Installing frontend on server...${NC}"
    ssh -i $SSH_KEY $SERVER "
        cd /tmp && \
        tar -xzf dist.tar.gz && \
        rm -rf /var/www/trenergram/* && \
        cp -r dist/* /var/www/trenergram/ && \
        rm -rf dist dist.tar.gz && \
        nginx -s reload
    "

    rm dist.tar.gz
    cd ..

    echo -e "${GREEN}✅ Frontend deployed successfully!${NC}"
}

# Function to deploy backend
deploy_backend() {
    echo -e "${YELLOW}📤 Deploying backend via Git...${NC}"

    ssh -i $SSH_KEY $SERVER "
        cd $PROJECT_PATH && \
        git pull origin main && \
        docker-compose down && \
        docker-compose build --no-cache backend bot && \
        docker-compose up -d
    "

    echo -e "${GREEN}✅ Backend deployed successfully!${NC}"
}

# Function to deploy both
deploy_all() {
    deploy_frontend
    deploy_backend
}

# Quick frontend deploy (no git)
deploy_quick() {
    echo -e "${YELLOW}⚡ Quick frontend deployment...${NC}"
    cd frontend
    npm run build
    tar -czf dist.tar.gz dist/
    scp -i $SSH_KEY dist.tar.gz $SERVER:/tmp/
    ssh -i $SSH_KEY $SERVER "cd /tmp && tar -xzf dist.tar.gz && cp -r dist/* /var/www/trenergram/ && rm -rf dist dist.tar.gz"
    rm dist.tar.gz
    cd ..
    echo -e "${GREEN}✅ Quick deploy completed!${NC}"
}

# Function to check server status
check_status() {
    echo -e "${YELLOW}🔍 Checking server status...${NC}"
    ssh -i $SSH_KEY $SERVER "
        cd $PROJECT_PATH && \
        echo -e '\n${YELLOW}Docker containers:${NC}' && \
        docker-compose ps && \
        echo -e '\n${YELLOW}Nginx status:${NC}' && \
        systemctl status nginx --no-pager | head -5
    "
}

# Function to view logs
view_logs() {
    echo -e "${YELLOW}📋 Viewing Docker logs...${NC}"
    ssh -i $SSH_KEY $SERVER "
        cd $PROJECT_PATH && \
        echo -e '${YELLOW}Backend logs (last 50 lines):${NC}' && \
        docker-compose logs --tail=50 backend && \
        echo -e '\n${YELLOW}Bot logs (last 50 lines):${NC}' && \
        docker-compose logs --tail=50 bot
    "
}

# Function to restart services
restart_services() {
    echo -e "${YELLOW}🔄 Restarting Docker containers...${NC}"
    ssh -i $SSH_KEY $SERVER "
        cd $PROJECT_PATH && \
        docker-compose restart backend bot
    "
    echo -e "${GREEN}✅ Services restarted!${NC}"
}

# Function to rebuild containers
rebuild_containers() {
    echo -e "${YELLOW}🔨 Rebuilding Docker containers...${NC}"
    ssh -i $SSH_KEY $SERVER "
        cd $PROJECT_PATH && \
        docker-compose down && \
        docker-compose build --no-cache && \
        docker-compose up -d
    "
    echo -e "${GREEN}✅ Containers rebuilt!${NC}"
}

# Function to init database
init_database() {
    echo -e "${YELLOW}🗃️ Initializing database...${NC}"
    ssh -i $SSH_KEY $SERVER "
        cd $PROJECT_PATH && \
        docker-compose exec -T backend python init_db.py
    "
    echo -e "${GREEN}✅ Database initialized!${NC}"
}

# Main script logic
case "$1" in
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
        deploy_quick
        ;;
    status)
        check_status
        ;;
    logs)
        view_logs
        ;;
    restart)
        restart_services
        ;;
    rebuild)
        rebuild_containers
        ;;
    init-db)
        init_database
        ;;
    *)
        echo -e "${RED}Usage: $0 {frontend|backend|all|quick|status|logs|restart|rebuild|init-db}${NC}"
        echo ""
        echo "Commands:"
        echo "  frontend  - Deploy frontend only"
        echo "  backend   - Deploy backend (pulls from git)"
        echo "  all       - Deploy frontend and backend"
        echo "  quick     - Quick frontend deploy (no git)"
        echo "  status    - Check server status"
        echo "  logs      - View Docker logs"
        echo "  restart   - Restart Docker containers"
        echo "  rebuild   - Rebuild and restart all containers"
        echo "  init-db   - Initialize database"
        exit 1
        ;;
esac