#!/bin/bash
set -e

echo "🔧 Verifying Production Build Locally"
echo "======================================"
echo ""

# Get script directory and navigate to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

cd "$PROJECT_ROOT"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf apps/api/dist
rm -rf apps/client/dist
rm -rf apps/api/view

echo ""
echo "📦 Building packages..."
pnpm -F @idea/contracts build
pnpm -F @idea/editor build

echo ""
echo "🏗️  Building API (production mode)..."
cd apps/api
NODE_ENV=production pnpm build
cd ../..

echo ""
echo "🏗️  Building Client (production mode)..."
cd apps/client
NODE_ENV=production pnpm build
cd ../..

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "📊 Build artifacts:"
echo "   API bundle: apps/api/dist/main.js ($(du -h apps/api/dist/main.js | cut -f1))"
echo "   Client: apps/api/view/index.html"
echo ""

# Check for common issues
echo "🔍 Checking for common issues..."
echo ""

# Check bundle size
BUNDLE_SIZE=$(stat -f%z apps/api/dist/main.js 2>/dev/null || stat -c%s apps/api/dist/main.js 2>/dev/null || echo "0")
if [ "$BUNDLE_SIZE" -lt 1000000 ]; then
    echo "⚠️  Warning: Bundle size is suspiciously small ($BUNDLE_SIZE bytes)"
else
    echo "✅ Bundle size looks reasonable ($(du -h apps/api/dist/main.js | cut -f1))"
fi

# Check if critical packages are bundled (by looking for their distinctive code)
if strings apps/api/dist/main.js | grep -q "DiceBear"; then
    echo "✅ @dicebear packages are bundled"
else
    echo "⚠️  @dicebear packages might not be bundled"
fi

if strings apps/api/dist/main.js | grep -q "faker"; then
    echo "✅ @faker-js/faker is bundled"
else
    echo "⚠️  @faker-js/faker might not be bundled"
fi

# Check for source maps
if [ -f "apps/api/dist/main.js.map" ]; then
    echo "ℹ️  Source maps generated (not recommended for production)"
fi

echo ""
echo "🚀 Starting production server for health check..."
echo ""

# Check if required services are running
echo "📋 Checking required services..."

# Check PostgreSQL
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "❌ PostgreSQL is not running on localhost:5432"
    echo "   Please start PostgreSQL first"
    exit 1
fi
echo "✅ PostgreSQL is running"

# Check Redis
if ! redis-cli -h localhost -p 6379 ping >/dev/null 2>&1; then
    echo "❌ Redis is not running on localhost:6379"
    echo "   Please start Redis first"
    exit 1
fi
echo "✅ Redis is running"

# Check .env file
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found in project root"
    echo "   The server might fail to start without proper configuration"
fi

echo ""
echo "🔧 Starting server (will wait 30 seconds for startup)..."

# Kill any existing node process on port 5000
lsof -ti:5000 | xargs kill -9 2>/dev/null || true

# Start the server in background
# Load .env file by setting NODE_OPTIONS to use dotenv
cd apps/api
NODE_ENV=production node -r dotenv/config dist/main.js dotenv_config_path=../../.env > /tmp/verify-server.log 2>&1 &
SERVER_PID=$!
cd ../..

echo "   Server PID: $SERVER_PID"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    if kill -0 $SERVER_PID 2>/dev/null; then
        echo "   Stopping server (PID: $SERVER_PID)"
        kill $SERVER_PID 2>/dev/null || true
        sleep 2
        kill -9 $SERVER_PID 2>/dev/null || true
    fi
}

trap cleanup EXIT

# Wait for server to start and check health
MAX_WAIT=30
WAIT_COUNT=0
SERVER_STARTED=false

echo "   Waiting for server to respond..."

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if curl -s -f http://localhost:5000/api/health >/dev/null 2>&1; then
        SERVER_STARTED=true
        break
    fi

    # Check if server process is still running
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo ""
        echo "❌ Server process died during startup!"
        echo ""
        echo "📋 Server logs:"
        tail -50 /tmp/verify-server.log
        exit 1
    fi

    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    echo -n "."
done

echo ""

if [ "$SERVER_STARTED" = true ]; then
    echo ""
    echo "✅ Server started successfully and health check passed!"
    echo ""

    # Test a few endpoints
    echo "🧪 Testing endpoints..."

    if curl -s http://localhost:5000/api/health | grep -q "ok"; then
        echo "   ✅ /api/health endpoint working"
    else
        echo "   ⚠️  /api/health endpoint returned unexpected response"
    fi

    if curl -s -f http://localhost:5000/ >/dev/null 2>&1; then
        echo "   ✅ / (root) endpoint working"
    else
        echo "   ⚠️  / (root) endpoint not accessible"
    fi

    echo ""
    echo "📋 Recent server logs:"
    tail -20 /tmp/verify-server.log | grep -v "Invalid Sentry Dsn" || true

    echo ""
    echo "✅ Production build verification PASSED!"
    echo ""
    echo "   The application is ready for Docker build."
    echo "   You can now rebuild the Docker image with confidence."
    echo ""
else
    echo ""
    echo "❌ Server failed to start within ${MAX_WAIT} seconds!"
    echo ""
    echo "📋 Server logs:"
    tail -50 /tmp/verify-server.log
    echo ""
    echo "   Please check the logs above for errors."
    exit 1
fi
