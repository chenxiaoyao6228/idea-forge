#!/bin/sh
set -e

# wait for database to be ready
echo "Waiting for database to be ready..."
npx wait-on tcp:postgres:5432 -t 30000

# run database migrations
echo "Running database migrations..."
cd api && pnpm run prisma:deploy

# start api
echo "Starting application..."
exec "$@"