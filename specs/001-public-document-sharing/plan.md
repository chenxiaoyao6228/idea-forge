# Implementation Plan: Public Document Sharing

**Branch**: `001-public-document-sharing` | **Date**: 2025-10-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-public-document-sharing/spec.md`

## Summary

Enable users to share documents publicly via unguessable URLs without requiring authentication. Anonymous viewers access documents in read-only mode via TipTap editor. The feature supports hierarchical document navigation (parent-child relationships), expiration settings, view analytics, and real-time updates for authenticated collaborators. Implementation uses a hybrid component architecture: reuse TipTap editor for rendering consistency, but maintain separate public layout/navigation for security isolation.

**MVP Features (from decisions)**:
1. **Smart Share Link Discovery**: Auto-redirect unauthenticated users from workspace/document URLs to public share URLs when available
2. **Differentiated Headers**: Display different header elements for authenticated vs unauthenticated users with workspace navigation options

**Key Technical Decisions (from clarifications)**:
- Render using TipTap editor in read-only mode (security + consistency)
- Show banner for authenticated users with "Open in workspace" option
- Immediate public access (no preview stage)
- Full document tree navigation with upward traversal to find root
- **Standalone permission system** (not unified with authenticated - maintains clear separation)
- **Share algorithms, not components** (extract tree-building logic, create specialized public UI)
- **Shadcn/UI integration** (use existing Sidebar components, useScrollTop hook for consistency)
- **Enhanced reading experience** (TOC with IntersectionObserver, scroll-to-top button)
- **Hierarchical API responses** (backend returns nested tree structure directly)
- **Hybrid routing approach** (server-side interception + client-side fallback for SPA routes)

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**:
- Backend: NestJS 10.x, Prisma ORM, Socket.io, Hocuspocus, BullMQ
- Frontend: React 18.x, Zustand, TipTap editor, Vite, Shadcn UI
- Shared: Zod (validation), @idea/contracts (type safety)

**Storage**: PostgreSQL (Prisma) with Redis (sessions/pub-sub)
**Testing**: Vitest (unit/integration), Playwright (E2E), Test Containers
**Target Platform**: Web (SPA + REST API)
**Project Type**: Monorepo (Turbo) - web application with backend + frontend
**Performance Goals**:
- 95% of public link requests load in <2 seconds
- 99.9% uptime on public endpoints
- <1% error rate

**Constraints**:
- Rate limiting: 100 requests/minute per IP on public endpoints
- Discovery endpoint rate limiting: 10 requests/minute per IP (stricter to prevent enumeration)
- Bot filtering for view counts (using `isbot` library)
- No IP logging or cookies in Phase 1 (privacy-first)
- Public documents must use noindex meta tags (Phase 1)

**Scale/Scope**:
- Support hierarchical document trees (unlimited depth)
- Expected: 20% of users create public shares within 30 days
- Target: Public views 10x authenticated views

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

### ✅ Type Safety & Contract-First Architecture
- **Status**: COMPLIANT
- All API endpoints defined in `@idea/contracts` package
- Zod schemas for request/response validation
- Prisma schema drives database types
- No `any` types permitted

### ✅ Monorepo Modularity
- **Status**: COMPLIANT
- Backend: New `public-share` NestJS module in `apps/api/src/`
- Frontend: New components in `apps/client/src/pages/public-document/`
- Shared types in `packages/contracts/src/public-share.ts`
- No circular dependencies

### ✅ Testing-First Development
- **Status**: COMPLIANT
- Unit tests: PublicShareService business logic
- Integration tests: API endpoints with test containers
- E2E tests: Public link access, navigation, expiration flows
- Test naming: `*.unit.test.ts`, `*.int.test.ts`, `*.e2e.test.ts`

### ✅ Real-time Collaboration Architecture
- **Status**: COMPLIANT
- WebSocket events for share created/updated/revoked
- Event batching and deduplication (existing pattern)
- No Yjs changes needed (public views are read-only)
- Socket.io events notify collaborators of public share changes

### ✅ Separation of Concerns & Clean Architecture
- **Status**: COMPLIANT
- **Backend**:
  - `PublicShareController` - HTTP routing only
  - `PublicShareService` - Business logic (permissions, validation)
  - `PublicShareDto` - API contracts from @idea/contracts
  - Guards for authentication (MANAGE permission required)
- **Frontend**:
  - Components - UI rendering only
  - `publicShareStore` (Zustand) - State management
  - `usePublicShare` hooks - Reusable logic
  - No business logic in components

### ✅ Code Quality Standards
- **Status**: COMPLIANT
- Biome for linting/formatting (2-space, 160 char width)
- Lefthook pre-commit hooks
- TypeScript strict mode
- kebab-case files, PascalCase components

### ✅ Database-First with Prisma
- **Status**: COMPLIANT
- New `PublicShare` model in schema.prisma
- Workspace extension: `allowPublicSharing` boolean
- Migration required before implementation
- CLS for transaction management
- Cascade deletion on workspace/document deletion

## Project Structure

### Documentation (this feature)

```
specs/001-public-document-sharing/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (in progress)
├── research.md          # Phase 0 output (pending)
├── data-model.md        # Phase 1 output (pending)
├── quickstart.md        # Phase 1 output (pending)
├── contracts/           # Phase 1 output (pending)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```
apps/
├── api/src/
│   ├── public-share/                    # New module
│   │   ├── public-share.module.ts       # NestJS module definition
│   │   ├── public-share.controller.ts   # Routes: /api/public-shares/*, /public/*
│   │   ├── public-share.service.ts      # Business logic + findByDocId() method
│   │   ├── public-share.dto.ts          # DTOs (from @idea/contracts)
│   │   ├── public-share.presenter.ts    # Response transformation
│   │   ├── public-share.types.ts        # Internal types
│   │   └── __tests__/
│   │       ├── public-share.service.unit.test.ts
│   │       └── public-share.controller.int.test.ts
│   ├── middleware/                      # New for Smart Discovery
│   │   └── public-share-discovery.middleware.ts  # Server-side URL detection
│   ├── document/                        # Extended for discovery
│   │   └── document.controller.ts       # Add discovery endpoint
│   ├── prisma/
│   │   └── schema.prisma                # Add PublicShare model
│   └── _shared/
│       └── socket/
│           └── business-event.constant.ts  # Add public share events
│
├── client/src/
│   ├── pages/
│   │   ├── main/sharing/
│   │   │   └── public-sharing-section.tsx  # Update with API integration
│   │   ├── document/                       # Updated for discovery
│   │   │   └── index.tsx                   # Add usePublicShareDiscovery hook
│   │   └── public-document/
│   │       ├── index.tsx                    # Public page + notification handling
│   │       ├── public-layout.tsx            # New layout component
│   │       ├── public-header.tsx            # Differentiated header component
│   │       ├── user-dropdown.tsx            # Auth/unauth dropdown logic
│   │       ├── public-sidebar.tsx           # New navigation sidebar
│   │       ├── authenticated-banner.tsx     # Banner for logged-in users
│   │       └── discovery-loading.tsx        # Loading state for discovery
│   ├── stores/
│   │   └── public-share-store.ts            # New Zustand store
│   ├── hooks/
│   │   ├── use-public-share-discovery.ts    # New discovery hook
│   │   └── websocket/
│   │       └── public-share-events.ts       # WebSocket event handlers
│   ├── apis/
│   │   └── public-share.ts                  # API client + checkDiscovery()
│   └── router/
│       └── index.tsx                        # Add /public/:token routes
│
└── packages/contracts/src/
    ├── public-share.ts                      # Zod schemas + discovery response
    └── utils/
        └── document-validators.ts           # CUID validation helpers

