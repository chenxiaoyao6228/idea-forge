#!/bin/bash
set -e

# =============================================================================
# Local Production Build Testing Script
# =============================================================================
# This script helps test the production Docker image locally with isolated ports
# that don't conflict with your development environment.
#
# Key Features:
# - Uses different ports (5100, 5101, 5532, 6479, 9100, 9101)
# - Includes MinIO for local S3-compatible storage testing
# - Can use locally built image or remote image
# - Isolated Docker volumes from dev and production
#
# Usage:
#   ./deploy-local.sh              # Deploy with existing config
#   ./deploy-local.sh --build      # Rebuild image before deploying
#   ./deploy-local.sh --clean      # Clean up and remove all data
#   ./deploy-local.sh --help       # Show help
#
# Prerequisites:
#   - Docker and Docker Compose installed
#   - .env.local file configured (copy from .env.local.example)
# =============================================================================

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() { echo -e "${BLUE}ℹ ${NC}$1"; }
print_success() { echo -e "${GREEN}✓ ${NC}$1"; }
print_warning() { echo -e "${YELLOW}⚠ ${NC}$1"; }
print_error() { echo -e "${RED}✗ ${NC}$1"; }

# Function to show help
show_help() {
    cat << EOF
${GREEN}Idea Forge - Local Production Build Testing Script${NC}

${BLUE}Usage:${NC}
  $0 [OPTIONS]

${BLUE}Options:${NC}
  --build         Rebuild the Docker image before deploying
  --clean         Stop services and remove all data (volumes)
  --logs          Show logs after deployment
  --help          Show this help message

${BLUE}Examples:${NC}
  # First time setup
  cp .env.local.example .env.local
  $0 --build

  # Regular deployment (uses existing image)
  $0

  # View logs
  $0 --logs

  # Clean up everything
  $0 --clean

${BLUE}Ports:${NC}
  Application:    http://localhost:5100
  WebSocket:      ws://localhost:5101/collaboration
  PostgreSQL:     localhost:5532
  Redis:          localhost:6479
  MinIO API:      http://localhost:9100
  MinIO Console:  http://localhost:9101

${BLUE}MinIO Access:${NC}
  Console:        http://localhost:9101
  Username:       minioadmin
  Password:       minioadmin

EOF
    exit 0
}

# Parse command line arguments
BUILD_IMAGE=false
CLEAN_ALL=false
SHOW_LOGS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --build)
            BUILD_IMAGE=true
            shift
            ;;
        --clean)
            CLEAN_ALL=true
            shift
            ;;
        --logs)
            SHOW_LOGS=true
            shift
            ;;
        --help)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Detect Docker Compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    print_error "Docker Compose not found. Please install Docker Compose."
    exit 1
fi

DOCKER_COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
# Use the 'local-testing' profile to enable MinIO
COMPOSE_PROFILES="local-testing"
export COMPOSE_PROFILES
ENV_FILE="${SCRIPT_DIR}/.env"

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    print_error ".env file not found!"
    echo ""
    print_info "Please create it from the secrets template:"
    echo "  cp env.secrets.example .env"
    echo "  nano .env  # Update secrets and configuration"
    echo ""
    print_info "For local testing, make sure to set:"
    echo "  - SKIP_PULL=true"
    echo "  - IMAGE_NAME=idea-forge:latest"
    echo "  - BUILD_CONTEXT=../.."
    echo "  - All secrets (POSTGRES_PASSWORD, SESSION_SECRET, JWT_SECRET, etc.)"
    exit 1
fi

# Load environment variables from .env
set -a
source "$ENV_FILE"
set +a

# Pre-set local testing ports (different from dev to avoid conflicts)
# User can override these in .env if needed
export API_PORT="${API_PORT:-5100}"
export WS_PORT="${WS_PORT:-5101}"
export POSTGRES_PORT="${POSTGRES_PORT:-5532}"
export REDIS_PORT="${REDIS_PORT:-6479}"
export MINIO_PORT="${MINIO_PORT:-9100}"
export MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-9101}"

# Set local testing defaults
export NODE_ENV="${NODE_ENV:-local}"
export POSTGRES_DB="${POSTGRES_DB:-ideaforge_local}"

# Set compose project name
COMPOSE_PROJECT_NAME="ideaforge-local"
export COMPOSE_PROJECT_NAME

# Handle --clean option
if [ "$CLEAN_ALL" = true ]; then
    print_warning "This will stop all services and delete all data (volumes)!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Stopping services and removing volumes..."
        $DOCKER_COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" down -v
        print_success "Cleanup completed!"
    else
        print_info "Cleanup cancelled."
    fi
    exit 0
fi

print_info "Starting Local Production Build Testing..."
echo ""
print_info "Configuration:"
echo "  Environment:    ${NODE_ENV:-production}"
echo "  Image:          ${IMAGE_NAME:-idea-forge:latest}"
echo "  API Port:       ${API_PORT:-5100}"
echo "  WebSocket:      ${WS_PORT:-5101}"
echo "  PostgreSQL:     ${POSTGRES_PORT:-5532}"
echo "  Redis:          ${REDIS_PORT:-6479}"
echo "  MinIO API:      ${MINIO_PORT:-9100}"
echo "  MinIO Console:  ${MINIO_CONSOLE_PORT:-9101}"
echo ""

