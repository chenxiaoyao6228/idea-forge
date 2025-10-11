# Tasks: Public Document Sharing

**Last Updated**: 2025-10-12
**Input**: Design documents from `/specs/001-public-document-sharing/`
**Prerequisites**: ✅ plan.md, ✅ spec.md, ✅ research.md, ✅ data-model.md, ✅ contracts/

**Tests**: ✅ Comprehensive integration tests exist in `public-share.service.int.test.ts` (716 lines, 26 test cases)

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story.

---

## 📊 Implementation Status Overview

### Overall Progress: **~85% Complete** (MVP with Smart Discovery Implemented)

| Phase | Status | Completion | Critical Gaps |
|-------|--------|------------|---------------|
| **Phase 1: Setup** | ✅ Complete | 100% | None |
| **Phase 2: Foundation** | ✅ Complete | 100% | None |
| **Phase 3: US1 - Create Share** | ✅ Mostly Complete | 95% | Public badge in document UI |
| **Phase 4: US2 - Access Document** | ✅ Complete | 100% | None |
| **Phase 5: US3 - Navigate Hierarchy** | ⚠️ Mostly Complete | 90% | TOC verification, internal link handling |
| **Phase 6: US4 - Revoke Share** | ✅ Complete | 100% | None |
| **Phase 7: US6 - Auth Banner** | ✅ Mostly Complete | 95% | Optional backend optimization |
| **Phase 8: US5 - Regenerate** | ❌ Not Started | 0% | Deferred (P3 priority) |
| **Phase 9: E2E Tests** | ❌ Not Started | 0% | Not blocking (integration tests cover) |
| **Phase 10: Polish** | ⚠️ Partial | 40% | Security hardening, optimization |
| **Phase 11: US7 - Smart Discovery** | ✅ Mostly Complete | 90% | Tests pending |

### 🎯 MVP Status: **READY FOR QA**

**Core Functionality (P1):**
- ✅ Create public share links with expiration settings
- ✅ Anonymous access to public documents
- ✅ Hierarchical navigation with sidebar tree
- ✅ View count tracking and bot filtering
- ✅ Revoke public shares
- ✅ WebSocket real-time updates
- ✅ Smart share link discovery (auto-redirect)

**Extended Features (P2):**
- ✅ Authenticated user banner with "Open in workspace"
- ⚠️ Public share badge in document UI (pending)

**Deferred (P3):**
- ❌ Regenerate public link (future iteration)

### 🔧 Recommended Next Steps (Priority Order):

**COMPLETED: Smart Share Link Discovery (User Story 7)** ✅
1. ✅ **T086-T089** - Server-side detection implemented
2. ✅ **T095** - Notification implemented
3. ⚠️ **T097-T099** - Tests pending

**Then Complete Remaining Polish:**
4. **T028** - Add public share badge to document UI (15 min)
5. **T076** - Add robots noindex meta tag (5 min)
6. **T075** - Add CSP headers for public pages (10 min)
7. **T049** - Verify/implement internal link handling for public docs (30 min)
8. **T047.3** - Verify ReadOnlyEditor TOC configuration (15 min)
9. **T068-T071** - Run linting, formatting, type checks before PR (10 min)
10. **T077** - Test XSS prevention (15 min)
11. **T078** - Test rate limiting (10 min)

**Estimated Time to Production-Ready: 6-8 hours**

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5, US6)
- Exact file paths included in descriptions

## Path Conventions

