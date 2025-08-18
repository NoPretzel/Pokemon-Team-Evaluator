#!/bin/bash

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

step() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] [$1/$TOTAL_STEPS]${NC} $2"
}

TOTAL_STEPS=7

# Navigate to script directory
cd "$(dirname "$0")/.."

step 1 "Starting deployment..."

# Pull latest code
step 2 "Pulling latest code from main branch..."
git checkout main || error "Failed to checkout main branch"
git pull origin main || error "Failed to pull latest code"

# Clean up Docker to save space
step 3 "Cleaning up Docker resources..."

docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

docker system prune -af --volumes || true
docker image prune -af || true
docker builder prune -af || true

# Clean up build cache
docker buildx prune -af 2>/dev/null || true

# Show disk space after cleanup
df -h /

# Stop existing services
step 4 "Stopping existing services..."
docker-compose -f infra/Docker/docker-compose.prod.yml down || true

# Clean up networks
log "Cleaning up Docker networks..."
docker network rm pokemon-team-evaluator_web pokemon-team-evaluator_internal 2>/dev/null || true

# Build and start services
step 5 "Building and starting services..."
log "This may take several minutes on first run..."
docker-compose -f infra/Docker/docker-compose.prod.yml build --no-cache
docker-compose -f infra/Docker/docker-compose.prod.yml up -d

# Wait for services to be ready
step 6 "Waiting for services to be ready..."

# Wait for Redis to be healthy
until docker-compose -f infra/Docker/docker-compose.prod.yml exec -T redis redis-cli ping > /dev/null 2>&1; do
    log "Waiting for Redis..."
    sleep 2
done

# Wait for app to be ready
until docker-compose -f infra/Docker/docker-compose.prod.yml exec -T app wget --spider -q http://localhost:3000 > /dev/null 2>&1; do
    log "Waiting for app..."
    sleep 2
done

log "All services are ready!"

# Update Pokemon stats
step 7 "Updating Pokemon usage stats..."
# Install tsconfig-paths locally if not already installed
docker-compose -f infra/Docker/docker-compose.prod.yml exec -T app sh -c "[ -d node_modules/tsconfig-paths ] || npm install tsconfig-paths" || true
# Run the stats update
docker-compose -f infra/Docker/docker-compose.prod.yml exec -T app npm run update-stats || log "Stats update failed, continuing..."

# Show status
echo ""
step $TOTAL_STEPS "Deployment complete! Service status:"
docker-compose -f infra/Docker/docker-compose.prod.yml ps