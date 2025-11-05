# Idea Forge Deployment Guide

Complete guide for deploying Idea Forge in production, testing, and local development environments.

## Table of Contents

- [Quick Start for Self-Hosters](#quick-start-for-self-hosters)
- [Local Development & Testing](#local-development--testing)
- [Production Deployment](#production-deployment)
- [Configuration](#configuration)
- [Useful Commands](#useful-commands)
- [Troubleshooting](#troubleshooting)

---

## Quick Start for Self-Hosters

### Option 1: One-Line Install (No Git Clone Needed!)

```bash
curl -fsSL https://raw.githubusercontent.com/chenxiaoyao6228/idea-forge/master/scripts/deploy/deploy-quick-start.sh | bash
```

This downloads only the deployment files (~10KB) without cloning the full repository.

TODO: consider Multi-Registry Support such as github 

### Option 2: Full Repository Clone

```bash
git clone https://github.com/chenxiaoyao6228/idea-forge
cd idea-forge/scripts/deploy

# Configure and deploy
cp env.secrets.example .env
# Edit .env with your values
# Set IMAGE_NAME=chenxiaoyao6228/idea-forge:latest
./deploy.sh
```

---

## Local Development & Testing

### Build and Test Docker Image Locally

If you're developing Idea Forge and want to test your Docker image locally before pushing:

#### Step 1: Verify Production Build (Recommended)

**Before building the Docker image**, verify your production build works locally to catch issues early and save time:

```bash
# From project root directory
./scripts/development/verify-production-build.sh
```

**What this does:**
- ✅ Builds the production bundle locally (without Docker)
- ✅ Starts the server with proper environment loading
- ✅ Verifies health endpoints work correctly
- ✅ Confirms all dependencies are bundled
- ✅ Tests the actual build that will run in Docker
- ✅ Takes ~2-3 minutes vs 5-10 minutes for Docker build

**Requirements:**
- PostgreSQL and Redis running locally (via Docker or native)
- `.env` file configured in project root

If the verification fails, fix the issues before building the Docker image. This saves you from wasting time on failed Docker builds!

#### Step 2: Build the Docker Image

```bash
# From project root directory
docker build -t idea-forge:latest .
```

This builds the Docker image on your local machine (~5-10 minutes depending on your system).

**Network Issues?** If you're in China or behind a firewall and encounter Docker registry issues, see the **[Docker Development Guide](./docker.md)** for comprehensive proxy configuration instructions.

#### Step 3: Configure for Local Deployment

```bash
# Copy the secrets template (same file used for production!)
cp scripts/deploy/env.secrets.example scripts/deploy/.env

# Edit .env file
nano scripts/deploy/.env  # or vim, code, etc.
```

**Required changes in `.env` for local testing:**

1. **Enable local image mode** (uncomment and set to true):
   ```bash
   SKIP_PULL=true                           # Don't pull from Docker Hub, use local image
   ```

2. **Set local image name**:
   ```bash
   IMAGE_NAME=idea-forge:latest             # Use locally built image
   ```

3. **Update secrets** (or leave defaults for testing):
   ```bash
   POSTGRES_PASSWORD=123456                 # Test database password
   SESSION_SECRET=local_test_session_secret # Test secret (change for production!)
   JWT_SECRET=local_test_jwt_secret         # Test secret (change for production!)
   REFRESH_TOKEN_SECRET=local_test_refresh  # Test secret (change for production!)
   COLLAB_SECRET_KEY=local_test_collab      # Test secret (change for production!)
   ```

**⚠️ Key Difference from Production:**
- **Local:** `SKIP_PULL=true` + `IMAGE_NAME=idea-forge:latest` (uses your local build)
- **Production:** `SKIP_PULL` commented out + `IMAGE_NAME=chenxiaoyao6228/idea-forge:latest` (pulls from Docker Hub)

#### Step 4: Deploy Locally

```bash
# Deploy using the deployment script
cd scripts/deploy
./deploy.sh
```

#### Step 5: Access the Application

Once deployed:
- **Application**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health
- **API**: http://localhost:5000/api
- **WebSocket**: ws://localhost:5001/collaboration

#### Managing Local Deployment

```bash
# View logs
docker compose -f scripts/deploy/docker-compose.yml logs -f

# Stop services
docker compose -f scripts/deploy/docker-compose.yml down

# Stop and remove all data (⚠️ deletes database!)
docker compose -f scripts/deploy/docker-compose.yml down -v

# Restart services
docker compose -f scripts/deploy/docker-compose.yml restart
```

**Benefits of Local Testing:**
- ✅ Test the exact same Docker image that will run in production
- ✅ Catch issues before pushing to GitHub
- ✅ Fast iteration - rebuild and test immediately
- ✅ Uses the same `env.secrets.example` file as production
- ✅ Separate volumes from production/test

**Configuration Architecture:**

The Docker image uses a **layered configuration approach**:

```
Container Startup Flow:
1. Container starts with .env.example (baked into image)
   ↓
2. Startup script copies .env.example → .env (if .env doesn't exist)
   ↓
3. Docker Compose environment variables override .env values
```

**This means for deployment:**
- ✅ You only need to override **secrets** and **deployment-specific values** in `.env` file
- ✅ All other configuration (ports, URLs, feature flags) is inherited from `.env.example` in the container
- ✅ You don't need to duplicate the entire configuration
- ✅ Same `env.secrets.example` file for both local and production

---

## Production Deployment

### Deployment Workflow Overview

The production deployment follows this workflow:

1. **Local Development** → Test changes locally with development servers
2. **Local Docker Build** → Build and test Docker image locally (`make local-test-deploy`)
3. **Push to GitHub** → Push changes to `master` branch
4. **GitHub Actions** → Automatically builds and pushes to Docker Hub (`chenxiaoyao6228/idea-forge:latest`)
5. **Server Deployment** → Pull and deploy the new image on your server

### Prerequisites

- Docker and Docker Compose installed
- Server with public IP or domain name
- SSL certificate (recommended for production)
- Docker Hub account (for automatic builds)

### Step-by-Step Deployment

#### 1. Test Locally First

Before deploying to production, always test locally:

```bash
# Step 1: Verify production build (RECOMMENDED - saves time!)
./scripts/development/verify-production-build.sh

# Step 2: Build Docker image locally
docker build -t idea-forge:latest .

# Step 3: Configure for local testing
cp scripts/deploy/env.secrets.example scripts/deploy/.env
# Edit .env: Set SKIP_PULL=true, IMAGE_NAME=idea-forge:latest, update secrets

# Step 4: Deploy and test
cd scripts/deploy
./deploy.sh

# Step 5: Verify http://localhost:5000 works correctly
```

#### 2. Push to Trigger Remote Build

Once local testing passes:

```bash
# Commit your changes
git add .
git commit -m "Your commit message"

# Push to master branch (triggers GitHub Actions)
git push origin master
```

**GitHub Actions will automatically:**
- Build the Docker image
- Run tests (if configured)
- Push to Docker Hub as `chenxiaoyao6228/idea-forge:latest`

Monitor the build at: https://github.com/chenxiaoyao6228/idea-forge/actions

#### 3. Deploy on Server

Once GitHub Actions completes:

**Option A: Get Deployment Files (First Time)**

Choose one of the methods from [Quick Start](#quick-start-for-self-hosters) above.

**Option B: Update Existing Deployment**

If you already have the deployment files:

```bash
cd /path/to/deployment/scripts/deploy

# Pull latest image and deploy
./deploy.sh
```

#### 4. Configure Environment (First Time Only)

```bash
# On your server, in scripts/deploy/ directory

# Copy the template
cp env.secrets.example .env

# Edit with your actual values
nano .env  # or vim, code, etc.
```

**Required Configuration in .env:**
- `IMAGE_NAME=chenxiaoyao6228/idea-forge:latest`
- `NODE_ENV=production`
- Database credentials (`POSTGRES_USER`, `POSTGRES_PASSWORD`)
- Session/JWT secrets (generate with `openssl rand -base64 32`)
- OAuth credentials (Google, GitHub)
- Email service (Resend API key)
- Storage (OSS/S3 credentials)
- Domain URLs (`CLIENT_APP_URL`, `CLIENT_COLLAB_WS_URL`)

#### 5. Deploy

```bash
# Make deploy script executable (first time only)
chmod +x deploy.sh

# Deploy
./deploy.sh
```

The script will:
1. Pull latest Docker image from Docker Hub (if SKIP_PULL is not true)
2. Stop old containers
3. Start database services (PostgreSQL, Redis)
4. Run database migrations automatically
5. Start application services
6. Show service status and logs

#### 6. Verify Deployment

```bash
# Check service status
docker compose -f docker-compose.yml ps

# View logs
docker compose -f docker-compose.yml logs -f idea-forge

# Test API health
curl http://your-domain.com/api/health

# Test application (should return HTML)
curl http://your-domain.com/
```

---

## Configuration

### Environment Files

| File | Purpose | Usage |
|------|---------|-------|
| `env.secrets.example` | Template for all environments | Copy to `.env` and configure |
| `.env` | Active configuration (gitignored) | Used by deploy.sh |
| `docker-compose.yml` | Production deployment | Used by deploy.sh |
| `docker-compose-dev.yml` | Local development | Used by development setup |

### Configuration Strategy

Idea Forge uses a **layered configuration** approach:

```
Priority (highest to lowest):
1. Docker environment variables (from .env via deploy.sh)
   ↓
2. .env file (auto-created from .env.example at container startup)
   ↓
3. .env.example defaults (embedded in Docker image)
```

**This means:**
- ✅ You only need to specify **secrets** and **environment-specific values**
- ✅ All other values use safe defaults from `.env.example`
- ✅ Docker image contains NO secrets (safe to publish publicly)

### Docker Images

| Branch | Docker Tag | Purpose |
|--------|-----------|---------|
| `master` | `latest` | Production-ready releases |
| `test` | `test` | Test environment |

Images are automatically built and pushed by GitHub Actions when code is merged.

---

## Useful Commands

### Viewing Logs

```bash
cd scripts/deploy

# Follow all logs
docker-compose logs -f

# Follow specific service
docker-compose logs -f idea-forge

# Last 100 lines
docker-compose logs --tail=100 idea-forge
```

### Service Management

```bash
cd scripts/deploy

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Restart specific service
docker-compose restart idea-forge

# Check status
docker-compose ps

# Pull latest image
docker-compose pull idea-forge
```

### Database Operations

```bash
cd scripts/deploy

# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d ideaforge

# Run migrations manually
docker-compose exec idea-forge sh -c "cd apps/api && npx prisma migrate deploy"

# Check migration status
docker-compose exec idea-forge sh -c "cd apps/api && npx prisma migrate status"

# Backup database
docker-compose exec postgres pg_dump -U postgres ideaforge > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres ideaforge < backup.sql
```

### Redis Operations

```bash
cd scripts/deploy

# Access Redis CLI
docker-compose exec redis redis-cli

# Check Redis keys
docker-compose exec redis redis-cli KEYS '*'

# Flush all Redis data (careful!)
docker-compose exec redis redis-cli FLUSHALL
```

---

## Troubleshooting

### Container Won't Start

```bash
cd scripts/deploy

# Check logs for errors
docker-compose logs idea-forge

# Check if ports are already in use
netstat -tuln | grep 5000
netstat -tuln | grep 5001

# Check Docker resources
docker system df
docker system prune  # Clean up if needed
```

### Database Connection Issues

```bash
cd scripts/deploy

# Check PostgreSQL health
docker-compose ps postgres

# Test connection
docker-compose exec postgres pg_isready -U postgres -d ideaforge

# Check DATABASE_URL
grep DATABASE_URL .env
```

### Migration Failures

```bash
cd scripts/deploy

# Check current migration status
docker-compose exec idea-forge sh -c "cd apps/api && npx prisma migrate status"

# Reset to a specific migration (dangerous!)
docker-compose exec idea-forge sh -c "cd apps/api && npx prisma migrate resolve --rolled-back <migration_name>"

# Force re-run migrations
docker-compose exec idea-forge sh -c "cd apps/api && npx prisma migrate deploy"
```

### Image Pull Fails

```bash
# Check Docker Hub connection
docker pull chenxiaoyao6228/idea-forge:latest

# Check if image exists
docker images | grep idea-forge

# Try with specific tag
docker pull chenxiaoyao6228/idea-forge:test
```

### Application Errors

```bash
cd scripts/deploy

# Check application logs
docker-compose logs --tail=200 idea-forge

# Check health endpoint
curl http://localhost:5000/health

# Enter container for debugging
docker-compose exec idea-forge sh

# Check environment variables inside container
docker-compose exec idea-forge env | grep -E "DATABASE_URL|REDIS_HOST|NODE_ENV"
```

### Performance Issues

```bash
cd scripts/deploy

# Check container resource usage
docker stats

# Check PostgreSQL connections
docker-compose exec postgres psql -U postgres -d ideaforge -c "SELECT count(*) FROM pg_stat_activity;"

# Check Redis memory
docker-compose exec redis redis-cli INFO memory
```

---

## Data Persistence

### Docker Volumes

Data is persisted using named Docker volumes:

**Test Environment:**
- `ideaforge_production_postgres_data` - PostgreSQL database
- `ideaforge_production_redis_data` - Redis data

**Production Environment:**
- `ideaforge_production_postgres_data` - PostgreSQL database
- `ideaforge_production_redis_data` - Redis data

### Backup Strategy

```bash
cd scripts/deploy

# Backup PostgreSQL
docker-compose exec postgres pg_dump -U postgres ideaforge | gzip > backup-$(date +%Y%m%d).sql.gz

# Backup volumes (alternative method)
docker run --rm -v ideaforge_production_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-volume-backup.tar.gz -C /data .

# List all Idea Forge volumes
docker volume ls | grep ideaforge
```

---

## Security Notes

### ⚠️ Important Security Practices

- ✅ **Never commit** `.env` files (they contain secrets)
- ✅ **Generate strong secrets** using `openssl rand -base64 32`
- ✅ **Use HTTPS** in production (configure reverse proxy like Nginx)
- ✅ **Restrict PostgreSQL port** (5432) - don't expose publicly
- ✅ **Enable firewall** - only allow necessary ports (80, 443)
- ✅ **Regular updates** - pull latest images weekly
- ✅ **Monitor logs** for suspicious activity

### Docker Image Security

- ✅ Docker image contains **NO secrets** (safe to publish)
- ✅ All sensitive data provided at runtime via environment variables
- ✅ `.env.example` in image contains only safe defaults

---

## Support & Resources

- **Documentation:** [Main README](../../../README.md)
- **Issues:** [GitHub Issues](https://github.com/chenxiaoyao6228/idea-forge/issues)
- **Discussions:** [GitHub Discussions](https://github.com/chenxiaoyao6228/idea-forge/discussions)

---

## Advanced Topics

### Custom Nginx Configuration

For production deployments, use Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /collaboration {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

### Environment-Specific Volumes

Volumes are automatically named based on `NODE_ENV`:
- `ideaforge_${NODE_ENV}_postgres_data`
- `ideaforge_${NODE_ENV}_redis_data`

This ensures test and production data never mix.

### Scaling

For horizontal scaling, you'll need:
1. External PostgreSQL (managed database)
2. External Redis (managed cache)
3. Load balancer (Nginx, HAProxy)
4. Update `env.production` with external service URLs

## License

This project is licensed under [LICENSE](../../../LICENSE).
