#!/bin/bash

DOCKER_CONTAINER_NAME="ideaforge"
TIMEOUT=30

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running!"
    echo "💡 Please start Docker Desktop or Docker service first"
    exit 1
fi

# Check if containers are running, if not start them
if ! docker compose -f docker-compose-dev.yml -p $DOCKER_CONTAINER_NAME ps --status running | grep -q "postgres\|redis"; then
    echo "🚀 Starting Docker services..."
    docker compose -f docker-compose-dev.yml -p $DOCKER_CONTAINER_NAME up -d || {
        echo "❌ Failed to start Docker containers"
        echo "💡 Please check Docker status and try again"
        exit 1
    }
fi

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL to be ready..."
ELAPSED=0
until docker exec ${DOCKER_CONTAINER_NAME}-postgres-1 pg_isready 2>/dev/null || [ $ELAPSED -gt $TIMEOUT ]; do
    echo -n "."
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -gt $TIMEOUT ]; then
    echo "\n❌ PostgreSQL startup timed out"
    echo "💡 Please check container status:"
    docker compose -f docker-compose-dev.yml -p $DOCKER_CONTAINER_NAME ps
    exit 1
fi

# Wait for Redis
echo -e "\n⏳ Waiting for Redis to be ready..."
ELAPSED=0
until docker exec ${DOCKER_CONTAINER_NAME}-redis-1 redis-cli ping 2>/dev/null | grep -q "PONG" || [ $ELAPSED -gt $TIMEOUT ]; do
    echo -n "."
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -gt $TIMEOUT ]; then
    echo "\n❌ Redis startup timed out"
    echo "💡 Please check container status:"
    docker compose -f docker-compose-dev.yml -p $DOCKER_CONTAINER_NAME ps
    exit 1
fi

echo -e "\n✨ All services are ready!"