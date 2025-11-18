# 🚀 Deployment Ready!

Your Docker image has been successfully built and published to Docker Hub!

**Image:** `chenxiaoyao6228/idea-forge:test`

## Next Steps: Deploy on Remote Server

### Step 1: SSH to Your Remote Server

```bash
ssh your-user@your-server-ip
```

### Step 2: Clone the Repository (Test Branch)

```bash
git clone -b test https://github.com/chenxiaoyao6228/idea-forge.git
cd idea-forge/scripts/deploy
```

### Step 3: Configure Secrets

```bash
# Copy the template
cp env.secrets.example .env

# Edit with your actual values
nano .env
```

**Required Configuration in `.env`:**

```bash
# Environment - use 'test' since you're using the test image
NODE_ENV=test

# Docker Image - use the test image
IMAGE_NAME=chenxiaoyao6228/idea-forge:test

# Database credentials
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_strong_password_here

# Generate secrets with: openssl rand -base64 32
SESSION_SECRET=your_session_secret_here
JWT_SECRET=your_jwt_secret_here
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here
COLLAB_SECRET_KEY=your_collab_secret_here

# Optional: OAuth, Email, Storage, AI, etc.
# See env.secrets.example for all available options
```

**IMPORTANT:**
- Make sure `SKIP_PULL` is NOT set (or remove it entirely) - you want to pull from Docker Hub
- Set `IMAGE_NAME=chenxiaoyao6228/idea-forge:test` (not `idea-forge:latest`)

### Step 4: Deploy

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The script will:
1. ✅ Pull the latest image from Docker Hub (chenxiaoyao6228/idea-forge:test)
2. ✅ Stop old containers
3. ✅ Start PostgreSQL and Redis
4. ✅ Run database migrations automatically
5. ✅ Start the application
6. ✅ Show logs and status

### Step 5: Verify Deployment

```bash
# Check service status
docker compose -f docker-compose.yml ps

# View logs
docker compose -f docker-compose.yml logs -f idea-forge

# Test health endpoint (from server)
curl http://localhost:5000/api/health

# Test from your local machine (if ports are open)
curl http://your-server-ip:5000/api/health
```

### Step 6: Access the Application

Once deployed, access your application:
- **Application:** http://your-server-ip:5000
- **Health Check:** http://your-server-ip:5000/api/health
- **API:** http://your-server-ip:5000/api

## Troubleshooting

### If deployment fails:

```bash
# Check logs
docker compose -f scripts/deploy/docker-compose.yml logs idea-forge

# Check PostgreSQL
docker compose -f scripts/deploy/docker-compose.yml logs postgres

# Check Redis
docker compose -f scripts/deploy/docker-compose.yml logs redis

# Restart services
cd scripts/deploy
./deploy.sh
```

### If health check fails:

```bash
# Enter container for debugging
docker compose -f scripts/deploy/docker-compose.yml exec idea-forge sh

# Check environment variables
docker compose -f scripts/deploy/docker-compose.yml exec idea-forge env | grep DATABASE_URL

# Check if services are running
docker compose -f scripts/deploy/docker-compose.yml ps
```

## Production Setup (Optional)

For production deployment with domain and HTTPS:

1. **Setup Domain & Nginx:**
   - Point your domain to the server IP
   - Configure Nginx reverse proxy (see docs/development/EN/deployment.md)
   - Setup SSL certificate (Let's Encrypt)

2. **Update .env:**
   ```bash
   NODE_ENV=production
   IMAGE_NAME=chenxiaoyao6228/idea-forge:latest  # Use 'latest' for production
   CLIENT_APP_URL=https://yourdomain.com
   CLIENT_COLLAB_WS_URL=wss://yourdomain.com:5001/collaboration
   ```

3. **Configure OAuth callbacks:**
   - Update Google/GitHub OAuth callback URLs to your domain
   - Update GOOGLE_CALLBACK_URL and GITHUB_CALLBACK_URL in .env

## Useful Commands

```bash
cd scripts/deploy

# Stop services
docker compose down

# Restart services
docker compose restart

# View logs
docker compose logs -f idea-forge

# Update to latest image
docker compose pull idea-forge
docker compose up -d

# Backup database
docker compose exec postgres pg_dump -U postgres ideaforge > backup.sql
```

## Success Criteria

Your deployment is successful when:
- ✅ All containers are running: `docker compose ps` shows all services healthy
- ✅ Health check passes: `curl http://localhost:5000/api/health` returns 200
- ✅ Application loads: Browser shows the Idea Forge interface
- ✅ Database migrations completed: Check deployment logs for "✅ Migrations completed successfully"

---

**🎉 Congratulations!** Your Idea Forge instance is now running!

For detailed documentation, see: `docs/development/EN/deployment.md`
