#!/bin/bash

TIMEOUT=30
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load .env file to check for worktree configuration
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -E '^(WORKTREE_ID|PORT_OFFSET)=' "$PROJECT_ROOT/.env" | xargs)
fi

# Determine if this is a worktree (PORT_OFFSET > 0) or main worktree
if [ -n "$PORT_OFFSET" ] && [ "$PORT_OFFSET" -gt 0 ] 2>/dev/null; then
    # Worktree mode: use worktree-specific compose file
    DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose-dev.worktree.yml"
    DOCKER_CONTAINER_NAME="ideaforge-${WORKTREE_ID}"
    POSTGRES_CONTAINER="${DOCKER_CONTAINER_NAME}-postgres"
    REDIS_CONTAINER="${DOCKER_CONTAINER_NAME}-redis"
    echo "🌳 Worktree mode detected (WORKTREE_ID=$WORKTREE_ID, PORT_OFFSET=$PORT_OFFSET)"
else
    # Main worktree mode: use default compose file
    DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose-dev.yml"
    DOCKER_CONTAINER_NAME="ideaforge"
    POSTGRES_CONTAINER="${DOCKER_CONTAINER_NAME}-postgres-1"
    REDIS_CONTAINER="${DOCKER_CONTAINER_NAME}-redis-1"
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running!"
    echo "💡 Please start Docker Desktop or Docker service first"
    exit 1
fi

# Check if containers are running, if not start them
if ! docker compose -f "$DOCKER_COMPOSE_FILE" -p $DOCKER_CONTAINER_NAME ps --status running | grep -q "postgres\|redis"; then
    echo "🚀 Starting Docker services..."
    docker compose -f "$DOCKER_COMPOSE_FILE" -p $DOCKER_CONTAINER_NAME up -d || {
        echo "❌ Failed to start Docker containers"
        echo "💡 Please check Docker status and try again"
        exit 1
    }
fi

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL to be ready..."
ELAPSED=0
until docker exec ${POSTGRES_CONTAINER} pg_isready 2>/dev/null || [ $ELAPSED -gt $TIMEOUT ]; do
    echo -n "."
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -gt $TIMEOUT ]; then
    echo "\n❌ PostgreSQL startup timed out"
    echo "💡 Please check container status:"
    docker compose -f "$DOCKER_COMPOSE_FILE" -p $DOCKER_CONTAINER_NAME ps
    exit 1
fi

# Wait for Redis
echo -e "\n⏳ Waiting for Redis to be ready..."
ELAPSED=0
until docker exec ${REDIS_CONTAINER} redis-cli ping 2>/dev/null | grep -q "PONG" || [ $ELAPSED -gt $TIMEOUT ]; do
    echo -n "."
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -gt $TIMEOUT ]; then
    echo "\n❌ Redis startup timed out"
    echo "💡 Please check container status:"
    docker compose -f "$DOCKER_COMPOSE_FILE" -p $DOCKER_CONTAINER_NAME ps
    exit 1
fi

echo -e "\n✨ All services are ready!"