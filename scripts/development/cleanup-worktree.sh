#!/bin/bash

# =============================================================================
# Git Worktree Cleanup Script
# =============================================================================
# This script removes a git worktree and cleans up all associated Docker resources
#
# Usage: ./scripts/development/cleanup-worktree.sh <branch-name>
# Example: ./scripts/development/cleanup-worktree.sh feat-auth
#
# This will:
#   1. Stop and remove Docker containers for this worktree
#   2. Remove Docker volumes (data will be lost!)
#   3. Remove the worktree directory
#   4. Prune the git worktree reference
# =============================================================================

set -e  # Exit on error

# Parse arguments
FORCE_FLAG=false
BRANCH_NAME=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --force|-f)
            FORCE_FLAG=true
            shift
            ;;
        *)
            BRANCH_NAME=$1
            shift
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validate arguments
if [ -z "$BRANCH_NAME" ]; then
    echo -e "${RED}❌ Error: Missing required argument${NC}"
    echo ""
    echo "Usage: ./scripts/development/cleanup-worktree.sh [--force|-f] <branch-name>"
    echo ""
    echo "Options:"
    echo "  --force, -f    Skip confirmation prompts"
    echo ""
    echo "Examples:"
    echo "  ./scripts/development/cleanup-worktree.sh feat-auth"
    echo "  ./scripts/development/cleanup-worktree.sh --force feat-auth"
    exit 1
fi

# Get the project root (two levels up from this script's location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

WORKTREE_DIR="${PROJECT_ROOT}/../idea-forge-${BRANCH_NAME}"

# Check if worktree directory exists
if [ ! -d "$WORKTREE_DIR" ]; then
    echo -e "${YELLOW}⚠️  Warning: Worktree directory not found: $WORKTREE_DIR${NC}"

    if [ "$FORCE_FLAG" = false ]; then
        echo ""
        read -p "Do you want to continue with cleanup anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Cleanup cancelled."
            exit 0
        fi
    else
        echo "   (--force flag set, continuing...)"
    fi
fi

echo -e "${BLUE}🧹 Cleaning up worktree '${BRANCH_NAME}'...${NC}"
echo ""

# Confirm deletion
if [ "$FORCE_FLAG" = false ]; then
    echo -e "${YELLOW}⚠️  WARNING: This will delete all Docker data for this worktree!${NC}"
    echo -e "${YELLOW}   - Docker containers will be stopped and removed${NC}"
    echo -e "${YELLOW}   - Docker volumes (databases, files) will be deleted${NC}"
    echo -e "${YELLOW}   - Worktree directory will be removed${NC}"
    echo ""
    read -p "Are you sure you want to continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cleanup cancelled."
        exit 0
    fi
else
    echo -e "${YELLOW}⚠️  Force mode: Skipping confirmation${NC}"
fi

echo ""

# Stop and remove Docker containers and volumes
if [ -d "$WORKTREE_DIR" ]; then
    echo -e "${BLUE}🐳 Stopping and removing Docker services...${NC}"

    # Export WORKTREE_ID for docker-compose
    export WORKTREE_ID=$BRANCH_NAME

    # Stop and remove containers, networks, and volumes using full path to compose file
    docker compose -f "${PROJECT_ROOT}/docker-compose-dev.worktree.yml" down -v 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Docker containers may not be running${NC}"
    }

    echo -e "${GREEN}✅ Docker services cleaned up${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping Docker cleanup (worktree directory not found)${NC}"
fi

# Additional cleanup: Remove any leftover volumes manually
echo -e "${BLUE}🗑️  Removing Docker volumes...${NC}"
docker volume rm ideaforge-${BRANCH_NAME}-postgres-data 2>/dev/null || true
docker volume rm ideaforge-${BRANCH_NAME}-redis-data 2>/dev/null || true
docker volume rm ideaforge-${BRANCH_NAME}-minio-data 2>/dev/null || true

echo ""
echo -e "${BLUE}🌳 Removing git worktree...${NC}"

# Change to project root for git operations
cd "${PROJECT_ROOT}"

# Remove worktree
if [ -d "$WORKTREE_DIR" ]; then
    git worktree remove "${WORKTREE_DIR}" --force 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Failed to remove worktree via git command${NC}"
        echo -e "${BLUE}   Attempting manual cleanup...${NC}"
        rm -rf "${WORKTREE_DIR}"
        git worktree prune
    }
else
    # If directory doesn't exist, just prune the worktree reference
    git worktree prune
fi

# Delete the branch
echo -e "${BLUE}🗑️  Deleting git branch '${BRANCH_NAME}'...${NC}"
if git show-ref --verify --quiet refs/heads/${BRANCH_NAME}; then
    git branch -D ${BRANCH_NAME} 2>/dev/null && echo "   ✓ Branch deleted" || echo "   ⚠️  Failed to delete branch"
else
    echo "   ℹ️  Branch doesn't exist (already deleted)"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Worktree '${BRANCH_NAME}' cleaned up successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "   ✓ Docker containers stopped and removed"
echo "   ✓ Docker volumes deleted"
echo "   ✓ Worktree directory removed"
echo "   ✓ Git branch deleted"
echo "   ✓ Git references cleaned up"
echo ""
