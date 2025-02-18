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
COPY api/package.json ./api/
COPY client/package.json ./client/

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

RUN cd api && pnpm build

# set sentry auth token for react because sentry does not custom key for token
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN_REACT

RUN cd client && pnpm build


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
COPY --from=builder /app/api/dist ./api/dist
COPY --from=builder /app/api/package.json ./api/package.json
COPY --from=builder /app/api/public ./api/public
COPY --from=builder /app/api/prisma ./api/prisma
COPY --from=builder /app/api/ecosystem.config.js ./api/ecosystem.config.js
COPY --from=builder /app/api/.env.vault ./api/.env.vault

RUN cat ./api/.env.vault

# client build
COPY --from=builder /app/api/view ./api/view 

RUN pnpm install --prod --frozen-lockfile

# Make sure prisma schema is up to date
RUN cd api && pnpm prisma generate


HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

EXPOSE 5000 5001

RUN npm install pm2 -g

CMD cd api && npm run start:pm2