#!/bin/bash

# Smart Docker build script with automatic proxy detection
# Usage: ./scripts/build-docker.sh [--no-cache]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
USE_CACHE=true
PROXY_HOST="127.0.0.1"
PROXY_PORT="7897"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-cache)
            USE_CACHE=false
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🔍 Detecting environment...${NC}"

# Detect proxy from environment or config
PROXY_URL=""
if [ -n "$HTTP_PROXY" ]; then
    PROXY_URL="$HTTP_PROXY"
    echo -e "${GREEN}✓ Found proxy in HTTP_PROXY environment variable: $PROXY_URL${NC}"
elif [ -n "$http_proxy" ]; then
    PROXY_URL="$http_proxy"
    echo -e "${GREEN}✓ Found proxy in http_proxy environment variable: $PROXY_URL${NC}"
else
    # Check if ~/.docker/config.json has proxy
    if [ -f ~/.docker/config.json ]; then
        CONFIG_PROXY=$(cat ~/.docker/config.json | grep -A 3 '"proxies"' | grep 'httpProxy' | cut -d'"' -f4 || echo "")
        if [ -n "$CONFIG_PROXY" ]; then
            PROXY_URL="$CONFIG_PROXY"
            echo -e "${GREEN}✓ Found proxy in ~/.docker/config.json: $PROXY_URL${NC}"
        fi
    fi
fi

# Test if proxy is accessible
if [ -n "$PROXY_URL" ]; then
    echo -e "${BLUE}🧪 Testing proxy connection...${NC}"
    if curl --max-time 5 -x "$PROXY_URL" -s https://auth.docker.io/token?service=registry.docker.io > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Proxy is working!${NC}"
        USE_PROXY=true
    else
        echo -e "${YELLOW}⚠️  Proxy configured but not responding. Building without proxy...${NC}"
        USE_PROXY=false
    fi
else
    echo -e "${YELLOW}⚠️  No proxy detected. Building without proxy...${NC}"
    USE_PROXY=false
fi

# Pull base image first
echo -e "${BLUE}📦 Pulling base image...${NC}"
if docker pull node:20.18.1-alpine; then
    echo -e "${GREEN}✓ Base image pulled successfully${NC}"
else
    echo -e "${RED}✗ Failed to pull base image${NC}"
    echo -e "${YELLOW}💡 Tip: Check your proxy settings or Docker Desktop proxy configuration${NC}"
    exit 1
fi

# Build command
BUILD_CMD="docker build --pull=false"

if [ "$USE_CACHE" = false ]; then
    BUILD_CMD="$BUILD_CMD --no-cache"
fi

# Add proxy build args if using proxy
if [ "$USE_PROXY" = true ] && [ -n "$PROXY_URL" ]; then
    echo -e "${BLUE}🔧 Building with proxy: $PROXY_URL${NC}"
    # Use host.docker.internal for Mac/Windows, docker0 IP for Linux
    if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "msys" ]]; then
        CONTAINER_PROXY="http://host.docker.internal:$PROXY_PORT"
    else
        # Linux - get docker0 bridge IP
        DOCKER_HOST_IP=$(ip -4 addr show docker0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}' || echo "172.17.0.1")
        CONTAINER_PROXY="http://$DOCKER_HOST_IP:$PROXY_PORT"
    fi

    BUILD_CMD="$BUILD_CMD --build-arg HTTP_PROXY=$CONTAINER_PROXY --build-arg HTTPS_PROXY=$CONTAINER_PROXY"
fi

BUILD_CMD="$BUILD_CMD -t idea-forge:latest ."

# Show build command
echo -e "${BLUE}🏗️  Running: $BUILD_CMD${NC}"
echo ""

# Execute build
if eval $BUILD_CMD; then
    echo ""
    echo -e "${GREEN}✅ Docker image built successfully!${NC}"
    echo -e "${BLUE}📦 Image: idea-forge:latest${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "  1. Configure deployment: ${BLUE}cp scripts/deploy/env.secrets.example scripts/deploy/.env${NC}"
    echo -e "  2. Edit .env: ${BLUE}Set SKIP_PULL=true and IMAGE_NAME=idea-forge:latest${NC}"
    echo -e "  3. Deploy: ${BLUE}cd scripts/deploy && ./deploy.sh${NC}"
else
    echo ""
    echo -e "${RED}✗ Docker build failed${NC}"
    echo -e "${YELLOW}💡 Troubleshooting:${NC}"
    echo -e "  - Check ${BLUE}docs/development/EN/docker.md${NC} for detailed proxy setup"
    echo -e "  - Verify Docker Desktop proxy settings (Mac/Windows)"
    echo -e "  - Verify /etc/docker/daemon.json proxy settings (Linux)"
    echo -e "  - Test proxy: ${BLUE}curl -x $PROXY_URL https://www.google.com${NC}"
    exit 1
fi
