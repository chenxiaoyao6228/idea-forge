# Base stage for shared dependencies
FROM node:20.18.1-alpine AS builder

# Add OpenSSL dependencies for Prisma
RUN apk add --no-cache openssl openssl-dev

RUN npm install -g pnpm@8.5.1

WORKDIR /app

# Copy package files first for better caching
COPY .npmrc ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY shared/package.json ./shared/
COPY apps/api/package.json ./apps/api/
COPY apps/client/package.json ./apps/client/

# List all files to verify copies
RUN ls -la

# Log versions
RUN node --version && pnpm --version

# Install dependencies with force flag to handle lockfile incompatibility
RUN pnpm install --frozen-lockfile

# Copy the rest of the files
COPY . .

# Set build arguments and environment variables
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
ARG SENTRY_AUTH_TOKEN_REACT
ENV SENTRY_AUTH_TOKEN_REACT=$SENTRY_AUTH_TOKEN_REACT
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL


RUN cd shared && pnpm build

RUN cd apps/api && pnpm build

# set sentry auth token for react because sentry does not custom key for token
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN_REACT

RUN cd apps/client && pnpm build


## production stage
FROM node:20.18.1-alpine AS production

# Add OpenSSL dependencies for Prisma in production stage
RUN apk add --no-cache openssl openssl-dev

RUN npm install -g pnpm@8.5.1

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# shared
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist


# api
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/public ./apps/api/public
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/ecosystem.config.js ./apps/api/ecosystem.config.js
COPY --from=builder /app/apps/api/.env.vault ./apps/api/.env.vault

RUN cat ./apps/api/.env.vault

# client build
COPY --from=builder /app/apps/api/view ./apps/api/view 

RUN pnpm install --prod --frozen-lockfile

# Make sure prisma schema is up to date
RUN cd apps/api && pnpm prisma generate


HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

EXPOSE 5000 5001

RUN npm install pm2 -g

CMD cd apps/api && npm run start:pm2