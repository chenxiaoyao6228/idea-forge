# Base stage for shared dependencies
FROM node:20.18.1-alpine AS base

# Add OpenSSL dependencies for Prisma, git for lefthook, and Python + build tools for native dependencies
RUN apk add --no-cache openssl openssl-dev git python3 make g++

RUN npm install -g pnpm@8.5.1

WORKDIR /app

# Copy package files first for better caching
COPY .npmrc ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/editor/package.json ./packages/editor/
COPY packages/utils/package.json ./packages/utils/
COPY packages/ui/package.json ./packages/ui/
COPY packages/icons/package.json ./packages/icons/
COPY packages/file-transfer/package.json ./packages/file-transfer/
COPY apps/api/package.json ./apps/api/
COPY apps/client/package.json ./apps/client/

# Install dependencies (ignore postinstall to avoid errors - source files not copied yet)
# Use BuildKit cache mount to persist pnpm store across builds
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# Copy the rest of the files
COPY . .

# Generate Prisma client manually (postinstall was skipped)
# Using shell commands to avoid devDependency issues
RUN cd apps/api && \
    rm -rf prisma-type-generated && \
    npx prisma generate && \
    node scripts/generate-prisma-types.js

# Build workspace packages that are dependencies for API and client
# These packages need to be built before API/client can bundle them
RUN pnpm -F @idea/contracts build && \
    pnpm -F @idea/editor build && \
    pnpm -F @idea/ui build

## API builder stage (runs in parallel with client-builder)
FROM base AS api-builder

# Build API (webpack bundles workspace packages from their dist/)
RUN cd apps/api && pnpm build

## Client builder stage (runs in parallel with api-builder)
FROM base AS client-builder

# Build client (vite bundles workspace packages from their dist/)
# Git commands will work because .git is included in build context
RUN cd apps/client && pnpm build


## production stage
FROM node:20.18.1-alpine AS production

# Add OpenSSL dependencies for Prisma, git for lefthook, and Python + build tools for native dependencies
RUN apk add --no-cache openssl openssl-dev git python3 make g++

RUN npm install -g pnpm@8.5.1 pm2

WORKDIR /app

# Copy root package files (from base stage - they're the same in all builders)
COPY --from=base /app/package.json ./
COPY --from=base /app/pnpm-lock.yaml ./
COPY --from=base /app/pnpm-workspace.yaml ./

# Copy .env.example to provide default configuration
# This file contains NO secrets - only example/default values
# Runtime secrets are provided via docker-compose environment variables
COPY --from=base /app/.env.example ./.env.example

# Copy packages
# All workspace packages are bundled into API/client dist by webpack/vite
# No need to copy individual package dist folders

# Copy API build artifacts from api-builder stage
COPY --from=api-builder /app/apps/api/dist ./apps/api/dist
COPY --from=api-builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=api-builder /app/apps/api/public ./apps/api/public
COPY --from=api-builder /app/apps/api/locales ./apps/api/locales
COPY --from=api-builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=api-builder /app/apps/api/ecosystem.config.js ./apps/api/ecosystem.config.js

# Copy client build from client-builder stage (served by API)
COPY --from=client-builder /app/apps/api/view ./apps/api/view

# Install production dependencies
# Use BuildKit cache mount to persist pnpm store across builds
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile --ignore-scripts

# Generate Prisma client for runtime (only the 'client' generator, not dev generators)
# The schema has 3 generators, but only 'client' runs without dev dependencies
RUN cd apps/api && npx prisma generate --generator client

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

EXPOSE 5000 5001

# IMPORTANT: All environment variables MUST be provided at runtime via docker-compose
# The image contains NO sensitive data and can be safely published to Docker Hub

# Create startup script that copies .env.example to .env and starts the app
# Docker environment variables will override values in .env
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Copy .env.example to .env if .env does not exist' >> /app/start.sh && \
    echo 'if [ ! -f .env ]; then' >> /app/start.sh && \
    echo '  echo "Creating .env from .env.example..."' >> /app/start.sh && \
    echo '  cp .env.example .env' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start the application' >> /app/start.sh && \
    echo 'cd apps/api && pm2 start ecosystem.config.js --env production --no-daemon' >> /app/start.sh && \
    chmod +x /app/start.sh

CMD ["/app/start.sh"]