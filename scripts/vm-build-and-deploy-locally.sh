#!/bin/bash
set -e

# STEP 1: create or update .env file and .npmrc file

echo "Starting build process..."

# Build Docker image
docker build \
  -f Dockerfile.prod \
  -t ideaforge-prod-docker:latest \
  --build-arg NODE_ENV=production \
  .

echo "Build completed successfully!" 

echo "Starting deployment process..."

# Stop and remove old containers
echo "Stopping and removing old containers..."
docker-compose -f docker-compose.prod.yml down

# Pull latest images
echo "Pulling latest images..."
docker-compose -f docker-compose.prod.yml pull

# Wait for database to be ready
echo "Waiting for database to be ready..."
until docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U postgres; do
    echo "Postgres is unavailable - sleeping"
    sleep 1
done

# Run database migrations
echo "Running database migrations..."
docker-compose -f docker-compose.prod.yml run --rm api sh -c "cd api && pnpm run prisma:deploy"

# Start services
echo "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
echo "Waiting for services to start..."
sleep 10

# Check service status
echo "Checking service status..."
docker-compose -f docker-compose.prod.yml ps

# Show logs
echo "Showing logs..."
docker-compose -f docker-compose.prod.yml logs -f api