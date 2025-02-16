#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Load environment variables from run.env
if [ -f "${ROOT_DIR}/scripts/deploy/run.env" ]; then
    source "${ROOT_DIR}/scripts/deploy/run.env"
else
    echo "Error: run.env file not found in scripts/deploy directory"
    exit 1
fi

# Remove hardcoded values and use environment variables
# ENVIRONMENT and IMAGE_TAG are now from run.env instead of command line arguments
if [ -z "$ENVIRONMENT" ] || [ -z "$IMAGE_TAG" ] || [ -z "$DOCKER_HUB_USERNAME" ] || [ -z "$DOCKER_HUB_PASSWORD" ]; then
    echo "Error: Required environment variables not set in run.env"
    echo "Required variables: ENVIRONMENT, IMAGE_TAG, DOCKER_HUB_USERNAME, DOCKER_HUB_PASSWORD"
    exit 1
fi

# full image name
if [ "$SKIP_PULL" = "true" ]; then
    IMAGE_NAME="${DOCKER_HUB_REPO}:${IMAGE_TAG}"  # 使用本地镜像名称，格式与 builder 中的 DOCKER_HUB_REPO 对应
else
    IMAGE_NAME="${DOCKER_HUB_USERNAME}/${DOCKER_HUB_REPO}:${IMAGE_TAG}"  # 使用完整的 Docker Hub 镜像名称
fi

# Export image name for docker-compose
echo "IMAGE_NAME=$IMAGE_NAME" >> "${ROOT_DIR}/scripts/deploy/run.env"

# Define environment variables for different environments
DOTENV_KEY_PRODUCTION="dotenv://:key_0c438695fc0b67f67a0e445c7978d621cb088fe107970ea7cfb46e0349f8dc32@dotenv.org/vault/.env.vault?environment=production"
# DOTENV_KEY_STAGING="your_staging_key_here"
DOTENV_KEY_TEST="dotenv://:key_eeeafd6e3e18edfcd6ea2b3ae52a08b676ab69772f3b9af5f0178e46da62a751@dotenv.org/vault/.env.vault?environment=ci"

# Set DOTENV_KEY based on environment
case $ENVIRONMENT in
    "PRODUCTION")
        DOTENV_KEY=$DOTENV_KEY_PRODUCTION
        ;;
    "STAGING") 
        DOTENV_KEY=$DOTENV_KEY_STAGING
        ;;
    "TEST")
        DOTENV_KEY=$DOTENV_KEY_TEST
        ;;
    *)
        echo "Error: Invalid environment. Must be production, staging, or test"
        exit 1
        ;;
esac

# Convert environment variable to lowercase for Docker Compose file naming convention
LOWERCASE_ENVIRONMENT=$(echo "$ENVIRONMENT" | tr '[:upper:]' '[:lower:]')

DOCKER_COMPOSE_FILE="scripts/deploy/docker-compose-$LOWERCASE_ENVIRONMENT.yml"

echo "🚀 Starting deployment process..."

# Login to Docker Hub if credentials are provided and SKIP_PULL is not true
    echo "🔑 Logging in to Docker Hub..."
    echo "$DOCKER_HUB_PASSWORD" | docker login -u "$DOCKER_HUB_USERNAME" --password-stdin
# if [ "$SKIP_PULL" != "true" ]; then
# fi

# Export environment variable for dotenv-vault
export DOTENV_KEY="$DOTENV_KEY"
export NODE_ENV=production
export IMAGE_NAME="$IMAGE_NAME"

# Stop  old containers
echo "🛑 Stopping and removing old containers..."
docker-compose -f $DOCKER_COMPOSE_FILE down

# Pull latest images
if [ "$SKIP_PULL" != "true" ]; then
    echo "⬇️  Pulling latest images..."
    docker-compose -f $DOCKER_COMPOSE_FILE pull
else
    echo "Skipping Docker pull (SKIP_PULL=true)"
fi


# Start services
echo "▶️  Starting services..."

# Run migrations first
echo "🔧 Running database migrations..."
docker-compose -f $DOCKER_COMPOSE_FILE run --rm \
  idea-forge \
  sh -c "cd api && pnpm prisma migrate deploy"

# If migrations successful, start the services
if [ $? -eq 0 ]; then
    NODE_ENV=production DOTENV_KEY=$DOTENV_KEY IMAGE_NAME=$IMAGE_NAME docker-compose -f $DOCKER_COMPOSE_FILE up -d
else
    echo "Migration failed, deployment aborted"
    exit 1
fi

# record deploy info
echo "Deployed $ENVIRONMENT environment with image: $IMAGE_NAME at $(date '+%Y-%m-%d %H:%M:%S')" >> deploy.log
SCRIPT_PATH="$(pwd)/$(basename $0)"
echo "you can deploy manually with this command: sh $SCRIPT_PATH $ENVIRONMENT $IMAGE_TAG" >> deploy.log

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "🔍 Checking service status..."
docker-compose -f $DOCKER_COMPOSE_FILE ps

# Clean up old images
echo "🧹 Cleaning up old images..."

if [ "$SKIP_PULL" != "true" ]; then
    # 只在使用远程镜像时清理旧镜像
    docker images "$DOCKER_HUB_USERNAME/idea-forge" --format "{{.ID}} {{.Tag}} {{.CreatedAt}}" | sort -k3,4 -r |
    while read id tag created; do
        if [ "$tag" != "$IMAGE_TAG" ] && [ "$(echo "$created" | cut -d' ' -f1-2)" != "$(docker images "$DOCKER_HUB_USERNAME/idea-forge:$IMAGE_TAG" --format "{{.CreatedAt}}" | cut -d' ' -f1-2)" ]; then
            if [ "$(docker images "$DOCKER_HUB_USERNAME/idea-forge" --format "{{.Tag}}" | grep -v "$IMAGE_TAG" | head -n 1)" != "$tag" ]; then
                echo "Removing old image with tag: $tag"
                docker rmi $id || true
            fi
        fi
    done
fi

# Exit successfully
exit 0
