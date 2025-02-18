#!/bin/bash
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Load environment variables from run.env in the same directory as the script
if [ -f "$SCRIPT_DIR/.env" ]; then
    source "$SCRIPT_DIR/.env"
else
    echo "Error: .env file not found in script directory ($SCRIPT_DIR)"
    exit 1
fi

# Remove hardcoded values and use environment variables
# ENVIRONMENT and IMAGE_TAG are now from run.env instead of command line arguments
if [ -z "$ENVIRONMENT" ] || [ -z "$IMAGE_TAG" ] || [ -z "$DOCKER_HUB_USERNAME" ] || [ -z "$DOCKER_HUB_PASSWORD", "POSTGRES_USER", "POSTGRES_PASSWORD" ]; then
    echo "Error: Required environment variables not set in .env"
    echo "Required variables: ENVIRONMENT, IMAGE_TAG, DOCKER_HUB_USERNAME, DOCKER_HUB_PASSWORD, POSTGRES_USER, POSTGRES_PASSWORD"
    exit 1
fi

# full image name
if [ "$SKIP_PULL" = "true" ]; then
    IMAGE_NAME="${DOCKER_HUB_REPO}:${IMAGE_TAG}"  # use local image name
else
    IMAGE_NAME="${DOCKER_HUB_USERNAME}/${DOCKER_HUB_REPO}:${IMAGE_TAG}"  # use full docker hub image name
fi


DOCKER_COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"

echo "🚀 Starting deployment process..."

# Login to Docker Hub if credentials are provided and SKIP_PULL is not true
if [ "$SKIP_PULL" != "true" ]; then
    echo "🔑 Logging in to Docker Hub..."
    echo "$DOCKER_HUB_PASSWORD" | docker login -u "$DOCKER_HUB_USERNAME" --password-stdin
fi

# Export all environment variables that docker-compose will use
export IMAGE_NAME="$IMAGE_NAME"
export DOTENV_KEY="$DOTENV_KEY"
export NODE_ENV="$ENVIRONMENT"
export POSTGRES_USER="$POSTGRES_USER"
export POSTGRES_PASSWORD="$POSTGRES_PASSWORD"
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/ideaforge?schema=public"

# Function to check port usage and display what's using it
check_port_usage() {
    local port=$1
    echo "Checking port $port..."
    
    # Check if port is in use by any process
    if lsof -i :"$port" > /dev/null; then
        echo "Port $port is in use by:"
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
        echo "Port $port is available"
    fi
}

# Stop old containers
echo "🛑 Stopping and removing old containers..."
docker-compose -f $DOCKER_COMPOSE_FILE down

# Make sure all containers are really stopped
docker ps -q | xargs -r docker stop

# Check critical ports
echo "🔍 Checking port availability..."
check_port_usage 5432  # PostgreSQL
check_port_usage 6379  # Redis

# Give user a chance to see the output
sleep 2

# Pull latest images
if [ "$SKIP_PULL" != "true" ]; then
    echo "⬇️  Pulling latest images..."
    docker-compose -f $DOCKER_COMPOSE_FILE pull
else
    echo "Skipping Docker pull (SKIP_PULL=true)"
fi


# Start services
echo "▶️  Starting services..."
docker-compose -f $DOCKER_COMPOSE_FILE up -d

# Run migrations first
echo "🔧 Running database migrations..."
docker-compose -f $DOCKER_COMPOSE_FILE run --rm \
  idea-forge \
  sh -c "cd api && pnpm prisma migrate deploy"

# If migrations successful, start the services
if [ $? -eq 0 ]; then
   docker-compose -f $DOCKER_COMPOSE_FILE  up -d
else
    echo "Migration failed, deployment aborted"
    exit 1
fi


# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "🔍 Checking service status..."
docker-compose -f $DOCKER_COMPOSE_FILE ps

# Get all images sorted by creation date (newest first)
docker images "${IMAGE_NAME}" --format "{{.ID}} {{.Tag}} {{.CreatedAt}}" | sort -k3,4 -r |
while read id tag created; do
    # Skip the current image and the most recent previous one
    if [ "$tag" != "$IMAGE_TAG" ] && [ "$(echo "$created" | cut -d' ' -f1-2)" != "$(docker images "${IMAGE_NAME}:$IMAGE_TAG" --format "{{.CreatedAt}}" | cut -d' ' -f1-2)" ]; then
        # Skip the second most recent image
        if [ "$(docker images "${IMAGE_NAME}" --format "{{.Tag}}" | grep -v "$IMAGE_TAG" | head -n 1)" != "$tag" ]; then
            echo "Removing old image with tag: $tag"
            docker rmi $id || true
        fi
    fi
done

# Exit successfully
exit 0
