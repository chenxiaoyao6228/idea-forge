#!/bin/bash

# =============================================================================
# Git Worktree Creation Script for Parallel Development
# =============================================================================
# This script creates a new git worktree with isolated Docker services and ports
#
# Usage: ./scripts/development/create-worktree.sh <branch-name> <port-offset>
# Example: ./scripts/development/create-worktree.sh feat-auth 100
#
# Port Allocation:
#   offset=0:   main worktree (ports 5000, 5001, 5173, 5432, 6379, 9000, 9001)
#   offset=100: worktree-1   (ports 5100, 5101, 5273, 5532, 6479, 9100, 9101)
#   offset=200: worktree-2   (ports 5200, 5201, 5373, 5632, 6579, 9200, 9201)
#   offset=300: worktree-3   (ports 5300, 5301, 5473, 5732, 6679, 9300, 9301)
# =============================================================================

set -e  # Exit on error

BRANCH_NAME=$1
PORT_OFFSET=$2

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validate arguments
if [ -z "$BRANCH_NAME" ] || [ -z "$PORT_OFFSET" ]; then
    echo -e "${RED}❌ Error: Missing required arguments${NC}"
    echo ""
    echo "Usage: ./scripts/development/create-worktree.sh <branch-name> <port-offset>"
    echo ""
    echo "Examples:"
    echo "  ./scripts/development/create-worktree.sh feat-auth 100"
    echo "  ./scripts/development/create-worktree.sh bugfix-login 200"
    echo ""
    echo "Port offset must be unique (0, 100, 200, 300, etc.)"
    exit 1
fi