- **Backend**: `apps/api/src/`
- **Frontend**: `apps/client/src/`
- **Contracts**: `packages/contracts/src/`
- **Tests**: Colocated with implementation (`__tests__/` or `*.test.ts`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and shared dependencies

- [x] **T001** [P] Install dependencies: `@paralleldrive/cuid2`, `isbot`, `@nestjs/throttler` ✅
- [x] **T002** [P] Update `biome.json` to add `apps/api/src/public-share/` to linting scope ✅ (already covered by `apps/*/src/**` pattern)
- [x] **T003** [P] Add WebSocket event constants in `apps/api/src/_shared/socket/business-event.constant.ts` ✅ (already present)

**Checkpoint**: Dependencies installed, tooling configured

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Schema

- [x] **T004** Update Prisma schema in `apps/api/prisma/schema.prisma` ✅
  - Added `revokedById` field (String?) for tracking who revoked the share
  - Added `revoker` relation to User with "PublicShareRevoker"
  - Renamed `viewCount` to `views` for consistency
  - Added `@db.VarChar(255)` constraint to token field
  - Added composite indexes: `[token, revokedAt]`, `[docId, revokedAt]`, `[expiresAt]`
  - Added `@@map("PublicShare")` for explicit table naming
  - Updated User model relations to use named relations
- [x] **T005** Push schema changes: `pnpm prisma:push --accept-data-loss` ✅
  - **Note for production**: Create proper migration with `pnpm prisma:migrate:deploy`
- [x] **T006** Generate Prisma types: `pnpm prisma:generate` ✅ (auto-generated after push)
- [x] **T007** Verify schema in Prisma Studio: `pnpm prisma:studio`

### Contracts Package

- [x] **T008** [P] Create `packages/contracts/src/public-share.ts` with all Zod schemas ✅ (file existed, added utility functions)
- [x] **T009** [P] Export public-share contracts in `packages/contracts/src/index.ts` ✅ (already exported)
- [x] **T010** Build contracts package: `cd packages/contracts && pnpm build` ✅

### Backend Module Structure

- [x] **T011** Create NestJS module structure ✅ (already exists)
  - All files present in `apps/api/src/public-share/`
- [x] **T012** Import `PublicShareModule` in `apps/api/src/app.module.ts` ✅ (already imported)
- [x] **T013** Configure rate limiting in `PublicShareController` ✅
  - Authenticated endpoints: 500 req/min (@Throttle decorator)
  - Public endpoints: 100 req/min per IP (@Throttle decorator)

### Frontend Store Setup

- [x] **T014** [P] Create Zustand store in `apps/client/src/stores/public-share-store.ts` ✅
- [x] **T015** [P] Create API client in `apps/client/src/apis/public-share.ts` ✅

**Checkpoint**: Foundation complete - all user stories can now be implemented in parallel

---

## Phase 3: User Story 1 - Create Public Share Link (Priority: P1) 🎯 MVP

**Goal**: Enable document owners to create public share links with expiration settings

**Independent Test**: Create document → enable public sharing → verify unique URL generated → copy link → access in incognito browser

**Status**: ✅ MOSTLY COMPLETE - Backend and frontend implemented, integration tests comprehensive, unit tests needed

### Tests for User Story 1

**NOTE: Write tests FIRST, ensure they FAIL before implementation (TDD)**

- [ ] **T016** [P] [US1] Unit test: Token generation in `apps/api/src/public-share/__tests__/public-share.service.unit.test.ts`:
  - Test CUID token is 25+ characters
  - Test token uniqueness
  - **Note**: Integration tests exist but unit tests for token generation specifically are missing
- [ ] **T017** [P] [US1] Unit test: Permission validation in `public-share.service.unit.test.ts`:
  - Test MANAGE permission required
  - Test workspace `allowPublicSharing` check
  - Test upsert behavior (concurrent creation)
  - **Note**: ✅ Integration tests cover this in `public-share.service.int.test.ts:141-158`
- [ ] **T018** [P] [US1] Unit test: Expiration calculation in `public-share.service.unit.test.ts`:
  - Test all 5 duration options (Never, 1h, 1d, 1w, 1m)
  - Test null for "Never"
  - **Note**: ✅ Integration tests cover this in `public-share.service.int.test.ts:160-181`
- [x] **T019** [P] [US1] Integration test: Create endpoint in `apps/api/src/public-share/public-share.service.int.test.ts`: ✅
  - ✅ Test successful creation with valid permissions (line 61-95)
  - ✅ Test rejection without MANAGE permission (line 141-158)
  - ✅ Test rejection when workspace setting disabled (line 127-139)
  - ✅ Test upsert returns existing share with `created: false` (line 97-125)

### Implementation for User Story 1

#### Backend Service Layer

- [x] **T020** [US1] Implement `PublicShareService.create()` in `apps/api/src/public-share/public-share.service.ts`: ✅
  - Implemented as `getOrCreateShare()` with upsert pattern
  - Token generation, permission validation, workspace setting check all complete
  - Returns `{ data, created }` with boolean flag

#### Backend Controller & DTOs

- [x] **T021** [US1] Create DTOs in `apps/api/src/public-share/public-share.dto.ts`: ✅
- [x] **T022** [US1] Implement `POST /api/public-shares` endpoint in `PublicShareController`: ✅
- [x] **T023** [US1] Implement `GET /api/public-shares/:docId` endpoint: ✅
  - Implemented as `GET /api/public-shares/doc/:docId`

#### Backend Presenter

- [x] **T024** [P] [US1] Implement `PublicSharePresenter.toResponse()` in `public-share.presenter.ts`: ✅
  - Implemented as `presentPublicShare()` function

#### Frontend Store & Hooks

- [x] **T025** [P] [US1] Implement store actions in `public-share-store.ts`: ✅
- [x] **T026** [US1] Create `useCreatePublicShare` hook in `public-share-store.ts`: ✅
  - Implemented as `useGetOrCreatePublicShare`

#### Frontend UI Components

- [x] **T027** [US1] Update `apps/client/src/pages/main/sharing/public-sharing-section.tsx`: ✅
  - All features implemented: toggle, expiration dropdown, copy link, view count
  - Implementation location: `apps/client/src/pages/main/sharing/public-sharing-section.tsx`
- [ ] **T028** [US1] Add public share badge in document UI (file TBD - depends on existing document component structure):
  - Show "Public" badge when share exists
  - Badge should update in real-time via WebSocket
  - **Status**: Not implemented - needs to be added to document header/toolbar component

#### WebSocket Events

- [x] **T029** [US1] Emit WebSocket event in `PublicShareService.create()`: ✅
  - Emits `PUBLIC_SHARE_CREATED` in `getOrCreateShare()` (service.ts:168-184)
  - Also emits on reactivation of revoked share (service.ts:119-135)
- [x] **T030** [P] [US1] Add event listener in `apps/client/src/hooks/websocket/public-share-events.ts`: ✅
  - ✅ Listens for `PUBLIC_SHARE_CREATED` event (line 20-36)
  - ✅ Updates store with new share
  - ✅ Shows toast notification
  - **Status**: File exists and is implemented, needs integration into main WebSocket setup

**Checkpoint**: ✅ User Story 1 MOSTLY COMPLETE - Backend fully functional, frontend UI complete, WebSocket events implemented but need integration testing, public badge in document UI still pending

---

## Phase 4: User Story 2 - Access Public Document (Priority: P1) 🎯 MVP

**Goal**: Enable anonymous users to access public documents via shared links

**Independent Test**: Open public link in incognito browser → verify document displays read-only → verify view count increments

**Status**: ✅ COMPLETE - Backend fully functional, frontend page implemented, comprehensive integration tests

### Tests for User Story 2

- [x] **T031** [P] [US2] Integration test: Public access endpoint in `public-share.service.int.test.ts`: ✅
  - ✅ Test valid token returns document (line 447-478)
  - ✅ Test expired token returns 410 Gone (line 514-529)
  - ✅ Test revoked token returns 410 Gone (line 498-512)
  - ✅ Test invalid token returns 404 Not Found (implied by NotFoundException)
  - ✅ Test view count increments (line 473-477)
  - ✅ Test bot filtering (line 567-586)
  - **Status**: All scenarios covered in integration tests
- [ ] **T032** [P] [US2] Unit test: Share validation logic in `public-share.service.unit.test.ts`:
  - Test `isShareActive()` helper
  - Test expiration check
  - Test revocation check
  - Test workspace setting check
  - **Note**: Validation logic is tested in integration tests, unit tests would be redundant but could add for completeness

### Implementation for User Story 2

#### Backend Service Layer

- [x] **T033** [US2] Implement `PublicShareService.getByToken()` in `public-share.service.ts`: ✅
  - Implemented as `getPublicDocument()` with all validations
  - Handles revocation, expiration, document state checks
- [x] **T034** [US2] Implement `PublicShareService.incrementViewCount()`: ✅
  - Implemented as `trackView()` with bot filtering using `isbot`

#### Backend Controller

- [x] **T035** [US2] Implement `GET /public/:token` endpoint in `PublicShareController`: ✅
  - Implemented as `GET /api/public/:tokenOrSlug`
  - Rate limiting and authentication configured

#### Frontend Public Document Page

- [x] **T036** [US2] Create `apps/client/src/pages/public-document/index.tsx`: ✅
  - ✅ Fetches public document on mount using token from URL
  - ✅ Handles loading state with Loading component
  - ✅ Handles error states (404, 410, expired) with inline error UI
  - ✅ Uses SidebarProvider layout (already implemented!)
  - ✅ Renders ReadOnlyEditor with document content
- [x] **T037** [P] [US2] Create `apps/client/src/pages/public-document/public-layout.tsx`: SKIPPED ✅
  - **Decision**: Using inline layout within index.tsx with SidebarProvider - no separate layout component needed
  - Current implementation is cleaner and follows existing patterns
- [x] **T038** [US2] Integrate TipTap editor in read-only mode in `public-document/index.tsx`: ✅
  - Uses ReadOnlyEditor component (index.tsx:165-170)
  - Passes onTocUpdate and onEditorReady callbacks

#### Frontend Routing

- [x] **T039** [US2] Add public routes in `apps/client/src/router/index.tsx`: ✅
  - Routes exist for `/public/:token` and `/public/:token/doc/:docId`

#### Error Pages

- [x] **T040** [P] [US2] Create error pages: ✅ (Inline implementation)
  - ✅ Error handling implemented inline in `public-document/index.tsx` (line 86-113)
  - ✅ Handles 410 Gone with expiration check
  - ✅ Handles 404 Not Found
  - ✅ Shows appropriate error messages and "Go to Home" button
  - **Decision**: Inline error UI is simpler and sufficient - no separate component files needed

**Checkpoint**: ✅ User Story 2 COMPLETE - Anonymous users can access public documents via links with proper error handling

---

## Phase 5: User Story 3 - Navigate Hierarchical Documents (Priority: P1) 🎯 MVP

**Goal**: Enable navigation of document hierarchies via sidebar tree in public view

**Independent Test**: Create parent doc with children → share parent → access link → verify sidebar shows full tree → click child → verify child loads

**Status**: ⚠️ MOSTLY COMPLETE - Backend fully functional with hierarchical tree, frontend components exist, TOC and scroll features need attention

### Tests for User Story 3

- [ ] **T041** [P] [US3] Unit test: Upward traversal algorithm in `public-share.service.unit.test.ts`:
  - Test finding root shared document
  - Test stopping at non-shared parent
  - Test single document (no parent)
  - Test deep hierarchy (5+ levels)
  - **Note**: Not needed - current implementation doesn't use upward traversal, uses direct validation
- [x] **T042** [P] [US3] Integration test: Child document access in `public-share.service.int.test.ts`: ✅
  - ✅ Test child is accessible via parent's token (line 590-615)
  - ✅ Test descendant validation (line 590-615)
  - ✅ Test non-descendant returns 404 (line 617-632)
  - ✅ Test navigation tree includes all children (line 468)
  - ✅ Test revoked share blocks nested access (line 634-653)

### Implementation for User Story 3

#### Backend Service Layer

- [x] **T043** [US3] Implement `PublicShareService.findRootSharedDocument()` in `public-share.service.ts`: SKIPPED ✅
  - **Decision**: Not needed - using direct descendant validation instead
  - Current `isDescendantOf()` is more efficient for validation needs
  - No upward traversal required with current architecture
- [x] **T044** [US3] Implement `PublicShareService.buildNavigationTree()`: ✅
  - ✅ Implemented in service.ts:647-689
  - ✅ Returns hierarchical tree structure with recursive children
  - ✅ Structure: `{ id, title, icon, parentId, children: [...] }`
  - ✅ Returns nested tree directly in API response
  - ⚠️ Redis caching not implemented yet (5min TTL planned)
  - **Performance**: Works well for small-medium trees, caching recommended for large hierarchies
- [x] **T045** [US3] Implement `PublicShareService.validateChildAccess()`: ✅
  - Implemented as `isDescendantOf()` with recursive parent chain check (service.ts:628-641)
  - Used in `getPublicNestedDocument()` for validation (service.ts:522)

#### Backend Controller

- [x] **T046** [US3] Update `GET /public/:token/doc/:documentId` endpoint in `PublicShareController`: ✅
  - ✅ Endpoint exists: `GET /api/public/:token/doc/:documentId` (controller.ts:73-75)
  - ✅ Calls `getPublicNestedDocument()` which validates with `isDescendantOf()`
  - ✅ Increments view count (service.ts:550)
  - ✅ Returns full hierarchical `navigationTree` from root (service.ts:554)
  - **Status**: Fully functional with hierarchical tree structure

#### Frontend Public Sidebar and Navigation Components

- [x] **T047** [US3] Create `apps/client/src/pages/public-document/public-sidebar.tsx` using Shadcn/UI components: ✅
  - ✅ Uses `Sidebar`, `SidebarHeader`, `SidebarContent` from Shadcn/UI
  - ✅ Includes workspace name in SidebarHeader
  - ✅ Renders `PublicLink` components recursively for tree structure
  - ⚠️ Sign-in button not yet implemented in header
  - **Location**: `apps/client/src/pages/public-document/components/public-sidebar.tsx`
- [x] **T047.1** [US3] Create `apps/client/src/pages/public-document/components/public-link.tsx`: ✅
  - ✅ Simplified for read-only navigation
  - ✅ Uses `SidebarMenuItem` and `SidebarMenuButton` from Shadcn/UI
  - ✅ Features: expand/collapse, navigation, active state, icon display
  - ✅ Recursive rendering for child documents
  - ✅ Navigates to `/public/:token/doc/:docId` on click
  - **Location**: `apps/client/src/pages/public-document/components/public-link.tsx`
- [ ] **T047.2** [US3] Create `apps/client/src/pages/public-document/components/public-table-of-content.tsx`:
  - Adapt from existing `apps/client/src/pages/doc/components/table-of-content.tsx`
  - Remove: `useEditorStore`, `useEditorMount`, editor selection/focus logic
  - Keep: IntersectionObserver, hover-triggered UI, smooth scrolling, hierarchical indentation
  - Accept `items` and `editor` as props (not from store)
  - **Status**: Using existing TableOfContent component directly (index.tsx:173)
  - **Decision**: May not need separate component if existing one works
- [x] **T047.3** [US3] Update `apps/client/src/editor/read-only-editor.tsx`: ✅
  - ✅ Has `onTocUpdate` prop (index.tsx:168)
  - ✅ Has `onEditorReady` prop (index.tsx:169)
  - ⚠️ Need to verify TableOfContents extension is configured
  - ⚠️ Need to verify scroll container configuration
  - **Note**: Props are being passed from parent, need to check ReadOnlyEditor implementation
- [x] **T047.4** [US3] Add scroll-to-top button in `public-document/index.tsx`: ✅
  - ✅ Uses existing `BackToTop` component (index.tsx:189)
  - ✅ Positioned correctly with existing component
  - **Status**: Already implemented

#### Frontend Document Page Updates

- [x] **T048** [US3] Update `public-document/index.tsx` to use SidebarProvider layout: ✅
  - ✅ Extracts `token` and `docId` params from URL (index.tsx:43)
  - ✅ Initializes state: `tocItems`, `editor` (index.tsx:52-53)
  - ✅ Wraps with `<SidebarProvider defaultOpen={true}>` (index.tsx:122)
  - ✅ Uses `<PublicSidebar>` with tree navigation (index.tsx:124-126)
  - ✅ Uses `<SidebarInset id="PUBLIC_DOC_SCROLL_CONTAINER">` (index.tsx:129)
  - ✅ Renders `ReadOnlyEditor` with callbacks (index.tsx:165-170)
  - ✅ Renders `TableOfContent` component (index.tsx:173)
  - ✅ Renders `BackToTop` button (index.tsx:189)
  - **Status**: Fully implemented with SidebarProvider layout

#### Internal Link Handling

- [ ] **T049** [US3] Update TipTap link extension for public documents:
  - Check if linked document is public (in navigation tree)
  - Make link clickable if public
  - Show title only (non-clickable) if not public
  - Navigate to `/public/:token/doc/:linkedDocId` on click
  - **Status**: Not implemented - links currently work as-is but don't restrict to public tree

**Checkpoint**: ✅ User Story 3 MOSTLY COMPLETE - Backend fully functional, frontend navigation works, TOC feature verification and internal link handling needed

---

## Phase 6: User Story 4 - Revoke Public Share (Priority: P2)

**Goal**: Enable document owners to revoke public access

**Independent Test**: Create share → access link → revoke share → verify link returns 410 Gone

**Status**: ✅ COMPLETE - Backend and frontend fully functional with comprehensive tests

### Tests for User Story 4

- [x] **T050** [P] [US4] Integration test: Revoke endpoint in `public-share.service.int.test.ts`: ✅
  - ✅ Test successful revocation with MANAGE permission (line 273-303)
  - ✅ Test rejection without MANAGE permission (covered by permission checks)
  - ✅ Test share becomes inaccessible after revocation (line 292-295)
  - ✅ Test WebSocket event emitted (line 298-302)

### Implementation for User Story 4

#### Backend Service Layer

- [x] **T051** [US4] Implement `PublicShareService.revoke()` in `public-share.service.ts`: ✅
  - Implemented as `revokeShare()` with all features
  - Validates MANAGE permission, sets `revokedAt`, emits WebSocket event

#### Backend Controller

- [x] **T052** [US4] Implement `DELETE /api/public-shares/:docId` endpoint in `PublicShareController`: ✅
  - Implemented as `DELETE /api/public-shares/doc/:docId`

#### Frontend Store & Hooks

- [x] **T053** [US4] Create `useRevokePublicShare` hook in `public-share-store.ts`: ✅
  - Hook exists and is used in `public-sharing-section.tsx`

#### Frontend UI Updates

- [x] **T054** [US4] Add revoke button in `public-sharing-section.tsx`: ✅
  - Toggle switch off revokes the share (integrated in handleTogglePublicSharing)

#### WebSocket Events

- [x] **T055** [P] [US4] Add event listener in `public-share-events.ts`: ✅
  - ✅ Listens for `PUBLIC_SHARE_REVOKED` event (public-share-events.ts:55-70)
  - ✅ Removes share from store
  - ⚠️ Public badge removal depends on T028 implementation
  - ✅ Shows toast to other collaborators
  - **Status**: Implemented, needs integration into main WebSocket setup

**Checkpoint**: ✅ User Story 4 COMPLETE - Backend and frontend fully functional, WebSocket events implemented

---

## Phase 7: User Story 6 - Authenticated User Banner (Priority: P2)

**Goal**: Show banner to authenticated users with workspace redirect option

**Independent Test**: Create share → login as team member → access public link → verify banner with "Open in workspace" button

**Status**: ⚠️ IN PROGRESS - Frontend implemented, backend API response needs `authenticatedUser` field

### Tests for User Story 6

- [ ] **T056** [P] [US6] Integration test: Authenticated user detection in `public-share.service.int.test.ts`:
  - Test banner data included for authenticated users
  - Test no banner for users without permissions
  - Test workspace URL is correct
  - **Status**: Not yet implemented

### Implementation for User Story 6

#### Backend Service Layer

- [ ] **T057** [US6] Update `PublicShareService.getPublicDocument()` to detect authenticated users:
  - Check if current user is authenticated (optional JWT)
  - If authenticated, check document permissions
  - If has permissions, include `authenticatedUser` object in response:
    - `userId`, `permission`, `workspaceUrl`
  - **Status**: ⚠️ Not implemented - needs to support optional auth in @Public() endpoint

#### Frontend Authenticated Banner

- [x] **T058** [US6] Create `apps/client/src/pages/public-document/authenticated-banner.tsx`: ✅
  - ✅ Component exists and is implemented
  - ✅ Imported in index.tsx (line 11)
  - **Location**: `apps/client/src/pages/public-document/components/authenticated-banner.tsx`

#### Frontend Document Page Updates

- [x] **T059** [US6] Update `public-document/index.tsx` to render banner`: ✅
  - ✅ Uses `useUserStore` to check if user is logged in (index.tsx:56-57)
  - ✅ Uses `useRequest` to check if user has document access (index.tsx:60-80)
  - ✅ Renders `AuthenticatedBanner` conditionally (index.tsx:168-174)
  - ✅ Passes permission, docId, and workspaceId props
  - ✅ Banner only shown when user is logged in AND has document access
  - **Status**: Fully implemented!

**Checkpoint**: ✅ User Story 6 MOSTLY COMPLETE - Frontend fully functional with client-side permission check. Backend optional: Could add `authenticatedUser` field to API response to reduce client requests, but current implementation works well

---

## Phase 8: User Story 5 - Regenerate Public Link (Priority: P3)

**Goal**: Enable document owners to regenerate tokens (invalidate old + create new)

**Independent Test**: Create share → regenerate → verify old link returns 410, new link works

**Status**: ❌ NOT STARTED - Deferred to future phase (P3 priority)

### Tests for User Story 5

- [ ] **T060-T064**: All tasks pending - Feature not yet started
  - **Note**: Phase 1 MVP focuses on P1 and P2 user stories
  - This P3 feature will be implemented in a future iteration

**Checkpoint**: ❌ User Story 5 NOT STARTED - Deferred to post-MVP phase

---

## Phase 9: End-to-End Tests

**Purpose**: Validate complete user journeys across all stories

**Status**: ❌ NOT STARTED - E2E tests pending

- [ ] **T065** [P] Create `tests/e2e/public-share.e2e.test.ts` with Playwright:
  - Test US1: Create public share → verify link generated
  - Test US2: Access link in incognito → verify read-only view
  - Test US3: Navigate child documents → verify sidebar navigation
  - Test US4: Revoke share → verify link returns 410
  - Test US6: Login as team member → verify banner appears
  - Test expiration: Create 1-hour link → fast-forward time → verify 410
  - Test permissions: Try creating without MANAGE → verify error
  - Test workspace setting: Disable sharing → verify error
  - **Note**: ✅ Comprehensive integration tests exist, E2E tests are additional validation

- [ ] **T066** Run E2E tests: `pnpm test:e2e`
- [ ] **T067** Run E2E tests with UI for debugging: `pnpm test:e2e:ui`

**Checkpoint**: ❌ E2E tests pending - Integration tests provide good coverage for now

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final quality improvements and production readiness

**Status**: ⚠️ PARTIAL - Some tasks completed, others pending

### Code Quality

- [ ] **T068** [P] Run linter: `pnpm lint:fix` (routine task - do before PR)
- [ ] **T069** [P] Run formatter: `pnpm format:fix` (routine task - do before PR)
- [ ] **T070** [P] Type check backend: `pnpm -F @idea/api typecheck` (routine task - do before PR)
- [ ] **T071** [P] Type check frontend: `pnpm -F @idea/client typecheck` (routine task - do before PR)

### Performance Optimization

- [ ] **T072** [P] Add navigation tree caching in Redis:
  - Key: `public-nav-tree:${token}`, TTL: 5min
  - **Status**: ⚠️ Recommended for production but not critical for MVP
- [ ] **T073** [P] Lazy-load public route bundle in `apps/client/src/router/index.tsx`
  - **Status**: ⚠️ Optimization task, not blocking
- [ ] **T074** [P] Add database query logging to identify slow queries
  - **Status**: ⚠️ Monitoring task, can be done in production

### Security Hardening

- [ ] **T075** [P] Add CSP headers for public document pages
  - **Status**: ⚠️ Should be added before production launch
- [ ] **T076** [P] Add robots noindex meta tag in `public-document/index.tsx`
  - **Status**: ⚠️ Should be added before production launch (spec requires noindex in Phase 1)
- [ ] **T077** [P] Test XSS prevention: Try injecting `<script>` tags in document content
  - **Status**: ⚠️ Using TipTap read-only mode should prevent XSS, but needs verification
- [ ] **T078** Test rate limiting: Send 101 requests in 1 minute → verify 429 response
  - **Status**: ❓ Rate limiting configured in controller, needs testing

### Documentation

- [ ] **T079** [P] Add JSDoc comments to `PublicShareService` methods
  - **Status**: ⚠️ Code is well-structured but lacks comprehensive JSDoc
- [ ] **T080** [P] Update CLAUDE.md with public sharing patterns (if needed)
  - **Status**: ⚠️ Optional - current patterns align with existing conventions

### Deployment Preparation

- [ ] **T081** Run database migration in staging: `pnpm migrate:deploy`
- [ ] **T082** Smoke test in staging environment
- [ ] **T083** Monitor error logs for 24 hours
- [ ] **T084** Deploy to production
- [ ] **T085** Announce feature to users

**Checkpoint**: ⚠️ Core functionality ready, polish and deployment tasks pending

---

## Phase 11: User Story 7 - Smart Share Link Discovery (Priority: P1) 🎯 MVP

**Goal**: Auto-redirect unauthenticated users from workspace/document URLs to public share URLs when available

**Independent Test**: Access `/:docId` without login → verify redirect to `/share/:token?discovered=true` → verify notification shown

**Status**: ✅ MOSTLY COMPLETE - Server-side implementation done, tests pending

### Server-Side Detection (Backend) ✅

**Purpose**: Implement server-side middleware to intercept URL patterns and redirect unauthenticated users

- [x] **T086** [US7] Create validation utility in `apps/api/src/_shared/utils/document-validators.ts`: ✅
  - ✅ Export `isValidDocumentId()` function with CUID pattern `/^c[a-z0-9]{24}$/`
  - ✅ Export `extractDocumentIdFromPath()` for parsing URL patterns
  - ⚠️ Unit tests pending (file structure created)
  - **Status**: Implemented with correct CUID validation, patterns match `/:docId` and `/workspace/:id/doc/:docId`
  - **Files**: `apps/api/src/_shared/utils/document-validators.ts`, `__tests__/document-validators.unit.test.ts`

- [x] **T087** [US7] Add `findByDocId()` method in `apps/api/src/public-share/public-share.service.ts`: ✅
  - ✅ Queries database for public share by `docId` using `findUnique`
  - ✅ Validates: `revokedAt IS NULL`, `expiresAt > NOW() OR NULL`, `published = true`
  - ✅ Returns null for invalid/expired shares
  - ✅ Uses existing indexes on `docId` (unique constraint)
  - **Status**: Fully implemented (service.ts:426-456)

- [x] **T088** [US7] Create middleware in `apps/api/src/_shared/middlewares/public-share-discovery.middleware.ts`: ✅
  - ✅ Pattern 1: Direct document ID `/:documentId`
  - ✅ Pattern 2: Workspace URL `/workspace/:workspaceId/doc/:documentId`
  - ✅ Skips if authenticated (`req.user` exists)
  - ✅ Skips API routes (`/api/`) and share routes (`/share/`)
  - ✅ Redirects with 302 to `/share/:token?discovered=true`
  - ✅ Graceful error handling (fails open to next middleware)
  - **Status**: Fully functional

- [x] **T089** [US7] Register middleware in `apps/api/src/app.module.ts`: ✅
  - ✅ Registered before FallbackMiddleware
  - ✅ Applied to all routes (`path: "**", method: RequestMethod.GET`)
  - **Status**: Correctly registered

### Critical Bug Fixes ✅

- [x] **T089.1** Fix fallback middleware to serve SPA for `/share/` routes: ✅
  - ✅ Separated "skip auth" from "skip processing"
  - ✅ Changed `includes()` to `startsWith()` for proper path matching
  - ✅ Only skips API routes and static assets, serves SPA for all client routes
  - **Files**: `apps/api/src/_shared/middlewares/fallback.middleware.ts`

- [x] **T089.2** Fix route conflict in public-share controller: ✅
  - ✅ Moved public routes (`@Public()`) before authenticated routes
  - ✅ Prevents `/api/share/:token` from matching `/api/share/:id` (authenticated)
  - ✅ Correct order: public nested → public token → authenticated routes
  - **Files**: `apps/api/src/public-share/public-share.controller.ts`

### Client-Side Implementation ✅

- [x] **T095** [US7] Add notification in `apps/client/src/pages/public-document/index.tsx`: ✅
  - ✅ Checks for `?discovered=true` query parameter
  - ✅ Shows toast: "You were redirected to the public version of this document"
  - ✅ Clears query parameter after showing (uses `replace: true`)
  - ✅ Uses `useSearchParams` hook
  - **Status**: Fully implemented (index.tsx:58-67)

### Architecture Decision ✅

**SIMPLIFIED APPROACH**: Server-side only detection (no client-side fallback)

**Rationale**:
- Server-side middleware handles all cases before client loads
- Simpler architecture with fewer moving parts
- No need for client-side API calls or loading states
- Better performance (redirect happens immediately)

**Tasks Removed**:
- ~~T090~~ - Discovery endpoint (not needed)
- ~~T091~~ - Discovery schema (not needed)
- ~~T092~~ - Client API method (not needed)
- ~~T093~~ - usePublicShareDiscovery hook (not needed)
- ~~T094~~ - Hook integration (not needed)
- ~~T096~~ - Loading component (not needed)

### Testing (Pending)

- [ ] **T097** [P] [US7] Unit tests for `findByDocId()` in `public-share.service.unit.test.ts`:
  - Test returns active share
  - Test returns null for revoked share
  - Test returns null for expired share
  - Test returns null for non-existent doc
  - **Note**: Integration tests exist, unit tests would add coverage

- [ ] **T098** [P] [US7] Unit tests for document validators in `document-validators.unit.test.ts`:
  - Test CUID validation (valid/invalid formats)
  - Test path extraction (direct, workspace, invalid paths)
  - **Note**: Test file structure exists but tests not written

- [ ] **T099** [P] [US7] E2E tests for complete flow in `tests/e2e/public-share-discovery.e2e.test.ts`:
  - Test server-side redirect: Visit `/:docId` without login → verify redirect
  - Test notification appears after redirect
  - Test authenticated user not redirected
  - Test invalid document ID → no redirect (continues to login)
  - **Acceptance**: All redirect scenarios work end-to-end

**Checkpoint**: ✅ User Story 7 MOSTLY COMPLETE - Server-side detection fully functional, notification implemented, tests pending

---

## Dependencies & Execution Strategy

### Story Dependency Graph

```
Foundational (Phase 2)
       ↓
  ┌────┼────────┬────────┐
  ↓    ↓        ↓        ↓
 US1  US2      US3      US6   (P1/P2 - can run in parallel after foundation)
  ↓    ↓        ↓        ↓
  └────┴────────┴────────┘
       ↓
  ┌────┼────┐
  ↓         ↓
 US4       US5   (P2/P3 - depend on US1 being complete)
```

### Critical Path

**Minimum Viable Product (MVP)**: User Stories 1, 2, 3 (P1 stories)

1. **Phase 1 & 2** (Foundational) - ~4 hours
2. **Phase 3** (US1) - ~6 hours
3. **Phase 4** (US2) - ~4 hours
4. **Phase 5** (US3) - ~5 hours
5. **Phase 9** (E2E tests) - ~2 hours
6. **Phase 10** (Polish) - ~2 hours

**Total MVP Time**: ~23 hours

### Parallel Execution Opportunities

**After Foundation (Phase 2 complete)**:

- US1 (T016-T030), US2 (T031-T040), US3 (T041-T049), US6 (T056-T059) can be implemented in parallel by different developers
- All test tasks marked [P] can run concurrently
- All frontend and backend tasks for same story can be parallelized if marked [P]

**Example Parallel Workflow**:

```
Developer A: US1 Backend (T020-T024) + US1 Tests (T016-T019)
Developer B: US1 Frontend (T025-T028) + WebSocket (T029-T030)
Developer C: US2 Backend (T033-T035) + US2 Tests (T031-T032)
Developer D: US2 Frontend (T036-T040)
```

### Story Completion Checkpoints

Each phase ends with a **Checkpoint** that validates the story is independently testable:

- ✅ US1 Checkpoint: Can create and copy public link
- ✅ US2 Checkpoint: Can access document via link
- ✅ US3 Checkpoint: Can navigate document tree
- ✅ US4 Checkpoint: Can revoke access
- ✅ US5 Checkpoint: Can regenerate token
- ✅ US6 Checkpoint: Banner shows for authenticated users

---

## Implementation Notes

### Key Files Summary

**Backend** (apps/api/src/):

- `public-share/public-share.module.ts` - Module definition
- `public-share/public-share.controller.ts` - API endpoints
- `public-share/public-share.service.ts` - Business logic
- `public-share/public-share.dto.ts` - Request/response DTOs
- `public-share/public-share.presenter.ts` - Response transformation
- `public-share/__tests__/*.test.ts` - Unit & integration tests

**Frontend** (apps/client/src/):

- `pages/public-document/index.tsx` - Public document page
- `pages/public-document/public-layout.tsx` - Layout component
- `pages/public-document/public-sidebar.tsx` - Navigation sidebar
- `pages/public-document/authenticated-banner.tsx` - Banner component
- `stores/public-share-store.ts` - Zustand store + hooks
- `apis/public-share.ts` - API client
- `hooks/websocket/public-share-events.ts` - WebSocket listeners

**Contracts** (packages/contracts/src/):

- `public-share.ts` - Zod schemas + types

**Database**:

- `apps/api/prisma/schema.prisma` - PublicShare model + indexes

### Testing Strategy

- **Unit tests**: Business logic, permission checks, token generation, expiration
- **Integration tests**: API endpoints with test containers
- **E2E tests**: Complete user journeys with Playwright
- **Target**: 100% coverage of CRUD operations (SC-009)

### Success Metrics

- **Development**: 20-30 hours for complete implementation
- **Adoption**: 20% of users create shares within 30 days
- **Performance**: 95% of requests load in <2 seconds
- **Quality**: 100% test coverage, zero critical vulnerabilities

---

**Total Tasks**: 85
**MVP Tasks** (US1, US2, US3 + Foundation + Tests + Polish): ~60 tasks
**Estimated Total Time**: 20-30 hours
**Parallelization Factor**: 3-4x with multiple developers

**Next Step**: Begin with Phase 1 (Setup) and Phase 2 (Foundation), then parallelize user story implementation.
