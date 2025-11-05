#!/bin/bash
set -e

# =============================================================================
# Idea Forge Unified Deployment Script
# =============================================================================
# This script handles both production and local development deployments:
#
# For Production (remote servers):
#   - Pulls image from Docker Hub: chenxiaoyao6228/idea-forge:latest
#   - Uses .env configuration file
#   - Automatically runs migrations
#
# For Local Development (testing builds):
#   - Uses locally built Docker image
#   - Set SKIP_PULL=true in .env
#   - Set IMAGE_NAME=idea-forge:latest
#
# Usage:
#   ./deploy.sh              # Deploy using .env configuration
#
# Configuration:
#   - Create .env from env.secrets.example
#   - For production: Set IMAGE_NAME to chenxiaoyao6228/idea-forge:latest
#   - For local: Set SKIP_PULL=true, IMAGE_NAME=idea-forge:latest
# =============================================================================

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Load environment variables from .env in the same directory as the script
if [ -f "$SCRIPT_DIR/.env" ]; then
    source "$SCRIPT_DIR/.env"
else
    echo "❌ Error: .env file not found in script directory ($SCRIPT_DIR)"
    echo ""
    echo "Setup instructions:"
    echo "  1. Copy the example: cp env.secrets.example .env"
    echo "  2. Edit with your configuration: nano .env"
    echo "  3. For production: Set IMAGE_NAME=chenxiaoyao6228/idea-forge:latest"
    echo "  4. For local testing: Set SKIP_PULL=true, IMAGE_NAME=idea-forge:latest"
    echo "  5. Run deploy again: ./deploy.sh"
    exit 1
fi

# Validate required environment variables
if [ -z "$IMAGE_NAME" ]; then
    echo "❌ Error: IMAGE_NAME not set in .env"
    echo "For production: IMAGE_NAME=chenxiaoyao6228/idea-forge:latest"
    echo "For local: IMAGE_NAME=idea-forge:latest"
    exit 1
fi

if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ]; then
    echo "❌ Error: POSTGRES_USER or POSTGRES_PASSWORD not set in .env"
    exit 1
fi

DOCKER_COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"

# Set compose project name based on environment to isolate resources
COMPOSE_PROJECT_NAME="ideaforge-${NODE_ENV:-production}"
export COMPOSE_PROJECT_NAME

echo "🚀 Starting deployment process..."
echo "Using image: $IMAGE_NAME"
echo "Environment: ${NODE_ENV:-production}"
echo "Project: $COMPOSE_PROJECT_NAME"
echo ""

# Login to Docker Hub if credentials are provided and SKIP_PULL is not true
if [ "$SKIP_PULL" != "true" ]; then
    if [ -n "$DOCKER_HUB_USERNAME" ] && [ -n "$DOCKER_HUB_PASSWORD" ]; then
        echo "🔑 Logging in to Docker Hub..."
        echo "$DOCKER_HUB_PASSWORD" | docker login -u "$DOCKER_HUB_USERNAME" --password-stdin
    fi
fi

# Export all environment variables that docker-compose will use
export IMAGE_NAME="$IMAGE_NAME"
export NODE_ENV="${NODE_ENV:-production}"
export POSTGRES_USER="$POSTGRES_USER"
export POSTGRES_PASSWORD="$POSTGRES_PASSWORD"
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/ideaforge?schema=public"

# Export all other environment variables from .env file to docker-compose
# This allows runtime configuration to override .env.example in the container
set -a  # automatically export all variables
source "$SCRIPT_DIR/.env"
set +a  # stop automatically exporting

# Function to check port usage and display what's using it
check_port_usage() {
    local port=$1
    echo "Checking port $port..."

    # Check if port is in use by any process
    if lsof -i :"$port" > /dev/null 2>&1; then
        echo "⚠️  Port $port is in use by:"
        lsof -i :"$port"

        read -p "Do you want to try stopping the service using this port? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # For Linux systems
            if command -v systemctl >/dev/null 2>&1; then
                if [ "$port" = "5432" ]; then
                    sudo systemctl stop postgresql
                elif [ "$port" = "6379" ]; then
                    sudo systemctl stop redis-server
                fi
            # For macOS systems
            elif command -v brew >/dev/null 2>&1; then
                if [ "$port" = "5432" ]; then
                    brew services stop postgresql
                elif [ "$port" = "6379" ]; then
                    brew services stop redis
                fi
            fi
        fi
    else
        echo "✓ Port $port is available"
    fi
}

# Stop old containers
echo "🛑 Stopping and removing old containers..."
docker-compose -f $DOCKER_COMPOSE_FILE down

# Check critical ports (only for local deployments)
if [ "$SKIP_PULL" = "true" ]; then
    echo "🔍 Checking port availability..."
    check_port_usage 5432  # PostgreSQL
    check_port_usage 6379  # Redis
    echo ""
fi

# Pull latest images
if [ "$SKIP_PULL" != "true" ]; then
    echo "⬇️  Pulling latest images from Docker Hub..."
    docker-compose -f $DOCKER_COMPOSE_FILE pull
else
    echo "⏭️  Skipping Docker pull (using local image: $IMAGE_NAME)"
fi

echo ""

# Start services (PostgreSQL, Redis)
echo "▶️  Starting database services..."
docker-compose -f $DOCKER_COMPOSE_FILE up -d postgres redis

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker-compose -f $DOCKER_COMPOSE_FILE exec -T postgres pg_isready -U "$POSTGRES_USER" > /dev/null 2>&1; then
        echo "✓ PostgreSQL is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL failed to start"
        docker-compose -f $DOCKER_COMPOSE_FILE logs postgres
        exit 1
    fi
    sleep 1
done

# Run migrations
echo "🔧 Running database migrations..."
docker-compose -f $DOCKER_COMPOSE_FILE run --rm \
  idea-forge \
  sh -c "cd /app/apps/api && npm run prisma:migrate:deploy"

# Check if migrations were successful
if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully"
else
    echo "❌ Migration failed, deployment aborted"
    docker-compose -f $DOCKER_COMPOSE_FILE logs idea-forge
    exit 1
fi

echo ""

# Start application services
echo "▶️  Starting application services..."
docker-compose -f $DOCKER_COMPOSE_FILE up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 5

# Check service status
echo "🔍 Checking service status..."
docker-compose -f $DOCKER_COMPOSE_FILE ps

echo ""

# Show recent logs
echo "📋 Recent application logs:"
docker-compose -f $DOCKER_COMPOSE_FILE logs --tail=30 idea-forge

# Cleanup old images (only for local deployments)
if [ "$SKIP_PULL" = "true" ]; then
    echo ""
    echo "🧹 Cleaning up old Docker images..."
    # Remove dangling images
    docker image prune -f > /dev/null 2>&1 || true
fi

# Record deployment info
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$TIMESTAMP] Deployed with image: $IMAGE_NAME (NODE_ENV: ${NODE_ENV:-production})" >> "$SCRIPT_DIR/deploy.log"

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Useful commands:"
echo "  View logs:         docker-compose -f $DOCKER_COMPOSE_FILE logs -f idea-forge"
echo "  Stop services:     docker-compose -f $DOCKER_COMPOSE_FILE down"
echo "  Restart services:  docker-compose -f $DOCKER_COMPOSE_FILE restart"
echo "  Service status:    docker-compose -f $DOCKER_COMPOSE_FILE ps"
echo ""
echo "🌐 Access the application:"
echo "  Application: http://localhost:5000"
echo "  Health check: http://localhost:5000/health"
echo "  API: http://localhost:5000/api"
echo ""

exit 0
