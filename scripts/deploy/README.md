# Deployment Scripts

This directory contains scripts and configurations for deploying Idea Forge in different environments.

## Quick Reference

### 📦 Files Overview

| File | Purpose |
|------|---------|
| `docker-compose.yml` | **Universal** deployment configuration (production + local testing) |
| `env.secrets.example` | **Universal** configuration template (production + local testing) |
| `deploy.sh` | General deployment script (production/test) |
| `deploy-local.sh` | Local testing script with isolated ports + MinIO |
| `docker-compose.dev.yml` | Legacy reference (not used anymore) |

**Key Improvements:** 🎉
- **One `docker-compose.yml`** for all scenarios (production + local testing)
- **One `env.secrets.example`** for all scenarios (just copy to `.env` or `.env.local`)
- Production: Regular services (postgres, redis)
- Local testing: Add `--profile local-testing` to enable MinIO + auto-uses different ports

### 🔧 How It Works

The unified `docker-compose.yml` uses environment variables and profiles:

**Environment Variables:**
- All ports configurable: `API_PORT`, `POSTGRES_PORT`, `REDIS_PORT`, etc.
- `NODE_ENV` controls volume names (prod/test/local)
- `BUILD_CONTEXT` enables local builds (set to `../..` for local testing)
- `IMAGE_NAME` specifies which image to use

**Docker Compose Profiles:**
- Default: Only postgres + redis (production)
- `local-testing` profile: Adds MinIO for S3-compatible storage

**Configuration Files:**
- **Single `.env` file** for everything! Copy from `env.secrets.example`
- For production: Use with `deploy.sh` (uses default ports 5000+)
- For local testing: Use with `deploy-local.sh` (automatically uses ports 5100+)
- **Same file, different script!** The script you choose determines the ports

## 🚀 Usage Scenarios

### 1. Local Production Testing (Recommended)

**Use Case:** Test your Docker build locally without port conflicts

```bash
# Build image
docker build -t idea-forge:latest ../..

# Configure (same file as production!)
cp env.secrets.example .env
nano .env  # Update:
  # - SKIP_PULL=true
  # - IMAGE_NAME=idea-forge:latest
  # - BUILD_CONTEXT=../..
  # - All secrets

# Deploy with isolated ports
./deploy-local.sh

# Access at http://localhost:5100
```

**Ports Used:** 5100 (API), 5101 (WS), 5532 (PostgreSQL), 6479 (Redis), 9100/9101 (MinIO)
- Automatically set by `deploy-local.sh` (can override in `.env` if needed)

**Includes:** PostgreSQL, Redis, MinIO (S3-compatible storage)

### 2. Remote Production Deployment

**Use Case:** Deploy to your server with Docker Hub images

```bash
# Configure
cp env.secrets.example .env
# Edit .env with your secrets

# Deploy
./deploy.sh
```

**Ports Used:** 5000 (API), 5001 (WS), 5432 (PostgreSQL), 6379 (Redis)

**Uses:** `chenxiaoyao6228/idea-forge:latest` from Docker Hub

### 3. Local Testing with Production Ports (Advanced)

**Use Case:** Test locally with exact production configuration

```bash
# Configure
cp env.secrets.example .env
# Set SKIP_PULL=true, IMAGE_NAME=idea-forge:latest, BUILD_CONTEXT=../..

# Deploy (without profiles, no MinIO)
./deploy.sh
```

**⚠️ Warning:** Requires stopping dev environment (port conflicts!)

### 4. Manual Docker Compose Commands

Since we use a single `docker-compose.yml`, you can use standard Docker Compose commands:

```bash
# Production deployment (no MinIO)
docker compose -f docker-compose.yml up -d

# Local testing with MinIO
docker compose --profile local-testing -f docker-compose.yml up -d

# Build and deploy locally
docker compose --profile local-testing -f docker-compose.yml up -d --build
```

## 🎯 Port Comparison

| Service | Development | Local Test (Isolated) | Production |
|---------|-------------|----------------------|------------|
| API | 5000 | **5100** | 5000 |
| WebSocket | 5001 | **5101** | 5001 |
| PostgreSQL | 5432 | **5532** | 5432 |
| Redis | 6379 | **6479** | 6379 |
| MinIO API | 9000 | **9100** | N/A |
| MinIO Console | 9001 | **9101** | N/A |

## 📝 Environment Variables

### For Local Testing (`.env.local`)

Key settings:
- `NODE_ENV=production`
- `IMAGE_NAME=idea-forge:latest`
- `SKIP_PULL=true` (uses local image)
- Custom ports (5100, 5101, etc.)

### For Production (`.env`)

Key settings:
- `NODE_ENV=production`
- `IMAGE_NAME=chenxiaoyao6228/idea-forge:latest`
- All secrets (SESSION_SECRET, JWT_SECRET, etc.)
- OAuth credentials
- OSS/S3 credentials

## 🛠️ Common Commands

### Local Testing

```bash
# Deploy
./deploy-local.sh

# Rebuild and deploy
./deploy-local.sh --build

# View logs
./deploy-local.sh --logs

# Clean up
./deploy-local.sh --clean
```

### Production

```bash
# Deploy/update
./deploy.sh

# View logs
docker compose -f docker-compose.yml logs -f

# Stop services
docker compose -f docker-compose.yml down

# Restart
docker compose -f docker-compose.yml restart
```

## 📚 Documentation

For detailed documentation, see:
- [Deployment Guide](../../docs/development/EN/deployment.md)
- [Docker Development Guide](../../docs/development/EN/docker.md)

## 🔒 Security Notes

- **Never commit** `.env` or `.env.local` files (contain secrets)
- Use strong secrets: `openssl rand -base64 32`
- For production, always use HTTPS with a reverse proxy (Nginx)
- Restrict database ports (don't expose publicly)

## 🐛 Troubleshooting

### Port Already in Use

**For local testing:** Use `deploy-local.sh` which uses isolated ports

**For production ports:** Stop conflicting services:
```bash
# Check what's using the port
lsof -i :5000

# Stop development environment
# Or use deploy-local.sh instead
```

### Image Not Found

**Local testing:** Build the image first:
```bash
docker build -t idea-forge:latest ../..
```

**Production:** Check Docker Hub connection:
```bash
docker pull chenxiaoyao6228/idea-forge:latest
```

### Database Connection Failed

Check PostgreSQL is running:
```bash
docker compose -f docker-compose.local.yml ps postgres
docker compose -f docker-compose.local.yml logs postgres
```

### MinIO Not Accessible

MinIO is only available in local testing setup:
- API: http://localhost:9100
- Console: http://localhost:9101
- Credentials: minioadmin/minioadmin

## 💡 Tips

1. **First time?** Use `deploy-local.sh` - it's the easiest way to test
2. **Development running?** No problem! `deploy-local.sh` uses different ports
3. **Building for China?** Use proxy: `HTTP_PROXY=http://127.0.0.1:7890 docker build ...`
4. **Need S3 storage?** Local testing includes MinIO automatically
5. **Testing migrations?** Each deployment runs migrations automatically

## 📧 Support

- [GitHub Issues](https://github.com/chenxiaoyao6228/idea-forge/issues)
- [Documentation](../../docs/development/EN/deployment.md)
