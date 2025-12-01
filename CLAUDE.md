<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Idea Forge is a collaborative document platform combining Notion-like functionality with AI capabilities. Built as a modern monorepo with real-time collaboration, rich document editing, and multi-tenant workspace management.

**Tech Stack:**

- **Backend:** NestJS, PostgreSQL, Redis, Prisma ORM, Hocuspocus WebSocket server
- **Frontend:** React, TypeScript, TailwindCSS, Shadcn UI, TipTap editor
- **Collaboration:** Yjs for operational transforms, Socket.io for real-time features
- **Build System:** Turbo monorepo, pnpm workspaces
- **Code Quality:** Biome (linting/formatting), Lefthook (git hooks)

## Essential Commands

### Development

```bash
# First-time setup (includes Docker services)
pnpm install && pnpm run setup

## DO NOT run any dev command, they are already started with hot-reload, ask to restart the dev server if needed


# Type checking, do it after you finish your change and spot obvious errors
pnpm -F @idea/client typecheck
pnpm -F @idea/api typecheck
```

### Building & Testing

```bash
# Build all packages
pnpm build

# Run all tests
pnpm test                    # All tests via Turbo
pnpm test:e2e               # Playwright e2e tests
pnpm test:e2e:ui            # Playwright with UI
pnpm test:e2e:debug         # Debug mode

# Individual package tests
pnpm -F @idea/api test:unit              # Run unit tests (*.unit.test.ts)
pnpm -F @idea/api test:int               # Run integration tests (*.int.test.ts)
pnpm -F @idea/api test:int:watch         # Run integration tests in watch mode
pnpm -F @idea/client test

# Run specific test file from root
pnpm -F @idea/api test:int src/notification/notification-cancellation.int.test.ts
```

### Code Quality

```bash
# Lint and format (uses Biome, not ESLint/Prettier)
pnpm lint           # Check all packages
pnpm lint:fix       # Fix auto-fixable issues
pnpm format         # Check formatting
pnpm format:fix     # Apply formatting
```

### Database Operations

```bash
# Prisma commands (run from API workspace or the root workspace)
pnpm prisma:push      # Push schema changes
pnpm prisma:studio    # Open database GUI
pnpm migrate:dev      # Create and run migration
pnpm migrate:deploy   # Deploy migrations (production)
```

### Git Worktree for Parallel Development

**Use git worktrees** to work on multiple features simultaneously without port conflicts or switching branches.

```bash
# Create a new worktree with isolated Docker services
./scripts/development/create-worktree.sh feat-auth 100
# Creates new worktree with unique ports (API:5100, WS:5101, Vite:5273, etc.)

# Work in the new worktree
cd ../idea-forge-feat-auth
# Dev servers auto-start with hot-reload

# Clean up when done
cd ../idea-forge
./scripts/development/cleanup-worktree.sh feat-auth
# Removes worktree, Docker containers, and volumes
```

**Port Allocation Strategy:**
- **main worktree:** PORT_OFFSET=0 (ports 5000, 5001, 5173, 5432, 6379, 9000, 9001)
- **worktree-1:** PORT_OFFSET=100 (ports 5100, 5101, 5273, 5532, 6479, 9100, 9101)
- **worktree-2:** PORT_OFFSET=200 (ports 5200, 5201, 5373, 5632, 6579, 9200, 9201)
- **worktree-3:** PORT_OFFSET=300 (ports 5300, 5301, 5473, 5732, 6679, 9300, 9301)

**Benefits:**
- ✅ Work on multiple features in parallel without switching branches
- ✅ Each worktree has isolated Docker services (PostgreSQL, Redis, MinIO)
- ✅ No port conflicts - each worktree uses unique ports
- ✅ Independent databases - test without affecting other worktrees
- ✅ Normal single-worktree workflow remains unchanged

**Important Notes:**
- Normal development (single worktree) continues to use default ports with no changes
- Worktree-specific configuration uses `docker-compose-worktree.yml`
- Each worktree gets a unique database (e.g., `ideaforge_feat-auth`)
- OAuth callbacks and all URLs automatically adjusted per worktree

## Project Architecture

### Monorepo Structure

```
idea-forge/
├── apps/
│   ├── api/          # NestJS backend application
│   └── client/       # React frontend application
├── packages/
│   ├── contracts/    # Shared TypeScript types and utilities
│   ├── mindmap/      # Future mindmap package
│   └── ui/           # Future shared UI components
└── scripts/          # Build and deployment utilities
```

### Backend Architecture (apps/api)

- **Module-based** NestJS structure with feature modules (auth, document, workspace, etc.)
- **Database:** PostgreSQL with Prisma ORM, includes comprehensive permission system
- **Real-time:** Hocuspocus WebSocket server for Yjs document collaboration
- **Authentication:** JWT with multiple strategies (local, GitHub, Google)
- **File Storage:** S3 integration for document attachments
- **Background Jobs:** BullMQ for async processing

