# sh deploy.sh PRODUCTION 

echo "ENV=$1" # PRODUCTION, STAGING, TEST
echo "IMAGE_TAG=$2"

#!/bin/bash
set -e

# check arguments
if [ "$#" -ne 2 ]; then
    echo "Error: Missing required arguments"
    echo "Usage: $0 <environment> <image_tag>"
    echo "Example: $0 production abcd1234-20240315-123456"
    exit 1
fi

ENVIRONMENT=$1
IMAGE_TAG=$2
DOCKER_HUB_USERNAME="chenxiaoyao6228"
DOCKER_HUB_PASSWORD="q12345678?"

# full image name
IMAGE_NAME="$DOCKER_HUB_USERNAME/ideaforge-docker:$IMAGE_TAG"


# Define environment variables for different environments
DOTENV_KEY_PRODUCTION="dotenv://:key_0c438695fc0b67f67a0e445c7978d621cb088fe107970ea7cfb46e0349f8dc32@dotenv.org/vault/.env.vault?environment=production"
# DOTENV_KEY_STAGING="your_staging_key_here"
DOTENV_KEY_TEST="dotenv://:key_eeeafd6e3e18edfcd6ea2b3ae52a08b676ab69772f3b9af5f0178e46da62a751@dotenv.org/vault/.env.vault?environment=ci"

# Get environment from argument
ENVIRONMENT=$1
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

DOCKER_COMPOSE_FILE="docker-compose-$LOWERCASE_ENVIRONMENT.yml"

echo "🚀 Starting deployment process..."

# Login to Docker Hub
echo "🔑 Logging in to Docker Hub..."
echo "$DOCKER_HUB_PASSWORD" | docker login -u "chenxiaoyao6228" --password-stdin

# Export environment variable for dotenv-vault
export DOTENV_KEY="$DOTENV_KEY"
export NODE_ENV=production
export IMAGE_NAME="$IMAGE_NAME"

# Pull latest images
echo "⬇️  Pulling latest images..."
docker-compose -f $DOCKER_COMPOSE_FILE pull

# Stop and remove old containers
echo "🛑 Stopping and removing old containers..."
docker-compose -f $DOCKER_COMPOSE_FILE down


# Start services
echo "▶️  Starting services..."

# Run migrations first
echo "🔧 Running database migrations..."
docker-compose -f $DOCKER_COMPOSE_FILE run --rm \
  idea-forge \
  sh -c "cd api && pnpm prisma migrate deploy"

# If migrations successful, start the services
if [ $? -eq 0 ]; then
    NODE_ENV=production DOTENV_KEY=$DOTENV_KEY docker-compose -f $DOCKER_COMPOSE_FILE up -d
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
# Get all images sorted by creation date (newest first)
docker images "chenxiaoyao6228/ideaforge-docker" --format "{{.ID}} {{.Tag}} {{.CreatedAt}}" | sort -k3,4 -r |
while read id tag created; do
    # Skip the current image and the most recent previous one
    if [ "$tag" != "$IMAGE_TAG" ] && [ "$(echo "$created" | cut -d' ' -f1-2)" != "$(docker images "chenxiaoyao6228/ideaforge-docker:$IMAGE_TAG" --format "{{.CreatedAt}}" | cut -d' ' -f1-2)" ]; then
        # Skip the second most recent image
        if [ "$(docker images "chenxiaoyao6228/ideaforge-docker" --format "{{.Tag}}" | grep -v "$IMAGE_TAG" | head -n 1)" != "$tag" ]; then
            echo "Removing old image with tag: $tag"
            docker rmi $id || true
        fi
    fi
done

# Exit successfully
exit 0