tests/e2e/
├── public-share.e2e.test.ts                 # E2E tests
└── public-share-discovery.e2e.test.ts       # Discovery-specific E2E tests
```

**Structure Decision**: Web application (Option 2) with monorepo structure. Backend and frontend are in separate `apps/` directories. Shared contracts in `packages/` directory. This aligns with Idea Forge's existing monorepo architecture using Turbo and pnpm workspaces.

## Complexity Tracking

*No violations - all Constitution principles followed*

**Justification for architectural choices**:
- **Hybrid component architecture**: Reuses TipTap editor (DRY principle) while maintaining security boundary at layout level (separation of concerns)
- **Separate PublicShare model**: Clean separation from existing DocShare/GuestCollaborator systems (modularity)
- **No published field**: Simplified Phase 1 scope, subscriber notifications deferred to Phase 4 (YAGNI)
- **Upward traversal**: Better UX (industry standard), minimal performance cost (1-3 extra queries, cacheable)
- **Hybrid routing detection**: Solves SPA client-side routing challenge while maintaining server-side security checks

## Implementation Phases

### Overview

The implementation is organized into phases corresponding to user stories. Detailed tasks are tracked in [tasks.md](./tasks.md).

**Phase 1: Smart Share Link Discovery (User Story 7)** - 3 days
- Server-side middleware for URL detection and redirection
- Client-side fallback for SPA routes
- Notification system for redirected users
- Comprehensive testing

See [tasks.md Phase 11](./tasks.md#phase-11-user-story-7---smart-share-link-discovery-priority-p1--mvp) for detailed implementation tasks (T086-T099).

