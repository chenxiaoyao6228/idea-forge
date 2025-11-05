# Docker Development Guide

This guide covers Docker-related development workflows, including building images, configuring proxies for users in China, and troubleshooting common issues.

---

## Table of Contents

- [Building Docker Images Locally](#building-docker-images-locally)
- [Proxy Configuration for China Users](#proxy-configuration-for-china-users)
- [Troubleshooting](#troubleshooting)
- [Docker Image Architecture](#docker-image-architecture)

---

## Building Docker Images Locally

### Quick Start

**Option 1: Automated Build Script (Recommended)**

```bash
# From project root directory
./scripts/build-docker.sh

# Force rebuild without cache
./scripts/build-docker.sh --no-cache
```

This script automatically:
- Detects proxy from environment or `~/.docker/config.json`
- Tests if proxy is working
- Pulls base image with proxy
- Builds with appropriate flags

**Option 2: Quick Verification (Fast Testing)**

If you're making Dockerfile changes and want to verify them quickly without rebuilding everything:

```bash
# Verify the build process without full rebuild
./scripts/verify-docker-build.sh

# Test specific stage only
./scripts/verify-docker-build.sh --stage builder
./scripts/verify-docker-build.sh --stage production

# Keep test images for debugging
./scripts/verify-docker-build.sh --no-cleanup
```

This verification script:
- Uses cached layers from previous builds
- Tests build stages independently
- Verifies artifacts are created correctly
- Much faster than full rebuild (2-3 minutes vs 10 minutes)

**Option 3: Manual Build**

```bash
# From project root directory
docker build -t idea-forge:latest .
```

### Building with Build Arguments

If you need to pass build-time arguments (e.g., for proxy configuration inside the container):

```bash
docker build \
  --build-arg HTTP_PROXY=http://host.docker.internal:7897 \
  --build-arg HTTPS_PROXY=http://host.docker.internal:7897 \
  --build-arg NO_PROXY=localhost,127.0.0.1 \
  -t idea-forge:latest .
```

**Note:** `host.docker.internal` is a special DNS name that resolves to your host machine's IP from inside the Docker container.

### Build Time

- **First build:** 5-10 minutes (depends on your network and system)
- **Subsequent builds:** Faster due to Docker layer caching

---

## Proxy Configuration for China Users

If you're in China or behind a corporate firewall, Docker might have trouble pulling images from Docker Hub or downloading packages during build. Here's how to configure proxy support.

### Understanding Docker Proxy Layers

**Why do we need to configure proxy in multiple places?**

Docker has **3 separate network contexts** that each need their own proxy configuration:

| Layer | What Needs Proxy | Config Location | Why Needed |
|-------|-----------------|-----------------|------------|
| **Docker Daemon** | Pulling images from Docker Hub | Docker Desktop UI (Mac/Windows)<br>`/etc/docker/daemon.json` (Linux) | Downloads base images like `node:20.18.1-alpine` |
| **Docker CLI** | Build metadata checks | `~/.docker/config.json` | Fetches image metadata and layer info |
| **Inside Container** | Alpine apk, npm registry | `--build-arg HTTP_PROXY=...` | Downloads packages during build |

**Important**: These are separate programs with separate network stacks, so they need separate proxy configs.

### Quick Answer: Use the Build Script

**The simplest solution:**
```bash
# Configure proxy once in ~/.docker/config.json
# Then just run:
./scripts/build-docker.sh
```

The script handles all proxy detection and configuration automatically.

### Prerequisites

- A working proxy tool (Clash, V2Ray, etc.)
- Know your local proxy port (e.g., 7897)

### Working Configuration (Tested)

This configuration has been verified to work:

#### Step 1: Configure Clash

1. **Enable "Allow LAN" (允许局域网连接)**
   - Open Clash settings
   - Enable "Allow LAN" option
   - This allows Docker to connect to `127.0.0.1:7897`

2. **Set Proxy Mode to "Global"**
   - Click the "Global" tab in Clash interface
   - This ensures ALL traffic (including Docker Hub) uses the proxy
   - Alternative: Use "Rule" mode with custom rules (see below)

#### Step 2: Configure Docker Desktop

##### Option A: Use System Proxy (Recommended)

1. Open Docker Desktop → Settings → Resources → Proxies
2. Select **"System proxy"**
3. Click "Apply & Restart"

This automatically uses your system's proxy settings (managed by Clash).

##### Option B: Manual Proxy Configuration

1. Open Docker Desktop → Settings → Resources → Proxies
2. Select **"Manual proxy configuration"**
3. Set:
   - Web Server (HTTP): `http://127.0.0.1:7897`
   - Secure Web Server (HTTPS): `http://127.0.0.1:7897`
   - Bypass for these hosts: `localhost,127.0.0.1`
4. Click "Apply & Restart"

#### Step 3: Configure Docker Daemon (~/.docker/config.json)

Edit `~/.docker/config.json` to add proxy configuration:

```json
{
  "proxies": {
    "default": {
      "httpProxy": "http://127.0.0.1:7897",
      "httpsProxy": "http://127.0.0.1:7897",
      "noProxy": "localhost,127.0.0.1"
    }
  }
}
```

**Important:** After editing this file, restart Docker Desktop for changes to take effect.

#### Step 4: Build with Proxy

**Important for Mac users:** Docker Desktop on Mac has a bug where `docker build` doesn't always use proxy settings for pulling base images. **Workaround: Pull the base image first!**

```bash
# Step 1: Pull base image manually (this WILL use the proxy)
docker pull node:20.18.1-alpine

# Step 2: Build with --pull=false (use only cached images, don't check Docker Hub)
# Build args provide proxy for Alpine package manager (apk) inside the container
docker build \
  --pull=false \
  --build-arg HTTP_PROXY=http://host.docker.internal:7897 \
  --build-arg HTTPS_PROXY=http://host.docker.internal:7897 \
  -t idea-forge:latest .
```

**Why this works:**
- `docker pull` command correctly uses the proxy (from config.json or Desktop UI)
- `docker build` sometimes ignores proxy for image pulls (Docker Desktop bug)
- `--pull=false` tells Docker to ONLY use locally cached images and skip metadata checks to Docker Hub
- `--build-arg HTTP_PROXY/HTTPS_PROXY` provides proxy to commands INSIDE the container (Alpine apk, npm registry, etc.)
- Once the image is cached locally, build proceeds with `--pull=false`

**What gets installed during build:**
- **Alpine packages:** `openssl`, `openssl-dev`, `git`, `python3`, `make`, `g++` (for native dependencies)
- **npm packages:** 2500+ packages via pnpm (uses proxy for npm registry)
- **Build time:** 5-10 minutes on first build (downloads ~500MB)

### Using Rule Mode Instead of Global

If you prefer to use Clash's "Rule" mode instead of "Global" mode, you need to add Docker Hub domains to your proxy rules.

#### Add Docker Hub Domains to Clash Rules

Edit your Clash configuration file (usually `~/.config/clash/config.yaml` or similar) and add these domains to your proxy rules:

```yaml
rules:
  # Docker Hub domains
  - DOMAIN-SUFFIX,docker.io,PROXY
  - DOMAIN-SUFFIX,docker.com,PROXY
  - DOMAIN,registry-1.docker.io,PROXY
  - DOMAIN,auth.docker.io,PROXY
  - DOMAIN,production.cloudflare.docker.com,PROXY

  # Alpine Linux package repositories
  - DOMAIN-SUFFIX,alpinelinux.org,PROXY
  - DOMAIN,dl-cdn.alpinelinux.org,PROXY

  # NPM registry (if needed)
  - DOMAIN,registry.npmjs.org,PROXY

  # Your other rules...
  - MATCH,DIRECT
```

After editing:
1. Reload Clash configuration
2. Switch back to "Rule" mode
3. Try building again

### Summary: What You Need

✅ **Clash Configuration:**
- Allow LAN: **Enabled**
- Proxy Mode: **Global** (or Rule with Docker domains)
- Local Port: **7897** (or your configured port)

✅ **Docker Desktop (Mac/Windows):**
- Proxy: **System proxy** (recommended) or Manual with `http://127.0.0.1:7897`

✅ **Docker Config File (`~/.docker/config.json`):**
- Add `proxies.default` with your proxy settings

✅ **Build Command:**
- Recommended: `./scripts/build-docker.sh` (auto-detects everything)
- Manual: `docker build --pull=false --build-arg HTTP_PROXY=... -t idea-forge:latest .`

---

## Linux Server with Network Restrictions

If you need to build on a Linux server (no Docker Desktop) with the same network restrictions:

### Option 1: Use Pre-built Images (Recommended)

**Skip all proxy configuration:**
```bash
# Just pull the pre-built image from Docker Hub
docker pull chenxiaoyao6228/idea-forge:latest
```

This is why we have GitHub Actions - build once on GitHub, deploy anywhere!

### Option 2: Build on Server with Proxy

**1. Configure Docker Daemon** (`/etc/docker/daemon.json`):
```json
{
  "proxies": {
    "http-proxy": "http://127.0.0.1:7897",
    "https-proxy": "http://127.0.0.1:7897",
    "no-proxy": "localhost,127.0.0.1"
  }
}
```

Restart Docker:
```bash
sudo systemctl restart docker
```

**2. Configure Docker CLI** (`~/.docker/config.json`):
```json
{
  "proxies": {
    "default": {
      "httpProxy": "http://127.0.0.1:7897",
      "httpsProxy": "http://127.0.0.1:7897",
      "noProxy": "localhost,127.0.0.1"
    }
  }
}
```

**3. Build with Script:**
```bash
# The build script works on Linux too!
./scripts/build-docker.sh
```

Or manually:
```bash
# Pull base image first
docker pull node:20.18.1-alpine

# Build (note: use docker0 bridge IP instead of host.docker.internal on Linux)
DOCKER_HOST_IP=$(ip -4 addr show docker0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}')
docker build \
  --pull=false \
  --build-arg HTTP_PROXY=http://$DOCKER_HOST_IP:7897 \
  --build-arg HTTPS_PROXY=http://$DOCKER_HOST_IP:7897 \
  -t idea-forge:latest .
```

**Key Difference from Mac/Windows:**
- Mac/Windows: Use `host.docker.internal` to access host from container
- Linux: Use docker0 bridge IP (usually `172.17.0.1`) to access host from container

---

## Troubleshooting

### Testing if Your Proxy is Working

Before building, verify your proxy can reach Docker Hub:

```bash
# Test Docker Hub authentication server
curl --max-time 10 -x http://127.0.0.1:7897 'https://auth.docker.io/token?service=registry.docker.io'

# Expected output: A JSON token (long string starting with {"token":"eyJ...})
# Error output: Connection refused, timeout, or network error
```

**What this tells you:**
- ✅ **Success (JSON token returned):** Proxy is working, Docker should be able to pull images
- ❌ **Connection refused:** Clash is not running or "Allow LAN" is disabled
- ❌ **Timeout:** Proxy is unreachable or Clash is not connected to a VPN server
- ❌ **403 Forbidden:** Proxy server is blocking the request

### Issue: "Failed to resolve source metadata for docker.io/library/node"

**Symptoms:**
```
ERROR: failed to resolve source metadata for docker.io/library/node:20.18.1-alpine
```

**Solutions:**

1. **Test if proxy is working (see above)**

2. **Check Docker Desktop proxy settings:**
   - Docker Desktop → Settings → Resources → Proxies
   - Should be "System proxy" OR disabled (if using `~/.docker/config.json`)
   - Click "Apply & Restart" after any changes

3. **Verify `~/.docker/config.json` has proxy settings:**
   ```bash
   cat ~/.docker/config.json | grep -A 5 proxies
   ```

4. **Restart Docker Desktop completely:**
   - Sometimes Docker Desktop doesn't pick up `config.json` changes until restarted
   - Quit Docker Desktop completely
   - Wait 5 seconds
   - Start Docker Desktop again

5. **Verify Clash is running and "Allow LAN" is enabled**

### Issue: "Error: exec: 'git': executable file not found"

**Cause:** Git is required for lefthook (git hooks) during dependency installation.

**Solution:** Already fixed in the Dockerfile by adding git to Alpine packages:
```dockerfile
RUN apk add --no-cache openssl openssl-dev git python3 make g++
```
If you see this error, make sure you're using the latest Dockerfile.

### Issue: "gyp ERR! find Python" or "Unable to detect compiler type"

**Symptoms:**
```
gyp ERR! find Python Python is not set from command line or npm configuration
Error: Unable to detect compiler type
```

**Cause:** Some native dependencies (ssh2, cpu-features, argon2) need Python and C++ build tools to compile.

**Solution:** Already fixed in the Dockerfile by adding build dependencies:
```dockerfile
RUN apk add --no-cache openssl openssl-dev git python3 make g++
```

These packages provide the build environment needed for native node modules.

### Issue: "could not connect to server (check repositories file)"

**Symptoms:**
```
WARNING: fetching https://dl-cdn.alpinelinux.org/alpine/...: could not connect to server
```

**Cause:** Alpine package manager can't reach CDN (network restriction).

**Solution:** Use build arguments to pass proxy into container:
```bash
docker build \
  --build-arg HTTP_PROXY=http://host.docker.internal:7897 \
  --build-arg HTTPS_PROXY=http://host.docker.internal:7897 \
  -t idea-forge:latest .
```

### Issue: "i/o timeout" or "DeadlineExceeded"

**Symptoms:**
```
ERROR: DeadlineExceeded: failed to fetch anonymous token: dial tcp ...:443: i/o timeout
```

**Causes & Solutions:**

1. **Proxy not responding fast enough:**
   - Switch Clash to "Global" mode
   - Check if Clash is actually connected to a server
   - Try a different proxy server node

2. **Docker not using proxy:**
   - Verify `~/.docker/config.json` has correct proxy settings
   - Restart Docker Desktop after config changes
   - Check Docker Desktop proxy settings

3. **Firewall blocking:**
   - Temporarily disable firewall to test
   - Add Docker to firewall exceptions

### Issue: Registry Mirror Blocking (403 Forbidden)

**Symptoms:**
```
ERROR: unexpected status from HEAD request to https://9lkbm4yu.mirror.aliyuncs.com/...: 403 Forbidden
```

**Cause:** Docker is configured to use a Chinese mirror (Aliyun) that's blocking access.

**Solution:**

1. Open Docker Desktop → Settings → Docker Engine
2. Remove the `registry-mirrors` section:
   ```json
   {
     "registry-mirrors": [
       "https://9lkbm4yu.mirror.aliyuncs.com"  // Remove this
     ]
   }
   ```
3. Click "Apply & Restart"

This will make Docker pull directly from Docker Hub (via your proxy).

---

## Docker Image Architecture

### Multi-Stage Build

The Dockerfile uses a multi-stage build:

1. **Builder Stage** (`node:20.18.1-alpine AS builder`)
   - Installs dependencies
   - Builds contracts, API, and client
   - Generates Prisma client
   - Runs build-time scripts

2. **Production Stage** (`node:20.18.1-alpine AS production`)
   - Copies only production dependencies
   - Copies built artifacts from builder
   - Installs PM2 for process management
   - Sets up startup scripts

### Image Size Optimization

- Uses Alpine Linux (minimal base image)
- Multi-stage build discards dev dependencies and build artifacts
- Only production `node_modules` are included
- Total image size: ~800MB-1GB (mostly node_modules)

### Runtime Configuration

The image is designed to be configured at runtime:

- ✅ `.env.example` is baked into the image (safe defaults)
- ✅ Environment variables override defaults at runtime
- ❌ No secrets in the image
- ❌ No build-time secrets (except optional Sentry tokens)

See `docs/development/EN/deployment.md` for deployment configuration.

---

## Advanced Topics

### Customizing Build

#### Skip Certain Stages

```bash
# Build only up to builder stage (for testing)
docker build --target builder -t idea-forge:builder .
```

#### Use Different Base Image

Edit Dockerfile line 2:
```dockerfile
FROM node:20.18.1-alpine AS builder
# Change to:
FROM node:20-alpine AS builder  # Latest Node 20
```

### Multi-Platform Builds

To build for different architectures:

```bash
# Build for linux/amd64 and linux/arm64
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t idea-forge:latest .
```

### Build Cache

Docker caches layers to speed up builds. To force a fresh build:

```bash
# Clear cache and rebuild
docker build --no-cache -t idea-forge:latest .
```

### Faster Development Iteration

When working on Dockerfile changes:

**1. Initial build (slow - pulls everything):**
```bash
./scripts/build-docker.sh
```

**2. Make Dockerfile changes**

**3. Quick verification (fast - uses cached layers):**
```bash
./scripts/verify-docker-build.sh --stage builder
```

**4. If builder stage passes, test production:**
```bash
./scripts/verify-docker-build.sh --stage production
```

This approach lets you iterate on Dockerfile changes much faster by leveraging Docker's layer cache. Only the changed layers need to be rebuilt.

---

## Related Documentation

- [Deployment Guide](./deployment.md) - Deploying built images
- [Development Guide](../../../CLAUDE.md) - General development setup
- [Docker Compose](../../../docker-compose-dev.yml) - Local development services

---

## Getting Help

If you encounter issues not covered here:

1. Check Docker Desktop logs: Docker Desktop → Troubleshoot → View logs
2. Check build output carefully for specific error messages
3. Verify your proxy is actually working: `curl -x http://127.0.0.1:7897 https://www.google.com`
4. Open an issue with full error logs on GitHub
