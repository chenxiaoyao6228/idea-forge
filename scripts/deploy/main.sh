#!/bin/bash
set -e

# Load environment variables from run.env
if [ -f "run.env" ]; then
    source "run.env"
else
    echo "Error: run.env file not found in current directory"
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
echo "IMAGE_NAME=$IMAGE_NAME" >> "run.env"

DOCKER_COMPOSE_FILE="docker-compose-$ENVIRONMENT.yml"

echo "🚀 Starting deployment process..."

# Login to Docker Hub if credentials are provided and SKIP_PULL is not true
if [ "$SKIP_PULL" != "true" ]; then
    echo "🔑 Logging in to Docker Hub..."
    echo "$DOCKER_HUB_PASSWORD" | docker login -u "$DOCKER_HUB_USERNAME" --password-stdin
fi

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


# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "🔍 Checking service status..."
docker-compose -f $DOCKER_COMPOSE_FILE ps

# Clean up old images
echo "🧹 Cleaning up old images..."

if [ "$SKIP_PULL" != "true" ]; then
    # only clean old images when using remote image
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