# Build image if requested
if [ "$BUILD_IMAGE" = true ]; then
    print_info "Building Docker image from local source..."
    echo ""

    # Check for proxy settings
    if [ -n "$HTTP_PROXY" ] || [ -n "$HTTPS_PROXY" ]; then
        print_warning "Using proxy settings: HTTP_PROXY=$HTTP_PROXY, HTTPS_PROXY=$HTTPS_PROXY"
    fi

    cd "$SCRIPT_DIR/../.."
    docker build -t "${IMAGE_NAME:-idea-forge:latest}" .

    if [ $? -eq 0 ]; then
        print_success "Docker image built successfully!"
    else
        print_error "Docker build failed!"
        exit 1
    fi
    echo ""
fi

# Stop old containers
print_info "Stopping old containers..."
$DOCKER_COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" down
echo ""

# Start all services
print_info "Starting all services..."
$DOCKER_COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" up -d
echo ""

# Wait for PostgreSQL to be ready
print_info "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if $DOCKER_COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_isready -U "$POSTGRES_USER" > /dev/null 2>&1; then
        print_success "PostgreSQL is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "PostgreSQL failed to start"
        $DOCKER_COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" logs postgres
        exit 1
    fi
    sleep 1
done
echo ""

# Wait for MinIO to be ready
print_info "Waiting for MinIO to be ready..."
for i in {1..30}; do
    if curl -sf "http://localhost:${MINIO_PORT:-9100}/minio/health/live" > /dev/null 2>&1; then
        print_success "MinIO is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        print_warning "MinIO health check failed, but continuing..."
        break
    fi
    sleep 1
done
echo ""

# Run migrations
print_info "Running database migrations..."
$DOCKER_COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" exec -T idea-forge sh -c "cd /app/apps/api && npx prisma migrate deploy"

if [ $? -eq 0 ]; then
    print_success "Migrations completed successfully"
else
    print_error "Migration failed!"
    exit 1
fi
echo ""

# Wait a bit for application to start
print_info "Waiting for application to start..."
sleep 5
echo ""

# Check service status
print_info "Service Status:"
$DOCKER_COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" ps
echo ""

# Test application
print_info "Testing application endpoints..."

# Test health endpoint
if curl -sf "http://localhost:${API_PORT:-5100}/health" > /dev/null 2>&1; then
    print_success "Health endpoint: OK"
else
    print_warning "Health endpoint: Failed (may take a few more seconds)"
fi

# Test root endpoint
if curl -sf "http://localhost:${API_PORT:-5100}/" > /dev/null 2>&1; then
    print_success "Application endpoint: OK"
else
    print_warning "Application endpoint: Failed (may take a few more seconds)"
fi
echo ""

# Show access information
print_success "Deployment completed!"
echo ""
echo "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo "${GREEN}  Access Points${NC}"
echo "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  ${BLUE}Application:${NC}      http://localhost:${API_PORT:-5100}"
echo "  ${BLUE}API:${NC}              http://localhost:${API_PORT:-5100}/api"
echo "  ${BLUE}Health Check:${NC}     http://localhost:${API_PORT:-5100}/health"
echo "  ${BLUE}API Docs:${NC}         http://localhost:${API_PORT:-5100}/api-docs"
echo ""
echo "  ${BLUE}MinIO Console:${NC}    http://localhost:${MINIO_CONSOLE_PORT:-9101}"
echo "    Username:       ${MINIO_ROOT_USER:-minioadmin}"
echo "    Password:       ${MINIO_ROOT_PASSWORD:-minioadmin}"
echo ""
echo "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo "${GREEN}  Useful Commands${NC}"
echo "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  ${BLUE}View logs:${NC}"
echo "    $DOCKER_COMPOSE_CMD -f $DOCKER_COMPOSE_FILE logs -f"
echo ""
echo "  ${BLUE}View specific service logs:${NC}"
echo "    $DOCKER_COMPOSE_CMD -f $DOCKER_COMPOSE_FILE logs -f idea-forge"
echo ""
echo "  ${BLUE}Stop services:${NC}"
echo "    $DOCKER_COMPOSE_CMD -f $DOCKER_COMPOSE_FILE down"
echo ""
echo "  ${BLUE}Stop and remove all data:${NC}"
echo "    $DOCKER_COMPOSE_CMD -f $DOCKER_COMPOSE_FILE down -v"
echo ""
echo "  ${BLUE}Restart services:${NC}"
echo "    $DOCKER_COMPOSE_CMD -f $DOCKER_COMPOSE_FILE restart"
echo ""
echo "  ${BLUE}Access PostgreSQL:${NC}"
echo "    $DOCKER_COMPOSE_CMD -f $DOCKER_COMPOSE_FILE exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB"
echo ""
echo "  ${BLUE}Access Redis:${NC}"
echo "    $DOCKER_COMPOSE_CMD -f $DOCKER_COMPOSE_FILE exec redis redis-cli"
echo ""
echo "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Show logs if requested
if [ "$SHOW_LOGS" = true ]; then
    print_info "Showing application logs (Ctrl+C to exit)..."
    echo ""
    $DOCKER_COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" logs -f idea-forge
fi

exit 0