Key modules: `auth`, `document`, `workspace`, `collaboration`, `file-store`, `user`, `permission`

### Frontend Architecture (apps/client)

- **Component-driven** React with TypeScript
- **State Management:** Zustand stores with hook-based architecture
- **Routing:** React Router for client-side navigation
- **UI Framework:** Shadcn UI components with TailwindCSS
- **Editor:** TipTap rich text editor with collaborative features
- **Real-time:** Socket.io client for live features, Yjs provider for document sync

Key directories: `components`, `pages`, `hooks`, `stores`, `editor`, `apis`

### Real-time Collaboration System

- **Document Sync:** Yjs operational transforms for conflict-free collaborative editing
- **WebSocket Server:** Hocuspocus manages Yjs document state and persistence
- **Live Features:** Socket.io for user presence, cursors, and instant notifications
- **Conflict Resolution:** Automatic merge of concurrent edits using Yjs algorithms

## Development Guidelines

### API Development (NestJS)

Follow patterns from `.cursor/rules/nestjs-api.mdc`:

- **Module Structure:** Feature-based modules with controllers, services, DTOs
- **Validation:** Zod schemas for request/response validation
- **Database:** Prisma with transaction support via CLS
- **Testing:** Vitest with test containers for integration tests
- **Documentation:** Swagger/OpenAPI automatic generation

### Client Development (React)

Follow patterns from `.cursor/rules/react-client.mdc`:

- **Components:** Functional components with TypeScript, Shadcn UI patterns
- **State:** Zustand stores with computed values, hook-based access
- **Styling:** TailwindCSS with CVA for component variants
- **Forms:** React Hook Form with Zod validation
- **Testing:** Vitest with React Testing Library

### Internationalization (i18n)

**IMPORTANT: Use English text as i18n keys, NOT nested key paths**

```tsx
// ✅ CORRECT - Use English text as key
t("Login")
t("Enter your email below to login")
t("Are you sure you want to delete \"{{name}}\"?", { name: item.name })

// ❌ WRONG - Don't use nested key paths
t("auth.login.title")
t("settings.ai.providerName")
```

- Locale files are in `apps/api/public/locales/{lang}.json`
- Keys are the English text itself (e.g., `"Cancel": "Cancel"`)
- Use interpolation for dynamic values: `t("Hello {{name}}", { name })`
- The i18n system uses `i18next` with `i18next-http-backend`

### Code Quality Standards

- **Linter:** Biome (configured in `biome.json`) - NOT ESLint
- **Formatter:** Biome with 2-space indentation, 160 character line width
- **Git Hooks:** Lefthook runs format/lint on pre-commit
- **TypeScript:** Strict mode enabled across all packages

## Key Patterns

### Permission System

Multi-level permissions with inheritance:

- **Document-level:** Direct user/guest permissions on documents
- **Workspace-level:** Inherited permissions from workspace membership
- **Subspace-level:** Hierarchical permission inheritance

### Document Collaboration

- **Yjs Documents:** Stored as binary data in PostgreSQL
- **Real-time Sync:** Hocuspocus WebSocket server manages document state
- **Persistence:** Automatic saves to database with version history
- **Conflict Resolution:** Operational transforms ensure consistency

### API Integration

- **Type Safety:** Shared contracts package ensures API/client type consistency
- **Request Management:** @ahooksjs/use-request for async state management
- **Error Handling:** Consistent error boundaries and user feedback

## Testing Strategy

### Unit Tests

- **Framework:** Vitest for both API and client
- **Coverage:** Focus on business logic, utilities, and complex components
- **Mocking:** Test doubles for external dependencies

### Integration Tests

- **API:** Test containers with real PostgreSQL/Redis instances
- **Database:** Prisma transactions and repository patterns
- **Authentication:** End-to-end auth flow testing

### E2E Tests

- **Framework:** Playwright with TypeScript
- **Scope:** Critical user journeys (document creation, collaboration, sharing)
- **Environment:** Isolated test environment with seeded data

## Common Development Tasks

### Adding New Features

1. **Backend:** Create feature module in `apps/api/src/`
2. **Database:** Add Prisma models and generate types
3. **Frontend:** Create components/pages in `apps/client/src/`
4. **Types:** Update contracts package for shared types
5. **Tests:** Add unit and integration test coverage

### Database Changes

1. Modify `apps/api/prisma/schema.prisma`
2. Run `pnpm migrate:dev` to create migration
3. Update generated types with `pnpm prisma:generate`
4. Update API DTOs and validation schemas

### Managing Dependencies

**IMPORTANT: Always check existing dependencies before installing new ones**

**Installation workflow:**

