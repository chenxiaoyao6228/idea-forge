#!/bin/bash
set -e

# To run in detached mode (in the background):
docker-compose -f docker-compose.prod.yml up --build -d

# wait for services to start
echo "Waiting for services to start..."
sleep 10

# check service status
docker-compose -f docker-compose.prod.yml ps

# show logs 
echo "Showing logs..."
docker-compose -f docker-compose.prod.yml logs -f api