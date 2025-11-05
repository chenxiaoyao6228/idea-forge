# Development Guide

This guide will help you get started with developing Idea Forge, covering both normal single-branch development and parallel development using git worktrees.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Normal Development Mode](#normal-development-mode)
- [Git Worktree Mode (Parallel Development)](#git-worktree-mode-parallel-development)
- [Common Development Tasks](#common-development-tasks)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+
- **pnpm** 8.5.1+
- **Docker Desktop** (for PostgreSQL, Redis, MinIO)
- **Git** 2.5+ (for worktree support)

---

## Normal Development Mode

This is the standard workflow for working on a single feature at a time.

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd idea-forge
   ```

2. **Install dependencies and set up services:**
   ```bash
   pnpm install
   pnpm run setup
   ```

   This will:
   - Install all npm packages
   - Copy `.env.example` to `.env`
   - Start Docker services (PostgreSQL, Redis, MinIO)
   - Create MinIO bucket
   - Run database migrations

3. **Development servers auto-start with hot-reload**
   - **DO NOT** manually run `pnpm dev` commands
   - Servers automatically restart when you make changes
   - If you need to restart manually, kill the process and it will auto-restart

### Default Ports

| Service | Port | URL |
|---------|------|-----|
| API Server | 5000 | http://localhost:5000 |
| WebSocket Server | 5001 | ws://localhost:5001 |
| Vite Dev Server | 5173 | http://localhost:5173 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| MinIO | 9000 | http://localhost:9000 |
| MinIO Console | 9001 | http://localhost:9001 |

### Common Commands

```bash
# Type checking
pnpm -F @idea/client typecheck
pnpm -F @idea/api typecheck

# Linting and formatting
pnpm lint              # Check for issues
pnpm lint:fix          # Auto-fix issues
pnpm format            # Check formatting
pnpm format:fix        # Apply formatting

# Database operations
pnpm prisma:push       # Push schema changes
pnpm prisma:studio     # Open database GUI
pnpm migrate:dev       # Create and run migration

# Testing
pnpm test              # Run all tests
pnpm test:e2e          # Run E2E tests
pnpm -F @idea/api test:unit   # API unit tests
pnpm -F @idea/api test:int    # API integration tests

# Build
pnpm build             # Build all packages

# Production Build Verification (before Docker build)
./scripts/development/verify-production-build.sh
```

### Typical Workflow

1. **Create a feature branch:**
   ```bash
   git checkout -b feat-my-feature
   ```

2. **Make your changes**
   - Edit code (servers auto-reload)
   - Run type checks: `pnpm -F @idea/api typecheck`
   - Run tests: `pnpm test`

3. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: add my awesome feature"
   ```

4. **Push and create PR:**
   ```bash
   git push origin feat-my-feature
   # Then create a pull request on GitHub
   ```

---

## Git Worktree Mode (Parallel Development)

Use git worktrees when you need to work on **multiple features simultaneously** without switching branches or dealing with port conflicts.

### What is a Git Worktree?

A git worktree allows you to have multiple working directories (branches) checked out at the same time, all sharing the same `.git` directory. Each worktree:

- Has its own isolated Docker services (database, Redis, MinIO)
- Uses unique ports to avoid conflicts
- Maintains independent development environment
- Shares git history with the main repository

### When to Use Worktrees

✅ **Use worktrees when:**
- Working on multiple features in parallel
- Testing feature interactions before merging
- Reviewing PRs while continuing development
- Avoiding frequent branch switching

❌ **Don't use worktrees when:**
- Working on a single feature (use normal mode)
- Just starting out (master normal workflow first)
- Low on disk space (each worktree needs ~2GB)

### Port Allocation Strategy

Each worktree uses a `PORT_OFFSET` to calculate unique ports:

| Worktree | PORT_OFFSET | API | WS | Vite | PostgreSQL | Redis | MinIO | MinIO Console |
|----------|-------------|-----|----|----- |------------|-------|-------|---------------|
| main | 0 | 5000 | 5001 | 5173 | 5432 | 6379 | 9000 | 9001 |
| worktree-1 | 100 | 5100 | 5101 | 5273 | 5532 | 6479 | 9100 | 9101 |
| worktree-2 | 200 | 5200 | 5201 | 5373 | 5632 | 6579 | 9200 | 9201 |
| worktree-3 | 300 | 5300 | 5301 | 5473 | 5732 | 6679 | 9300 | 9301 |
| worktree-4 | 400 | 5400 | 5401 | 5573 | 5832 | 6779 | 9400 | 9401 |

**Port Calculation Formula:**
```
API Port = 5000 + PORT_OFFSET
WebSocket Port = 5001 + PORT_OFFSET
Vite Port = 5173 + PORT_OFFSET
PostgreSQL Port = 5432 + PORT_OFFSET
Redis Port = 6379 + PORT_OFFSET
MinIO Port = 9000 + PORT_OFFSET
MinIO Console Port = 9001 + PORT_OFFSET
```

### Creating a Worktree

**Syntax:**
```bash
./scripts/development/create-worktree.sh <branch-name> <port-offset>
```

**Example - Create a worktree for authentication feature:**
```bash
# From main idea-forge directory
./scripts/development/create-worktree.sh feat-auth 100

# Output shows:
# ✅ Worktree 'feat-auth' created successfully!
# 📍 Port Configuration:
#    API Server:     http://localhost:5100
#    WebSocket:      ws://localhost:5101
#    Vite Dev:       http://localhost:5273
#    PostgreSQL:     localhost:5532
#    ...
```

This will:
1. Create a new git branch `feat-auth`
2. Check it out in a new directory: `../idea-forge-feat-auth`
3. Install all dependencies
4. Create isolated Docker containers with unique names
5. Generate `.env` file with offset ports
6. Run database migrations

### Working in a Worktree

**Open the worktree in a new editor window:**

```bash
# Navigate to the worktree
cd ../idea-forge-feat-auth

# Open in Cursor/VS Code
cursor .
# or
code .
```

**CRITICAL: Dev Servers Don't Auto-Start in Worktrees**

Unlike normal development, you need to **manually start** dev servers in each worktree:

```bash
# Inside the worktree directory
cd ../idea-forge-feat-auth

# Option 1: Start both API and client together
pnpm dev

# Option 2: Start them separately (in different terminals)
# Terminal 1 - API server
pnpm -F @idea/api dev

# Terminal 2 - Client server
pnpm -F @idea/client dev
```

**Important Notes:**

1. **Each worktree needs its own running servers:**
   - The main worktree's servers only serve the main worktree
   - Each worktree must start its own API and client servers
   - Servers read `.env` from their current directory

2. **Each worktree is independent:**
   - Separate database: `ideaforge_feat-auth`
   - Separate Docker containers: `ideaforge-feat-auth-postgres`, etc.
   - Different ports: API on 5100, Vite on 5273
   - Independent dev server processes

3. **Checking which ports are in use:**
   ```bash
   # See all Node/Vite processes with ports
   lsof -i :5000,5100,5200,5300  # API ports
   lsof -i :5173,5273,5373,5473  # Vite ports
   ```

### Developing in Multiple Worktrees

**Scenario: You're working on authentication and payment features simultaneously**

**Terminal 1 - Setup:**
```bash
# Create auth worktree (offset 100)
./scripts/development/create-worktree.sh feat-auth 100

# Create payment worktree (offset 200)
./scripts/development/create-worktree.sh feat-payment 200
```

**Cursor Window 1:**
```bash
cd ../idea-forge-feat-auth
cursor .
# Work on authentication feature
# Access at: http://localhost:5100
```

**Cursor Window 2:**
```bash
cd ../idea-forge-feat-payment
cursor .
# Work on payment feature
# Access at: http://localhost:5200
```

Both features can be developed, tested, and debugged simultaneously without any conflicts!

### Cleaning Up Worktrees

**When you're done with a feature:**

```bash
# Return to main repository
cd ../idea-forge

# Clean up the worktree
./scripts/development/cleanup-worktree.sh feat-auth
```

**⚠️ Warning:** This will:
- Stop and remove Docker containers
- Delete Docker volumes (database data is lost!)
- Remove the worktree directory
- Delete the local branch (if merged)

**The cleanup script will ask for confirmation before proceeding.**

### Worktree Best Practices

1. **Use descriptive branch names:**
   ```bash
   # Good
   ./scripts/development/create-worktree.sh feat-user-auth 100
   ./scripts/development/create-worktree.sh fix-api-timeout 200

   # Avoid
   ./scripts/development/create-worktree.sh test 100
   ./scripts/development/create-worktree.sh temp 200
   ```

2. **Track your worktrees:**
   ```bash
   # List all worktrees
   git worktree list

   # Output example:
   # /Users/you/idea-forge              abc1234 [main]
   # /Users/you/idea-forge-feat-auth    def5678 [feat-auth]
   # /Users/you/idea-forge-feat-payment 9abc012 [feat-payment]
   ```

3. **Monitor Docker resources:**
   ```bash
   # See all running containers
   docker ps

   # Check disk usage
   docker system df
   ```

4. **Clean up unused worktrees regularly:**
   - Each worktree uses ~2GB of disk space
   - Docker volumes accumulate over time
   - Run cleanup scripts for merged features

5. **Don't modify the main worktree while others are active:**
   - Avoid schema changes in main that affect other worktrees
   - Coordinate migrations across worktrees
   - Consider rebasing worktree branches regularly

---

## Common Development Tasks

### Adding a New Feature

**Normal Mode:**
```bash
git checkout -b feat-my-feature
# Make changes
git add .
git commit -m "feat: add my feature"
git push origin feat-my-feature
```

**Worktree Mode:**
```bash
./scripts/development/create-worktree.sh feat-my-feature 100
cd ../idea-forge-feat-my-feature
# Make changes
git add .
git commit -m "feat: add my feature"
git push origin feat-my-feature
cd ../idea-forge
./scripts/development/cleanup-worktree.sh feat-my-feature
```

### Database Schema Changes

**In normal mode or any worktree:**

1. **Edit Prisma schema:**
   ```bash
   # Edit apps/api/prisma/schema.prisma
   ```

2. **Create migration:**
   ```bash
   pnpm migrate:dev
   # Enter migration name when prompted
   ```

3. **Build contracts (important!):**
   ```bash
   pnpm build:contracts
   ```

4. **Type check:**
   ```bash
   pnpm -F @idea/api typecheck
   ```

**Note:** Schema changes in one worktree don't automatically apply to others. You'll need to:
- Pull the changes in other worktrees
- Run `pnpm migrate:dev` or `pnpm prisma:migrate:deploy`

### Running Tests

**All tests:**
```bash
pnpm test
```

**Specific test suites:**
```bash
# API unit tests
pnpm -F @idea/api test:unit

# API integration tests
pnpm -F @idea/api test:int

# Watch mode
pnpm -F @idea/api test:int:watch

# E2E tests
pnpm test:e2e

# E2E with UI
pnpm test:e2e:ui
```

**Run specific test file:**
```bash
pnpm -F @idea/api test:int src/notification/notification-cancellation.int.test.ts
```

### Debugging

**Check server logs:**
```bash
# Follow all logs
tail -f apps/api/logs/app-$(date +%Y-%m-%d).log

# Check error logs only
tail -f apps/api/logs/app-error-$(date +%Y-%m-%d).log

# Search for specific error
grep "ERROR_MESSAGE" apps/api/logs/*.log
```

**Database GUI:**
```bash
pnpm prisma:studio
# Opens at http://localhost:5555
```

**Docker services:**
```bash
# Check running containers
docker ps

# View container logs
docker logs ideaforge-postgres
docker logs ideaforge-redis
docker logs ideaforge-minio

# For worktrees
docker logs ideaforge-feat-auth-postgres
```

---

## Troubleshooting

### Port Already in Use

**Problem:** Can't start services because port is already in use

**Solution:**
```bash
# Find what's using the port
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or use the cleanup script for worktrees
./scripts/development/cleanup-worktree.sh <worktree-name>
```

### CSP (Content Security Policy) Errors

**Problem:** Browser console shows CSP violations blocking Vite

**Solution:**
- The API server caches the `VITE_PORT` on startup
- Restart the API server to pick up the new port
- Kill the Node process and let it auto-restart

### Database Connection Failed

**Problem:** API can't connect to PostgreSQL

**Solution:**
```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# If not running, start Docker services
pnpm dev:docker

# Check connection details in .env
cat .env | grep DATABASE_URL
```

### Migrations Out of Sync

**Problem:** "Migration XYZ has not been applied"

**Solution:**
```bash
# Apply pending migrations
pnpm -F @idea/api prisma:migrate:deploy

# Or reset the database (⚠️ data loss!)
pnpm -F @idea/api prisma:migrate:reset
```

### Worktree Already Exists

**Problem:** Can't create worktree - directory or branch already exists

**Solution:**
```bash
# List all worktrees
git worktree list

# Remove the worktree
git worktree remove <worktree-name>

# Or use the cleanup script
./scripts/development/cleanup-worktree.sh <worktree-name>

# If the branch still exists
git branch -D <branch-name>
```

### Docker Containers Not Starting

**Problem:** Docker services fail to start in worktree

**Solution:**
```bash
# Check if ports are available
lsof -i :<port-number>

# Check Docker status
docker ps -a

# Remove old containers
docker rm -f ideaforge-<worktree-name>-postgres
docker rm -f ideaforge-<worktree-name>-redis
docker rm -f ideaforge-<worktree-name>-minio

# Remove volumes
docker volume rm ideaforge-<worktree-name>-postgres-data
docker volume rm ideaforge-<worktree-name>-redis-data
docker volume rm ideaforge-<worktree-name>-minio-data
```

### TypeScript Errors After Schema Change

**Problem:** TypeScript errors after updating Prisma schema

**Solution:**
```bash
# Rebuild contracts package
pnpm build:contracts

# If still failing, clean and reinstall
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
pnpm install
pnpm build:contracts
```

---

## Quick Reference

### Normal Development Workflow

```bash
# Initial setup
pnpm install && pnpm run setup

# Create feature branch
git checkout -b feat-my-feature

# Make changes (servers auto-reload)

# Type check
pnpm -F @idea/api typecheck
pnpm -F @idea/client typecheck

# Run tests
pnpm test

# Commit and push
git add .
git commit -m "feat: my feature"
git push origin feat-my-feature
```

### Worktree Development Workflow

```bash
# Create worktree
./scripts/development/create-worktree.sh feat-my-feature 100

# Work in new window
cd ../idea-forge-feat-my-feature
cursor .

# Make changes (servers auto-reload)

# Type check
pnpm -F @idea/api typecheck

# Commit and push
git add .
git commit -m "feat: my feature"
git push origin feat-my-feature

# Clean up when done
cd ../idea-forge
./scripts/development/cleanup-worktree.sh feat-my-feature
```

### Essential Commands

```bash
# Type checking
pnpm -F @idea/api typecheck
pnpm -F @idea/client typecheck

# Linting
pnpm lint:fix

# Database
pnpm prisma:studio
pnpm migrate:dev

# Testing
pnpm test
pnpm test:e2e

# Docker
docker ps
docker logs <container-name>

# Worktrees
git worktree list
./scripts/development/create-worktree.sh <branch> <offset>
./scripts/development/cleanup-worktree.sh <branch>
```

---

## Getting Help

- **Documentation:** Check `CLAUDE.md` for detailed architecture and patterns
- **Issues:** Create an issue on GitHub for bugs or feature requests
- **Logs:** Always check `apps/api/logs/` for error details
- **Docker:** Use `docker ps` and `docker logs` to debug service issues

Happy coding! 🚀