```bash
# Step 1: Read the package.json
# Use Read tool on apps/client/package.json or apps/api/package.json

# Step 2: Check for existing similar libraries
# Search through the dependencies list

# Step 3: Install only if needed in the correct location
pnpm -F @idea/client add <new-package>  # For client
pnpm -F @idea/api add <new-package>     # For API
```

### Docker Image Security

**IMPORTANT: The Docker image is designed to be safely published to public Docker Hub**

**Security Model:**

**What's IN the image:**
- ✅ Application code (compiled/built)
- ✅ Node modules (production dependencies)
- ✅ Prisma schema and generated client
- ✅ Static assets and locales

**What's NOT in the image:**
- ❌ NO `.env` files (enforced by `.dockerignore`)
- ❌ NO environment variables baked in
- ❌ NO secrets or credentials
- ❌ NO API keys or tokens

**Environment Variables:**
- **All variables are runtime-only**: Passed via `docker-compose` environment flags or `.env` file
- No build-time arguments required (including Sentry tokens)
- Code checks for empty values and gracefully skips optional services (e.g., Sentry)
- See `scripts/deploy/docker-compose.yml` for complete runtime config list

**Local Build & Deploy:**
```bash
# Build Docker image
docker build -t idea-forge:latest .

# Configure deployment
cp scripts/deploy/env.secrets.example scripts/deploy/.env
# Edit .env: Set SKIP_PULL=true, IMAGE_NAME=idea-forge:latest, update secrets

# Deploy locally
cd scripts/deploy
./deploy.sh
```

See `docs/development/EN/deployment.md` for detailed documentation.

### Debugging Real-time Features

- **Yjs State:** Use browser dev tools Yjs extension
- **WebSocket:** Monitor Hocuspocus server logs
- **Socket.io:** Debug panel available in development mode
- **Document State:** Prisma Studio to inspect stored Yjs documents

### Debugging with Server Logs

**IMPORTANT:** When debugging API issues, background jobs, or processor errors, ALWAYS check server logs.

**Log Files Location:** `apps/api/logs/`

**Log Files:**
- `app-error-YYYY-MM-DD.log` - Error-level logs only
- `app-YYYY-MM-DD.log` - All logs (info, warn, error)
- `app-debug-YYYY-MM-DD.log` - Debug logs (development only)

**Common Debugging Workflows:**

1. **When given a curl command or traceId:**
   ```bash
   # Search for the traceId in logs
   grep "trace-id-here" apps/api/logs/app-$(date +%Y-%m-%d).log

   # View recent errors
   tail -100 apps/api/logs/app-error-$(date +%Y-%m-d).log

   # Follow logs in real-time
   tail -f apps/api/logs/app-$(date +%Y-%m-%d).log
   ```

2. **Background job/processor errors:**
   ```bash
   # Processor errors are logged, not thrown to console
   # Always check error logs for background job failures
   grep "CommentProcessor\|NotificationProcessor" apps/api/logs/app-error-*.log

   # Search for specific error patterns
   grep -i "error\|exception\|failed" apps/api/logs/app-$(date +%Y-%m-%d).log
   ```

3. **Trace a specific request:**
   ```bash
   # Client sends x-trace-id header with each request
   # Find the traceId from browser DevTools Network tab
   # Then search logs for that traceId
   grep "f47ac10b-58cc-4372-a567-0e02b2c3d479" apps/api/logs/*.log
   ```

**Request ID System:**
- Every client request includes `x-request-id` header (auto-generated UUID)
- Server logs include `traceId` field (from x-request-id) for correlating requests
- Same request ID appears in all related log entries (controller, service, processor)
- Use request ID to track request flow through the system

## Environment Setup

### Required Services

- **PostgreSQL:** Database for application data and Yjs documents
- **Redis:** Session storage and real-time pub/sub
- **S3-compatible:** File storage (MinIO for local development)

### Development Environment

- **Docker:** Automatic setup via `pnpm dev:docker` script
- **Node.js:** Version 18+ required
- **pnpm:** Version 8.5.1+ for workspace management

### Configuration

**Environment Variables:**
- All environment variables are centralized at the project root (`.env` file)
- Copy `.env.example` to `.env` and configure for your local setup
- The API uses `dotenv-flow -p ../..` to load root-level `.env` files
- This provides consistent configuration across all apps and packages

**Important:** Environment variables are no longer located in `apps/api/.env`. Use the root `.env` file instead.

**Docker & Ports:**
- Docker services: `scripts/development/start-docker.sh` handles service startup (uses `docker-compose-dev.yml`)
- Default ports: API (5000), WS (5001), Client (5173), Database (5432), Redis (6379)
- Worktree development: Uses `docker-compose-dev.worktree.yml` with PORT_OFFSET environment variable
- See `.env.example` for port configuration and worktree support
