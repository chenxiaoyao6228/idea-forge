#!/bin/bash
set -e

# =============================================================================
# Idea Forge Quick Start Deployment Script
# =============================================================================
# This script downloads only the deployment files needed to run Idea Forge
# No need to clone the full repository!
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/chenxiaoyao6228/idea-forge/master/scripts/deploy/deploy-quick-start.sh | bash
#
# Or download and run:
#   wget https://raw.githubusercontent.com/chenxiaoyao6228/idea-forge/master/scripts/deploy/deploy-quick-start.sh
#   chmod +x deploy-quick-start.sh
#   ./deploy-quick-start.sh
# =============================================================================

REPO_BASE="https://raw.githubusercontent.com/chenxiaoyao6228/idea-forge/master/scripts/deploy"
DEPLOY_DIR="idea-forge-deploy"

echo "🚀 Idea Forge Quick Start Deployment"
echo "===================================="
echo ""

# Create deployment directory
if [ -d "$DEPLOY_DIR" ]; then
    echo "⚠️  Directory '$DEPLOY_DIR' already exists."
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    rm -rf "$DEPLOY_DIR"
fi

mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

echo "📥 Downloading deployment files..."

# Download required files
FILES=(
    "docker-compose.yml"
    "env.secrets.example"
    "deploy.sh"
)

for file in "${FILES[@]}"; do
    echo "  - $file"
    curl -fsSL "$REPO_BASE/$file" -o "$file"
done

# Make deploy.sh executable
chmod +x deploy.sh

echo ""
echo "✅ Deployment files downloaded successfully!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Enter the deployment directory:"
echo "   cd $DEPLOY_DIR"
echo ""
echo "2. Configure your secrets:"
echo "   cp env.secrets.example .env"
echo "   nano .env  # Edit with your configuration"
echo ""
echo "3. For production deployment:"
echo "   Set IMAGE_NAME=chenxiaoyao6228/idea-forge:latest in .env"
echo "   ./deploy.sh"
echo ""
echo "   For local testing (if you built your own image):"
echo "   Set SKIP_PULL=true and IMAGE_NAME=idea-forge:latest in .env"
echo "   ./deploy.sh"
echo ""
echo "📖 Configuration note:"
echo "   - Docker image includes .env.example with 50+ safe defaults"
echo "   - You only configure secrets in .env (~20 variables)"
echo "   - No duplication - single source of truth!"
echo ""
echo "📖 Full deployment guide:"
echo "   https://github.com/chenxiaoyao6228/idea-forge/blob/master/docs/development/EN/deployment.md"
echo ""
echo "Complete example:"
echo "  cd $DEPLOY_DIR"
echo "  cp env.secrets.example .env"
echo "  nano .env  # Fill in your secrets and IMAGE_NAME"
echo "  ./deploy.sh"

exit 0
