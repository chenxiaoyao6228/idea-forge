#!/bin/bash

# =============================================================================
# Prisma Migration Check Script
# =============================================================================
# This script checks if there are schema changes that haven't been migrated.
# It's designed to run as a pre-push hook to prevent pushing code that uses
# 'db push' without creating a proper migration.
#
# The script compares the current schema against the last migration to detect
# if there are pending changes that need a migration file.
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

# Check if we're pushing to main/master branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
REMOTE_REF=$(git rev-parse --abbrev-ref @{push} 2>/dev/null || echo "")

# Extract target branch from remote ref (e.g., origin/main -> main)
TARGET_BRANCH=""
if [ -n "$REMOTE_REF" ]; then
    TARGET_BRANCH=$(echo "$REMOTE_REF" | sed 's/.*\///')
fi

# Only run check when pushing to main/master or when merging
if [[ "$TARGET_BRANCH" != "main" && "$TARGET_BRANCH" != "master" && "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
    echo -e "${BLUE}ℹ️  Skipping migration check (not pushing to main/master)${NC}"
    exit 0
fi

echo -e "${BLUE}🔍 Checking for pending Prisma schema changes...${NC}"

# Check if schema.prisma has uncommitted changes
if git diff --name-only HEAD | grep -q "prisma/schema.prisma"; then
    echo -e "${YELLOW}⚠️  Warning: schema.prisma has uncommitted changes${NC}"
fi

# Use prisma migrate diff to check for schema drift
# This compares the schema file against the migrations directory
cd "$PROJECT_ROOT/apps/api"

# Create a temporary file to capture output
DIFF_OUTPUT=$(mktemp)

# Run prisma migrate diff (comparing migrations to schema)
# Exit code 0 = no diff, Exit code 2 = has diff
set +e
npx prisma migrate diff \
    --from-migrations ./prisma/migrations \
    --to-schema-datamodel ./prisma/schema.prisma \
    --exit-code > "$DIFF_OUTPUT" 2>&1
DIFF_EXIT_CODE=$?
set -e

if [ $DIFF_EXIT_CODE -eq 2 ]; then
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ Pending Prisma schema changes detected!${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}It looks like you used 'prisma db push' without creating a migration.${NC}"
    echo -e "${YELLOW}Before pushing to main/master, please create a migration:${NC}"
    echo ""
    echo -e "  ${BLUE}cd apps/api${NC}"
    echo -e "  ${BLUE}npx prisma migrate dev --name <migration_name>${NC}"
    echo ""
    echo -e "${YELLOW}Schema diff:${NC}"
    cat "$DIFF_OUTPUT"
    echo ""
    rm -f "$DIFF_OUTPUT"
    exit 1
elif [ $DIFF_EXIT_CODE -eq 1 ]; then
    # Error running the command (e.g., no database connection)
    echo -e "${YELLOW}⚠️  Could not verify migration status (database not accessible)${NC}"
    echo -e "${YELLOW}   Make sure to create migrations before merging to main${NC}"
    rm -f "$DIFF_OUTPUT"
    exit 0
else
    echo -e "${GREEN}✅ Schema is in sync with migrations${NC}"
    rm -f "$DIFF_OUTPUT"
    exit 0
fi
