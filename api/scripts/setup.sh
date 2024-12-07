#!/bin/bash

# Check if Docker credentials are configured correctly
check_docker_credentials() {
    if ! docker info &> /dev/null; then
        echo "❌ Docker credentials error: Please login to Docker first"
        echo "💡 Solutions:"
        echo "1. Run 'docker login' to login to Docker Hub"
        echo "2. If using Docker Desktop, make sure it's started and running"
        echo "3. Check if docker-credential-helper is installed correctly"
        return 1
    fi
    return 0
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed (checking both V1 and V2)
if ! (command -v docker-compose &> /dev/null || docker compose version &> /dev/null); then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check Docker credentials
if ! check_docker_credentials; then
    exit 1
fi

# Copy .env.example to .env, overwriting if exists
echo "📝 Creating/Overwriting .env file from .env.example..."
if [ -f .env.example ]; then
    cp -f .env.example .env
    echo "✅ Created/Overwritten .env file from .env.example"
else
    echo "❌ .env.example file not found"
    exit 1
fi

# Start Docker containers
echo "🐳 Starting IdeaForge Docker containers..."
DOCKER_CONTAINER_NAME="ideaforge"

# Use -f flag to ensure correct docker-compose file is used
docker compose -p $DOCKER_CONTAINER_NAME up -d || {
    echo "❌ Failed to start Docker containers"
    echo "💡 Please check Docker status and try again"
    exit 1
}

echo "⏳ Waiting for PostgreSQL to be ready..."
# Replace timeout command with a more universal method
TIMEOUT=90
ELAPSED=0
until docker exec ${DOCKER_CONTAINER_NAME}-postgres-1 pg_isready 2>/dev/null || [ $ELAPSED -gt $TIMEOUT ]; do
    sleep 5
    ELAPSED=$((ELAPSED + 5))
done

if [ $ELAPSED -gt $TIMEOUT ]; then
    echo "❌ PostgreSQL startup timeout"
    echo "💡 Please check Docker container status:"
    docker ps
    exit 1
fi

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
ELAPSED=0
until docker exec ${DOCKER_CONTAINER_NAME}-redis-1 redis-cli ping 2>/dev/null | grep -q "PONG" || [ $ELAPSED -gt $TIMEOUT ]; do
    sleep 5
    ELAPSED=$((ELAPSED + 5))
done

if [ $ELAPSED -gt $TIMEOUT ]; then
    echo "❌ Redis startup timeout"
    echo "💡 Please check Docker container status:"
    docker ps
    exit 1
fi

# Apply migrations
echo "🔄 Applying migrations..."

# Generate Prisma client first
echo "📦 Generating Prisma client..."
npx prisma generate || {
    echo "❌ Failed to generate Prisma client"
    exit 1
}

# Then run prisma init
npm run prisma:init:local || {
    echo "❌ Failed to initialize Prisma"
    exit 1
}

echo "✨ IdeaForge setup complete! 🎉"