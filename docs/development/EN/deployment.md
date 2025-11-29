# Idea Forge Deployment Guide

Complete guide for deploying Idea Forge for production self-hosting and local testing.

## Table of Contents

- [Production Self-Hosting](#production-self-hosting)
  - [Prerequisites](#prerequisites)
  - [Quick Start](#quick-start)
  - [Environment Configuration](#environment-configuration)
  - [Nginx Setup](#nginx-setup)
  - [Storage Configuration](#storage-configuration)
  - [Deployment & Verification](#deployment--verification)
  - [Maintenance & Operations](#maintenance--operations)
- [Local Testing](#local-testing)
  - [Quick Start (Isolated Ports)](#quick-start-isolated-ports)
  - [Alternative: Production Ports](#alternative-production-ports)

---

## Production Self-Hosting

Deploy Idea Forge on your own server with your custom domain.

### Prerequisites

- **Server**: Linux server (Ubuntu 20.04+ recommended)
- **Domain**: Custom domain with DNS configured
- **Docker**: Docker and Docker Compose installed
- **Ports**: 80, 443 available (22 for SSH)

### Quick Start

#### Option 1: One-Line Install (Recommended)

Download deployment files without cloning the full repository:

```bash
curl -fsSL https://raw.githubusercontent.com/chenxiaoyao6228/idea-forge/master/scripts/deploy/deploy-quick-start.sh | bash
```

This downloads only deployment files (~10KB) to `~/idea-forge-deploy/`.

#### Option 2: Full Repository Clone

```bash
git clone https://github.com/chenxiaoyao6228/idea-forge
cd idea-forge/scripts/deploy
```

### Environment Configuration

#### 1. Copy Environment Template

```bash
cd scripts/deploy  # or ~/idea-forge-deploy if using one-line install
cp env.secrets.example .env
```

#### 2. Configure Required Secrets

Edit `.env` and update the following **required** values:

```bash
# === CRITICAL: Update these values ===

# Domain & URLs
CLIENT_APP_URL=https://yourdomain.com
CLIENT_COLLAB_WS_URL=wss://yourdomain.com

# Database
POSTGRES_PASSWORD=your_strong_postgres_password

# Security Secrets (generate with: openssl rand -base64 32)
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
COLLAB_SECRET_KEY=your_collab_secret

# Email (Resend.com)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com
SUPER_ADMIN_EMAIL=admin@yourdomain.com

# OAuth (Optional - for Google/GitHub login)
OAUTH_GOOGLE_CLIENT_ID=your_google_client_id
OAUTH_GOOGLE_CLIENT_SECRET=your_google_client_secret
OAUTH_GITHUB_CLIENT_ID=your_github_client_id
OAUTH_GITHUB_CLIENT_SECRET=your_github_client_secret

```

#### 3. Configure Storage

**Choose ONE storage option:**

##### Option A: Self-Hosted MinIO (Recommended)

For complete data control without cloud costs.

**Configuration in `.env`:**

```bash
OSS_PROVIDER=minio
MINIO_ROOT_USER=minio_admin
MINIO_ROOT_PASSWORD=your_strong_minio_password

# Port Configuration
MINIO_PORT=9000              # MinIO API port
MINIO_CONSOLE_PORT=9001      # MinIO web console port

# Credentials (must match MINIO_ROOT_USER/PASSWORD)
OSS_SECRET_ID=minio_admin
OSS_SECRET_KEY=your_strong_minio_password
OSS_BUCKET=idea-forge-storage
OSS_REGION=us-east-1

# REQUIRED: Set OSS_ENDPOINT to assets subdomain
# IMPORTANT: Use subdomain (assets.yourdomain.com), not path (/storage)
# Subdomain approach ensures S3 signature validation works correctly
OSS_ENDPOINT=https://assets.yourdomain.com

# Optional: Only needed if you have a separate CDN for global acceleration
# Most self-hosters should leave this empty
# OSS_CDN_ENDPOINT=https://cdn.yourdomain.com  # Cloudflare/CloudFront in front of MinIO
```

**Why subdomain approach is required:**

✅ **With subdomain (assets.yourdomain.com):**
- S3 presigned URLs work correctly
- AWS signature validation succeeds
- No 403 Forbidden errors
- Clean URL structure
- No CORS issues

❌ **With path (/storage):**
- S3 signature mismatch errors
- 403 Forbidden on uploads
- Complex nginx configuration
- Requires path manipulation in URLs

❌ **Without OSS_ENDPOINT:**
- Presigned URLs use internal Docker hostname `http://minio:9000`
- Browser cannot access internal Docker network
- Requires direct MinIO port exposure (security risk)

**DNS Configuration:**

Before deployment, add DNS A record:
```
assets.yourdomain.com → your_server_ip
```

**After deployment**, create the storage bucket:
1. Access MinIO Console: `https://yourdomain.com/minio-console/`
2. Login with `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`
3. Create bucket: `idea-forge-storage` (must match `OSS_BUCKET`)
4. Set bucket policy to "public" (or configure access policies as needed)

##### Option B: Cloud OSS (Aliyun/Tencent/AWS)

For cloud storage:

```bash
# In .env:
ENABLE_MINIO_PROFILE=skip  # Disable MinIO
OSS_PROVIDER=oss  # or: cos (Tencent), s3 (AWS)
OSS_SECRET_ID=your_cloud_access_key
OSS_SECRET_KEY=your_cloud_secret_key
OSS_BUCKET=your-cloud-bucket
OSS_REGION=your-region

# REQUIRED: Actual OSS endpoint (for S3 client and presigned URLs)
OSS_ENDPOINT=https://oss-ap-southeast-1.aliyuncs.com
# Examples:
#   Aliyun: https://oss-ap-southeast-1.aliyuncs.com
#   Tencent: https://cos.ap-guangzhou.myqcloud.com
#   AWS: https://s3.us-east-1.amazonaws.com

# OPTIONAL: CDN endpoint (for faster browser downloads)
OSS_CDN_ENDPOINT=https://cdn.yourdomain.com
# eg: OSS_CDN_ENDPOINT=https://assets.ideaforge.link
# If not set, uses OSS_ENDPOINT for both uploads and downloads
# If set, uses CDN for downloads but OSS_ENDPOINT for uploads
```

**Important**:
- `OSS_ENDPOINT` must be the actual cloud provider endpoint (not CDN)
- Presigned upload URLs are generated using `OSS_ENDPOINT`
- `OSS_CDN_ENDPOINT` is optional and only used for download URLs

### Nginx Setup

#### 1. Install Nginx

```bash
sudo apt update
sudo apt install nginx
```

#### 2. Configure Nginx

```bash
# Copy example configuration
sudo cp scripts/deploy/nginx.conf.example /etc/nginx/nginx.conf

# Edit configuration
sudo nano /etc/nginx/nginx.conf
```

**Update these values in nginx.conf:**
- Replace `yourdomain.com` with your actual domain (appears multiple times)
- Replace `assets.yourdomain.com` with your actual assets subdomain
- Update SSL certificate paths (if using custom certificates)

**The nginx.conf.example already includes the MinIO subdomain configuration.**

Key points for MinIO configuration:
- ✅ Uses subdomain: `assets.yourdomain.com`
- ✅ No CORS headers in nginx (MinIO handles CORS automatically)
- ✅ Direct proxy to MinIO port (9000)
- ✅ Large file upload support (100M)
- ✅ Proper timeouts for uploads

**Full nginx configuration reference:**
[scripts/deploy/nginx.conf.example](https://github.com/chenxiaoyao6228/idea-forge/blob/master/scripts/deploy/nginx.conf.example)

#### 3. SSL Certificate Setup

##### Option A: Let's Encrypt (Recommended - Free)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain and install certificates for all domains
sudo certbot --nginx -d yourdomain.com -d assets.yourdomain.com

# Verify auto-renewal (dry run test)
sudo certbot renew --dry-run
```

**Note:** If using MinIO with subdomain (`assets.yourdomain.com`), you must include it in the certificate request.

**Auto-renewal:**

Certbot automatically sets up a systemd timer for certificate renewal. Certificates will be renewed automatically before expiration.

```bash
# Check auto-renewal timer status
sudo systemctl status certbot.timer

# Check when the timer will next run
sudo systemctl list-timers certbot.timer

# Manually trigger renewal (only renews if certificate expires in < 30 days)
sudo certbot renew

# View renewal logs
sudo journalctl -u certbot.renew.service
```

The renewal process runs twice daily and automatically reloads nginx if certificates are renewed.

##### Option B: Custom SSL Certificate

```bash
# Create SSL directory
sudo mkdir -p /etc/nginx/ssl/yourdomain.com

# Copy your certificate files
sudo cp fullchain.pem /etc/nginx/ssl/yourdomain.com/
sudo cp privkey.pem /etc/nginx/ssl/yourdomain.com/

# Set permissions
sudo chmod 600 /etc/nginx/ssl/yourdomain.com/privkey.pem
sudo chown root:root /etc/nginx/ssl/yourdomain.com/*
```

#### 4. Enable and Test Nginx

```bash
# Test configuration
sudo nginx -t

# If test passes, restart nginx
sudo systemctl restart nginx

# Enable nginx to start on boot
sudo systemctl enable nginx

# Access you app on the browser and verify
```

### Storage Configuration

#### MinIO Setup (If Using Self-Hosted Storage)

MinIO is included in docker-compose.yml and will start automatically.

**Endpoints:**
- **Storage API**: `http://localhost:9000` (internal), `https://assets.yourdomain.com` (public)
- **Admin Console**: `https://yourdomain.com/minio-console/`

**After first deployment:**

```bash
# Option 1: Via Web Console
# 1. Visit https://yourdomain.com/minio-console/
# 2. Login with your MINIO_ROOT_USER/PASSWORD
# 3. Create bucket "idea-forge-storage"
# 4. Set policy to "public"

# Option 2: Via Docker Command
docker exec ideaforge-production-minio-1 mc alias set local http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD
docker exec ideaforge-production-minio-1 mc mb local/idea-forge-storage
docker exec ideaforge-production-minio-1 mc anonymous set download local/idea-forge-storage
```

#### Cloud OSS Setup (If Using Cloud Storage)

Configure your bucket in your cloud provider console (Aliyun/Tencent/AWS) before deployment.

### Deployment & Verification

#### 1. Deploy Application

```bash
cd scripts/deploy  # or ~/idea-forge-deploy
./deploy.sh
```

The script will:
- Pull latest Docker image from Docker Hub
- Start PostgreSQL, Redis, and MinIO (if enabled)
- Run database migrations
- Start the application
- Show service status

#### 2. Verify Deployment

```bash
# Check all services are running
docker ps

# Expected services:
# - ideaforge-production-idea-forge-1 (healthy)
# - ideaforge-production-postgres-1 (healthy)
# - ideaforge-production-redis-1 (healthy)
# - ideaforge-production-minio-1 (healthy, if using MinIO)

# View application logs
docker logs ideaforge-production-idea-forge-1 -f

# Test application
curl https://yourdomain.com/api/health
# Should return: {"status":"ok"}

# Access application
# Visit: https://yourdomain.com
```

#### 3. Configure Firewall

```bash
# Allow necessary ports only
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### Maintenance & Operations

#### View Logs

```bash
cd scripts/deploy

# Application logs
docker logs ideaforge-production-idea-forge-1 -f

# Database logs
docker logs ideaforge-production-postgres-1 -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

#### Update Application

```bash
cd scripts/deploy

# Pull latest image and restart
./deploy.sh
```

#### Database Operations

```bash
# Access PostgreSQL
docker exec -it ideaforge-production-postgres-1 psql -U postgres -d ideaforge

# Backup database
docker exec ideaforge-production-postgres-1 pg_dump -U postgres ideaforge | gzip > backup-$(date +%Y%m%d).sql.gz

# Restore database
gunzip < backup.sql.gz | docker exec -i ideaforge-production-postgres-1 psql -U postgres ideaforge
```

#### MinIO Operations (If Using MinIO)

```bash
# Access MinIO console
# Visit: https://yourdomain.com/minio-console/

# Backup MinIO data
docker run --rm \
  -v ideaforge_production_minio_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/minio-backup-$(date +%Y%m%d).tar.gz -C /data .

# Check storage usage
docker exec ideaforge-production-minio-1 mc admin info local
```

#### Service Management

```bash
cd scripts/deploy

# Stop all services
docker compose down

# Restart specific service
docker compose restart idea-forge

# View service status
docker compose ps
```

#### Troubleshooting

**Application won't start:**
```bash
# Check logs for errors
docker logs ideaforge-production-idea-forge-1

# Check if required services are running
docker ps

# Verify environment variables
docker exec ideaforge-production-idea-forge-1 env | grep DATABASE_URL
```

**Database connection errors:**
```bash
# Check PostgreSQL is healthy
docker ps | grep postgres

# Test connection
docker exec ideaforge-production-postgres-1 pg_isready -U postgres -d ideaforge

# Check DATABASE_URL in .env
grep DATABASE_URL .env
```

**Nginx 502 Bad Gateway:**
```bash
# Check application is running
docker ps | grep idea-forge

# Check ports are listening
sudo netstat -tulpn | grep -E '5000|5001'

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

**MinIO connection errors (if using MinIO):**
```bash
# Check MinIO is running
docker ps | grep minio

# Test MinIO health
curl http://localhost:9000/minio/health/live

# Check nginx proxy configuration
sudo nginx -t
```

**SSL certificate issues:**
```bash
# Check certificate validity
sudo certbot certificates

# Renew certificate manually
sudo certbot renew --force-renewal

# Check certificate files exist
ls -la /etc/nginx/ssl/yourdomain.com/
```

---

## Local Testing

Test Docker deployments locally before pushing to production.

### Quick Start (Isolated Ports)

**Recommended method** - uses different ports to avoid conflicts with development environment.

#### Prerequisites

- Docker and Docker Compose installed
- Project repository cloned locally

#### Setup

```bash
# From project root directory

# Step 1: Build Docker image
docker build -t idea-forge:latest .

# Step 2: Configure for local testing
cd scripts/deploy
cp env.secrets.example .env

# Step 3: Edit .env for local testing
nano .env

# Update these values:
#   SKIP_PULL=true
#   IMAGE_NAME=idea-forge:latest
#   BUILD_CONTEXT=../..
#   NODE_ENV=test
#   Update all secrets (or use test values)

# Step 4: Deploy with isolated ports
./deploy-local.sh
```

#### Access Points

- **Application**: http://localhost:5100
- **MinIO Console**: http://localhost:9101 (minioadmin/minioadmin)

**Port Mapping:**

| Service | Development | Local Test | Production |
|---------|------------|-----------|------------|
| API | 5000 | **5100** | 5000 |
| WebSocket | 5001 | **5101** | 5001 |
| PostgreSQL | 5432 | **5532** | 5432 |
| Redis | 6379 | **6479** | 6379 |
| MinIO API | 9000 | **9100** | 9000 |
| MinIO Console | 9001 | **9101** | 9001 |

#### Useful Commands

```bash
# View logs
./deploy-local.sh --logs

# Rebuild and deploy
./deploy-local.sh --build

# Clean up everything
./deploy-local.sh --clean

# View help
./deploy-local.sh --help
```

### Alternative: Production Ports

Test with the same ports as production (requires stopping dev environment).

#### Prerequisites

- Stop development servers (pnpm dev)
- PostgreSQL and Redis not running on default ports

#### Setup

```bash
# Step 1: Build Docker image
docker build -t idea-forge:latest .

# Step 2: Configure for local testing
cd scripts/deploy
cp env.secrets.example .env

# Edit .env:
#   SKIP_PULL=true
#   IMAGE_NAME=idea-forge:latest
#   Update secrets

# Step 3: Deploy
./deploy.sh
```

#### Access Points

- **Application**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health
- **WebSocket**: ws://localhost:5001/collaboration

#### Managing Deployment

```bash
# View logs
docker compose -f scripts/deploy/docker-compose.yml logs -f

# Stop services
docker compose -f scripts/deploy/docker-compose.yml down

# Stop and remove all data
docker compose -f scripts/deploy/docker-compose.yml down -v

# Restart services
docker compose -f scripts/deploy/docker-compose.yml restart
```

#### Troubleshooting

**Port conflicts:**
```bash
# Check what's using the port
sudo lsof -i :5000
sudo lsof -i :5001

# Kill processes using the ports
sudo kill -9 <PID>
```

**Image build fails:**
```bash
# Check Docker disk space
docker system df

# Clean up unused images
docker system prune -a

# Build with verbose output
docker build -t idea-forge:latest . --progress=plain
```

**Container won't start:**
```bash
# Check logs
docker logs ideaforge-test-idea-forge-1

# Check all containers
docker ps -a

# Inspect container
docker inspect ideaforge-test-idea-forge-1
```

---

## Environment Variables Reference

See `scripts/deploy/env.secrets.example` for complete list of configuration options.

**Essential variables:**
- `CLIENT_APP_URL` - Your domain URL
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `REDIS_URL` - Redis connection string (auto-configured)
- `SESSION_SECRET` - Session encryption key
- `JWT_SECRET` - JWT token signing key
- `OSS_PROVIDER` - Storage provider (minio/cos/oss/s3)

**Optional variables:**
- `OAUTH_*` - OAuth provider credentials
- `RESEND_API_KEY` - Email service API key
- `SENTRY_DSN` - Error tracking DSN

## Data Persistence

All data is stored in Docker volumes:

**Production:**
- `ideaforge_production_postgres_data` - PostgreSQL database
- `ideaforge_production_redis_data` - Redis cache
- `ideaforge_production_minio_data` - MinIO file storage (if enabled)

**Test:**
- `ideaforge_test_postgres_data`
- `ideaforge_test_redis_data`
- `ideaforge_test_minio_data`

**Backup volumes:**
```bash
# List volumes
docker volume ls | grep ideaforge

# Backup volume
docker run --rm \
  -v ideaforge_production_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz -C /data .
```

## Security Best Practices

- ✅ Use strong passwords for all services (min 16 characters)
- ✅ Generate secrets with: `openssl rand -base64 32`
- ✅ Enable HTTPS with Let's Encrypt certificates
- ✅ Restrict firewall to only ports 22, 80, 443
- ✅ Regularly update Docker images: `./deploy.sh`
- ✅ Enable automatic security updates: `sudo apt install unattended-upgrades`
- ✅ Monitor logs for suspicious activity
- ✅ Backup databases regularly
- ✅ Never commit `.env` files to version control

## Support & Resources

- **Documentation**: [Main README](../../../README.md)
- **Issues**: [GitHub Issues](https://github.com/chenxiaoyao6228/idea-forge/issues)
- **Discussions**: [GitHub Discussions](https://github.com/chenxiaoyao6228/idea-forge/discussions)

## License

This project is licensed under [LICENSE](../../../LICENSE).