# Validate port offset is a number
if ! [[ "$PORT_OFFSET" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}❌ Error: PORT_OFFSET must be a number${NC}"
    exit 1
fi

# Get the project root (two levels up from this script's location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

WORKTREE_DIR="${PROJECT_ROOT}/../idea-forge-${BRANCH_NAME}"

# Check if worktree directory already exists
if [ -d "$WORKTREE_DIR" ]; then
    echo -e "${RED}❌ Error: Worktree directory already exists: $WORKTREE_DIR${NC}"
    echo -e "${YELLOW}💡 Hint: Run './scripts/development/cleanup-worktree.sh ${BRANCH_NAME}' to remove it${NC}"
    exit 1
fi

# Check if branch already exists
if git show-ref --verify --quiet refs/heads/${BRANCH_NAME}; then
    echo -e "${RED}❌ Error: Branch '${BRANCH_NAME}' already exists${NC}"
    echo -e "${YELLOW}💡 Hint: Either use a different name or delete the branch with:${NC}"
    echo -e "${YELLOW}   git branch -D ${BRANCH_NAME}${NC}"
    exit 1
fi

# Calculate ports
POSTGRES_PORT=$((5432 + PORT_OFFSET))
REDIS_PORT=$((6379 + PORT_OFFSET))
MINIO_PORT=$((9000 + PORT_OFFSET))
MINIO_CONSOLE_PORT=$((9001 + PORT_OFFSET))
NEST_API_PORT=$((5000 + PORT_OFFSET))
NEST_API_WS_PORT=$((5001 + PORT_OFFSET))
VITE_PORT=$((5173 + PORT_OFFSET))
DEBUG_PORT=$((9333 + PORT_OFFSET))

echo -e "${BLUE}🌳 Creating git worktree '${BRANCH_NAME}'...${NC}"
echo ""

# Create worktree (must run from PROJECT_ROOT)
cd "${PROJECT_ROOT}"
git worktree add "${WORKTREE_DIR}" -b "${BRANCH_NAME}"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to create worktree${NC}"
    echo -e "${YELLOW}💡 Check the error message above for details${NC}"
    exit 1
fi

cd "${WORKTREE_DIR}"

echo ""
echo -e "${BLUE}📝 Creating .env configuration files...${NC}"

# Check if main worktree has a customized .env
MAIN_ENV="${PROJECT_ROOT}/.env"
MAIN_ENV_EXAMPLE="${PROJECT_ROOT}/.env.example"

if [ -f "$MAIN_ENV" ]; then
    echo "  📋 Found existing .env in main worktree - copying custom settings"
    cp "$MAIN_ENV" .env
    ENV_SOURCE="main .env (preserving your custom settings)"
else
    echo "  📋 No .env found in main worktree - using .env.example"
    if [ -f "$MAIN_ENV_EXAMPLE" ]; then
        cp "$MAIN_ENV_EXAMPLE" .env
        ENV_SOURCE=".env.example"
    else
        echo -e "${RED}❌ Error: .env.example not found in project root${NC}"
        exit 1
    fi
fi

echo "  🔧 Updating port configuration for worktree..."

# Update .env with calculated values using portable sed
# Only update port-related and worktree-specific variables
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/WORKTREE_ID=.*/WORKTREE_ID=${BRANCH_NAME}/" .env
    sed -i '' "s/PORT_OFFSET=.*/PORT_OFFSET=${PORT_OFFSET}/" .env
    sed -i '' "s/POSTGRES_PORT=.*/POSTGRES_PORT=${POSTGRES_PORT}/" .env
    sed -i '' "s/REDIS_PORT=.*/REDIS_PORT=${REDIS_PORT}/" .env
    sed -i '' "s/MINIO_PORT=.*/MINIO_PORT=${MINIO_PORT}/" .env
    sed -i '' "s/MINIO_CONSOLE_PORT=.*/MINIO_CONSOLE_PORT=${MINIO_CONSOLE_PORT}/" .env
    sed -i '' "s/NEST_API_PORT=.*/NEST_API_PORT=${NEST_API_PORT}/" .env
    sed -i '' "s/NEST_API_WS_PORT=.*/NEST_API_WS_PORT=${NEST_API_WS_PORT}/" .env
    sed -i '' "s/VITE_PORT=.*/VITE_PORT=${VITE_PORT}/" .env
    sed -i '' "s/DEBUG_PORT=.*/DEBUG_PORT=${DEBUG_PORT}/" .env
    sed -i '' "s/POSTGRES_DB=.*/POSTGRES_DB=ideaforge_${BRANCH_NAME}/" .env
    sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:123456@localhost:${POSTGRES_PORT}/ideaforge_${BRANCH_NAME}?schema=public|" .env
    sed -i '' "s|CLIENT_APP_URL=.*|CLIENT_APP_URL=http://localhost:${NEST_API_PORT}|" .env
    sed -i '' "s|CLIENT_COLLAB_WS_URL=.*|CLIENT_COLLAB_WS_URL=ws://localhost:${NEST_API_WS_PORT}/collaboration|" .env
    sed -i '' "s|OSS_ENDPOINT=.*|OSS_ENDPOINT=http://localhost:${MINIO_PORT}|" .env
    sed -i '' "s|OSS_CDN_ENDPOINT=.*|OSS_CDN_ENDPOINT=http://localhost:${MINIO_PORT}/|" .env
    sed -i '' "s|GOOGLE_CALLBACK_URL=.*|GOOGLE_CALLBACK_URL=http://localhost:${NEST_API_PORT}/|" .env
    sed -i '' "s|GITHUB_CALLBACK_URL=.*|GITHUB_CALLBACK_URL=http://localhost:${NEST_API_PORT}/|" .env
else
    # Linux
    sed -i "s/WORKTREE_ID=.*/WORKTREE_ID=${BRANCH_NAME}/" .env
    sed -i "s/PORT_OFFSET=.*/PORT_OFFSET=${PORT_OFFSET}/" .env
    sed -i "s/POSTGRES_PORT=.*/POSTGRES_PORT=${POSTGRES_PORT}/" .env
    sed -i "s/REDIS_PORT=.*/REDIS_PORT=${REDIS_PORT}/" .env
    sed -i "s/MINIO_PORT=.*/MINIO_PORT=${MINIO_PORT}/" .env
    sed -i "s/MINIO_CONSOLE_PORT=.*/MINIO_CONSOLE_PORT=${MINIO_CONSOLE_PORT}/" .env
    sed -i "s/NEST_API_PORT=.*/NEST_API_PORT=${NEST_API_PORT}/" .env
    sed -i "s/NEST_API_WS_PORT=.*/NEST_API_WS_PORT=${NEST_API_WS_PORT}/" .env
    sed -i "s/VITE_PORT=.*/VITE_PORT=${VITE_PORT}/" .env
    sed -i "s/DEBUG_PORT=.*/DEBUG_PORT=${DEBUG_PORT}/" .env
    sed -i "s/POSTGRES_DB=.*/POSTGRES_DB=ideaforge_${BRANCH_NAME}/" .env
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:123456@localhost:${POSTGRES_PORT}/ideaforge_${BRANCH_NAME}?schema=public|" .env
    sed -i "s|CLIENT_APP_URL=.*|CLIENT_APP_URL=http://localhost:${NEST_API_PORT}|" .env
    sed -i "s|CLIENT_COLLAB_WS_URL=.*|CLIENT_COLLAB_WS_URL=ws://localhost:${NEST_API_WS_PORT}/collaboration|" .env
    sed -i "s|OSS_ENDPOINT=.*|OSS_ENDPOINT=http://localhost:${MINIO_PORT}|" .env
    sed -i "s|OSS_CDN_ENDPOINT=.*|OSS_CDN_ENDPOINT=http://localhost:${MINIO_PORT}/|" .env
    sed -i "s|GOOGLE_CALLBACK_URL=.*|GOOGLE_CALLBACK_URL=http://localhost:${NEST_API_PORT}/|" .env
    sed -i "s|GITHUB_CALLBACK_URL=.*|GITHUB_CALLBACK_URL=http://localhost:${NEST_API_PORT}/|" .env
fi

# Copy root .env to apps/api/.env
cp .env apps/api/.env

echo -e "${GREEN}✅ Configuration files created${NC}"
echo ""
echo -e "${BLUE}📦 Installing dependencies...${NC}"

# Install dependencies (ignore postinstall scripts since Docker isn't running yet)
pnpm install --ignore-scripts

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

# Generate Prisma client (needed for migrations)
echo -e "${BLUE}📦 Generating Prisma client...${NC}"
pnpm -F @idea/api prisma:generate

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to generate Prisma client${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🐳 Starting Docker services...${NC}"

# Export environment variables for docker-compose
export WORKTREE_ID=$BRANCH_NAME
export POSTGRES_PORT=$POSTGRES_PORT
export REDIS_PORT=$REDIS_PORT
export MINIO_PORT=$MINIO_PORT
export MINIO_CONSOLE_PORT=$MINIO_CONSOLE_PORT
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=123456
export POSTGRES_DB="ideaforge_${BRANCH_NAME}"
export MINIO_ROOT_USER=minioadmin
export MINIO_ROOT_PASSWORD=minioadmin

# Start Docker services using worktree compose file from project root
docker compose -f "${PROJECT_ROOT}/docker-compose-dev.worktree.yml" up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start Docker services${NC}"
    exit 1
fi

# Wait for services to be ready
echo ""
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 5

# Wait for PostgreSQL
TIMEOUT=30
ELAPSED=0
until docker exec ideaforge-${BRANCH_NAME}-postgres pg_isready 2>/dev/null || [ $ELAPSED -gt $TIMEOUT ]; do
    echo -n "."
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -gt $TIMEOUT ]; then
    echo -e "${RED}❌ PostgreSQL startup timed out${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ PostgreSQL ready${NC}"

# Create MinIO bucket using mc from running container
echo -e "${BLUE}📦 Creating MinIO bucket...${NC}"
sleep 3

# Configure mc alias inside the running MinIO container
docker exec ideaforge-${BRANCH_NAME}-minio mc alias set local http://localhost:9000 minioadmin minioadmin 2>/dev/null || true

# Create bucket (ignore if exists)
docker exec ideaforge-${BRANCH_NAME}-minio mc mb --ignore-existing local/assets-idea-forge-dev 2>/dev/null || true

# Set public download policy
docker exec ideaforge-${BRANCH_NAME}-minio mc anonymous set download local/assets-idea-forge-dev 2>/dev/null || true

echo ""
echo -e "${BLUE}🔄 Running Prisma migrations...${NC}"
# We're already in the worktree root, no need to cd
pnpm -F @idea/api prisma:migrate:deploy 2>&1 | grep -v "^Progress:"

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Prisma migration had some issues, but continuing...${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Worktree '${BRANCH_NAME}' created successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📍 Configuration:${NC}"
echo "   Environment: ${ENV_SOURCE}"
echo "   Database:    ideaforge_${BRANCH_NAME}"
echo ""
echo -e "${BLUE}📍 Port Configuration:${NC}"
echo "   API Server:     http://localhost:${NEST_API_PORT}"
echo "   WebSocket:      ws://localhost:${NEST_API_WS_PORT}"
echo "   Vite Dev:       http://localhost:${VITE_PORT}"
echo "   PostgreSQL:     localhost:${POSTGRES_PORT}"
echo "   Redis:          localhost:${REDIS_PORT}"
echo "   MinIO:          http://localhost:${MINIO_PORT}"
echo "   MinIO Console:  http://localhost:${MINIO_CONSOLE_PORT}"
echo "   VS Code Debug:  ${DEBUG_PORT}"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo "   1. cd ${WORKTREE_DIR}"
echo "   2. Open in new Cursor/VS Code window: cursor ${WORKTREE_DIR}"
echo "   3. Dev servers will auto-start with hot-reload"
echo "   4. If frontend doesn't load, restart API server to pick up new ports"
echo "   5. Run 'pnpm build:contracts' after Prisma schema changes"
echo ""
echo -e "${YELLOW}⚠️  Important: If you see CSP errors in browser console:${NC}"
echo -e "${YELLOW}   The API server may need restart to load new VITE_PORT${NC}"
echo -e "${YELLOW}   Kill the server and let it auto-restart, or run: pnpm -F @idea/api dev${NC}"
echo ""
echo -e "${YELLOW}💡 Tip: Use './scripts/cleanup-worktree.sh ${BRANCH_NAME}' to remove this worktree${NC}"
echo ""
