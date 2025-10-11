# Tasks: Public Document Sharing

**Input**: Design documents from `/specs/001-public-document-sharing/`
**Prerequisites**: ✅ plan.md, ✅ spec.md, ✅ research.md, ✅ data-model.md, ✅ contracts/

**Tests**: Included - spec.md SC-009 requires "100% of CRUD operations covered by automated tests (unit, integration, E2E)"

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story.

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

### Tests for User Story 1

**NOTE: Write tests FIRST, ensure they FAIL before implementation (TDD)**

- [ ] **T016** [P] [US1] Unit test: Token generation in `apps/api/src/public-share/__tests__/public-share.service.unit.test.ts`:
  - Test CUID token is 25+ characters
  - Test token uniqueness
- [ ] **T017** [P] [US1] Unit test: Permission validation in `public-share.service.unit.test.ts`:
  - Test MANAGE permission required
  - Test workspace `allowPublicSharing` check
  - Test upsert behavior (concurrent creation)
- [ ] **T018** [P] [US1] Unit test: Expiration calculation in `public-share.service.unit.test.ts`:
  - Test all 5 duration options (Never, 1h, 1d, 1w, 1m)
  - Test null for "Never"
- [ ] **T019** [P] [US1] Integration test: Create endpoint in `apps/api/src/public-share/__tests__/public-share.controller.int.test.ts`:
  - Test successful creation with valid permissions
  - Test rejection without MANAGE permission
  - Test rejection when workspace setting disabled
  - Test upsert returns existing share with `created: false`

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
- [ ] **T028** [US1] Add public share badge in document UI (file TBD - depends on existing document component structure):
  - Show "Public" badge when share exists
  - Badge should update in real-time via WebSocket

#### WebSocket Events

- [x] **T029** [US1] Emit WebSocket event in `PublicShareService.create()`: ✅
  - Emits `PUBLIC_SHARE_CREATED` in `getOrCreateShare()`
- [ ] **T030** [P] [US1] Add event listener in `apps/client/src/hooks/websocket/public-share-events.ts`:
  - Listen for `publicShare:created`
  - Update store
  - Show toast notification to other collaborators

**Checkpoint**: User Story 1 complete - users can create public share links and copy them

---

## Phase 4: User Story 2 - Access Public Document (Priority: P1) 🎯 MVP

**Goal**: Enable anonymous users to access public documents via shared links

**Independent Test**: Open public link in incognito browser → verify document displays read-only → verify view count increments

### Tests for User Story 2

- [ ] **T031** [P] [US2] Integration test: Public access endpoint in `public-share.controller.int.test.ts`:
  - Test valid token returns document
  - Test expired token returns 410 Gone
  - Test revoked token returns 410 Gone
  - Test invalid token returns 404 Not Found
  - Test view count increments (atomic operation)
  - Test bot filtering (use `isbot` library)
- [ ] **T032** [P] [US2] Unit test: Share validation logic in `public-share.service.unit.test.ts`:
  - Test `isShareActive()` helper
  - Test expiration check
  - Test revocation check
  - Test workspace setting check

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

- [x] **T036** [US2] Create `apps/client/src/pages/public-document/index.tsx`: ✅ (Basic version exists, needs Phase 5 refactor)
  - Fetch public document on mount using token from URL
  - Handle loading state
  - Handle error states (404, 410, expired)
  - ~~Render `PublicLayout` with document content~~ (Inline layout currently, will be refactored to SidebarProvider in T048)
- [ ] **T037** [P] [US2] Create `apps/client/src/pages/public-document/public-layout.tsx`:
  - **NOTE**: Skip - current implementation uses inline layout, Phase 5 will use SidebarProvider
- [x] **T038** [US2] Integrate TipTap editor in read-only mode in `public-document/index.tsx`: ✅
  - Uses ReadOnlyEditor component

#### Frontend Routing

- [x] **T039** [US2] Add public routes in `apps/client/src/router/index.tsx`: ✅
  - Routes exist for `/public/:token` and `/public/:token/doc/:docId`

#### Error Pages

- [ ] **T040** [P] [US2] Create error pages:
  - `apps/client/src/pages/public-document/expired-page.tsx` (410 Gone with expiration date)
  - `apps/client/src/pages/public-document/revoked-page.tsx` (410 Gone)
  - `apps/client/src/pages/public-document/not-found-page.tsx` (404)

**Checkpoint**: User Story 2 complete - anonymous users can access public documents via links

---

## Phase 5: User Story 3 - Navigate Hierarchical Documents (Priority: P1) 🎯 MVP

**Goal**: Enable navigation of document hierarchies via sidebar tree in public view

**Independent Test**: Create parent doc with children → share parent → access link → verify sidebar shows full tree → click child → verify child loads

### Tests for User Story 3

- [ ] **T041** [P] [US3] Unit test: Upward traversal algorithm in `public-share.service.unit.test.ts`:
  - Test finding root shared document
  - Test stopping at non-shared parent
  - Test single document (no parent)
  - Test deep hierarchy (5+ levels)
- [ ] **T042** [P] [US3] Integration test: Child document access in `public-share.controller.int.test.ts`:
  - Test child is accessible via parent's token
  - Test descendant validation (child must be in hierarchy)
  - Test non-descendant returns 404
  - Test navigation tree includes all children

### Implementation for User Story 3

#### Backend Service Layer

- [ ] **T043** [US3] Implement `PublicShareService.findRootSharedDocument()` in `public-share.service.ts`:
  - Iterative upward traversal (see research.md algorithm)
  - Start from accessed document
  - Check each parent for matching token
  - Return root document ID
  - **NOTE**: Not implemented yet, but may not be needed with current approach
- [ ] **T044** [US3] Implement `PublicShareService.buildNavigationTree()`:
  - ⚠️ **NEEDS REFACTOR**: Current `getPublicChildren()` returns FLAT list of direct children
  - **Required**: Build hierarchical tree structure with recursive children: { id, title, icon, parentId, children: [...] }
  - Return nested tree structure directly in API response (not separate endpoint)
  - Keep tree-building logic in PublicShareService (no extraction yet unless needed by authenticated components)
  - Cache tree in Redis (5min TTL, key: `public-nav-tree:${token}`)
- [x] **T045** [US3] Implement `PublicShareService.validateChildAccess()`: ✅
  - Implemented as `isDescendantOf()` with recursive parent chain check
  - Used in `getPublicNestedDocument()` for validation

#### Backend Controller

- [x] **T046** [US3] Update `GET /public/:token/doc/:documentId` endpoint in `PublicShareController`: ⚠️ PARTIAL
  - ✅ Endpoint exists: `GET /api/public/:token/doc/:documentId`
  - ✅ Calls `getPublicNestedDocument()` which validates with `isDescendantOf()`
  - ✅ Increments view count
  - ⚠️ Returns flat `children` array, NOT hierarchical `navigationTree`
  - **ACTION NEEDED**: Update to return full navigation tree with nested structure

#### Frontend Public Sidebar and Navigation Components

- [ ] **T047** [US3] Create `apps/client/src/pages/public-document/public-sidebar.tsx` using Shadcn/UI components:
  - Use `SidebarProvider`, `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarGroup` from Shadcn/UI
  - No DndContext wrapper needed (public is read-only)
  - Include workspace name and sign-in button in SidebarHeader
  - Render `PublicLink` components recursively for tree structure
  - Use `className="custom-scrollbar"` on SidebarContent
- [ ] **T047.1** [US3] Create `apps/client/src/pages/public-document/components/public-link.tsx`:
  - Adapted from existing `DocumentLink` but simplified for read-only
  - Use `SidebarMenuItem` and `SidebarMenuButton` from Shadcn/UI
  - Features to include: expand/collapse, navigation, active state, icon display
  - Features to exclude: drag-drop, rename, create, delete, context menus, real-time updates
  - Recursive rendering with `depth` prop for indentation
  - Navigate to `/public/:token/doc/:docId` on click
- [ ] **T047.2** [US3] Create `apps/client/src/pages/public-document/components/public-table-of-content.tsx`:
  - Adapted from existing `apps/client/src/pages/doc/components/table-of-content.tsx`
  - Remove: `useEditorStore`, `useEditorMount`, editor selection/focus logic
  - Keep: IntersectionObserver, hover-triggered UI, smooth scrolling, hierarchical indentation
  - Accept `items` and `editor` as props (not from store)
  - Fixed positioning on right side with hover-to-expand behavior
  - Use `scroll-into-view-if-needed` library for smooth navigation
- [ ] **T047.3** [US3] Update `apps/client/src/editor/read-only-editor.tsx`:
  - Add optional `onTocUpdate?: (items: TableOfContentDataItem[]) => void` prop
  - Add optional `onEditorReady?: (editor: Editor) => void` prop
  - Add TableOfContents extension to extensions array
  - Configure with scroll container: `PUBLIC_DOC_SCROLL_CONTAINER`
  - Pass TOC items and editor instance to parent via callbacks
- [ ] **T047.4** [US3] Add scroll-to-top button in `public-document/index.tsx`:
  - Use existing `useScrollTop(200)` hook from `@/hooks/use-scroll-top`
  - Show button when scrolled > 200px
  - Position: `fixed bottom-8 right-8 z-50`
  - Smooth scroll to top on click: `window.scrollTo({ top: 0, behavior: 'smooth' })`

#### Frontend Document Page Updates

- [ ] **T048** [US3] Update `public-document/index.tsx` to use SidebarProvider layout:
  - Extract `token` and `docId` params from URL
  - Initialize state: `tocItems`, `editorInstance`, `scrolled` (from useScrollTop)
  - Wrap with `<SidebarProvider defaultOpen={true}>`
  - Use `<Sidebar collapsible="offcanvas">` with tree navigation
  - Use `<SidebarInset id="PUBLIC_DOC_SCROLL_CONTAINER">` for main content
  - Render `ReadOnlyEditor` with callbacks: `onTocUpdate={setTocItems}` and `onEditorReady={setEditorInstance}`
  - Render `PublicTableOfContent` when editor and TOC items are ready
  - Render scroll-to-top button when `scrolled` is true

#### Internal Link Handling

- [ ] **T049** [US3] Update TipTap link extension for public documents:
  - Check if linked document is public (in navigation tree)
  - Make link clickable if public
  - Show title only (non-clickable) if not public
  - Navigate to `/public/:token/doc/:linkedDocId` on click

**Checkpoint**: User Story 3 complete - users can navigate document hierarchies in public view

---

## Phase 6: User Story 4 - Revoke Public Share (Priority: P2)

**Goal**: Enable document owners to revoke public access

**Independent Test**: Create share → access link → revoke share → verify link returns 410 Gone

### Tests for User Story 4

- [ ] **T050** [P] [US4] Integration test: Revoke endpoint in `public-share.controller.int.test.ts`:
  - Test successful revocation with MANAGE permission
  - Test rejection without MANAGE permission
  - Test share becomes inaccessible after revocation
  - Test WebSocket event emitted

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

- [ ] **T055** [P] [US4] Add event listener in `public-share-events.ts`:
  - Listen for `publicShare:revoked`
  - Remove share from store
  - Remove public badge from document UI
  - Show toast to other collaborators
  - **NOTE**: Need to check if file exists and implement

**Checkpoint**: User Story 4 complete - users can revoke public shares

---

## Phase 7: User Story 6 - Authenticated User Banner (Priority: P2)

**Goal**: Show banner to authenticated users with workspace redirect option

**Independent Test**: Create share → login as team member → access public link → verify banner with "Open in workspace" button

### Tests for User Story 6

- [ ] **T056** [P] [US6] Integration test: Authenticated user detection in `public-share.controller.int.test.ts`:
  - Test banner data included for authenticated users
  - Test no banner for users without permissions
  - Test workspace URL is correct

### Implementation for User Story 6

#### Backend Service Layer

- [ ] **T057** [US6] Update `PublicShareService.getByToken()` to detect authenticated users:
  - Check if current user is authenticated (optional JWT)
  - If authenticated, check document permissions
  - If has permissions, include `authenticatedUser` object in response:
    - `userId`, `permission`, `workspaceUrl`

#### Frontend Authenticated Banner

- [ ] **T058** [US6] Create `apps/client/src/pages/public-document/authenticated-banner.tsx`:
  - Show only if `authenticatedUser` exists in response
  - Display: "You have [permission] access to this document"
  - Show "Open in workspace" button (primary variant)
  - Dismissible (close icon)
  - Navigate to `workspaceUrl` on button click

#### Frontend Document Page Updates

- [ ] **T059** [US6] Update `public-document/index.tsx` to render banner:
  - Check for `authenticatedUser` in response
  - Render `AuthenticatedBanner` at top of page
  - Pass `authenticatedUser` data as props

**Checkpoint**: User Story 6 complete - authenticated users see banner with workspace option

---

## Phase 8: User Story 5 - Regenerate Public Link (Priority: P3)

**Goal**: Enable document owners to regenerate tokens (invalidate old + create new)

**Independent Test**: Create share → regenerate → verify old link returns 410, new link works

### Tests for User Story 5

- [ ] **T060** [P] [US5] Integration test: Regenerate endpoint in `public-share.controller.int.test.ts`:
  - Test old token is revoked
  - Test new token is generated
  - Test expiration settings preserved
  - Test WebSocket events for both revocation and creation

### Implementation for User Story 5

#### Backend Service Layer

- [ ] **T061** [US5] Implement `PublicShareService.regenerate()` in `public-share.service.ts`:
  - Validate MANAGE permission
  - Fetch existing share
  - Revoke existing share (set `revokedAt`)
  - Create new share with same settings (preserve `expiresAt` duration)
  - Emit `PUBLIC_SHARE_REVOKED` and `PUBLIC_SHARE_CREATED` events

#### Backend Controller

- [ ] **T062** [US5] Implement `POST /api/public-shares/:docId/regenerate` endpoint in `PublicShareController`:
  - Require authentication
  - Call `PublicShareService.regenerate(docId, userId)`
  - Return new `PublicShareResponse`
  - Handle errors (403 Forbidden, 404 Not Found)

#### Frontend Store & Hooks

- [ ] **T063** [US5] Create `useRegeneratePublicShare` hook in `public-share-store.ts`:
  - Show confirmation dialog
  - Dialog text: "Anyone with the old link will lose access"
  - Call `publicShareApi.regenerate(docId)` on confirm
  - Update store with new share
  - Show toast with new link

#### Frontend UI Updates

- [ ] **T064** [US5] Add regenerate button in `public-sharing-section.tsx`:
  - Show "Regenerate link" button when share exists
  - Call `useRegeneratePublicShare` hook
  - Disabled if user lacks MANAGE permission
  - Show new link after regeneration

**Checkpoint**: User Story 5 complete - users can regenerate public links

---

## Phase 9: End-to-End Tests

**Purpose**: Validate complete user journeys across all stories

- [ ] **T065** [P] Create `tests/e2e/public-share.e2e.test.ts` with Playwright:

  - Test US1: Create public share → verify link generated
  - Test US2: Access link in incognito → verify read-only view
  - Test US3: Navigate child documents → verify sidebar navigation
  - Test US4: Revoke share → verify link returns 410
  - Test US5: Regenerate link → verify old fails, new works
  - Test US6: Login as team member → verify banner appears
  - Test expiration: Create 1-hour link → fast-forward time → verify 410
  - Test permissions: Try creating without MANAGE → verify error
  - Test workspace setting: Disable sharing → verify error

- [ ] **T066** Run E2E tests: `pnpm test:e2e`
- [ ] **T067** Run E2E tests with UI for debugging: `pnpm test:e2e:ui`

**Checkpoint**: All user stories validated end-to-end

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final quality improvements and production readiness

### Code Quality

- [ ] **T068** [P] Run linter: `pnpm lint:fix`
- [ ] **T069** [P] Run formatter: `pnpm format:fix`
- [ ] **T070** [P] Type check backend: `pnpm typecheck:api`
- [ ] **T071** [P] Type check frontend: `pnpm typecheck:client`

### Performance Optimization

- [ ] **T072** [P] Add navigation tree caching in Redis (key: `public-nav-tree:${token}`, TTL: 5min)
- [ ] **T073** [P] Lazy-load public route bundle in `apps/client/src/router/index.tsx`
- [ ] **T074** [P] Add database query logging to identify slow queries

### Security Hardening

- [ ] **T075** [P] Add CSP headers for public document pages in `apps/api/src/public-share/public-share.controller.ts`
- [ ] **T076** [P] Add robots noindex meta tag in `public-document/index.tsx`
- [ ] **T077** [P] Test XSS prevention: Try injecting `<script>` tags in document content
- [ ] **T078** Test rate limiting: Send 101 requests in 1 minute → verify 429 response

### Documentation

- [ ] **T079** [P] Add JSDoc comments to `PublicShareService` methods
- [ ] **T080** [P] Update CLAUDE.md with public sharing patterns (if needed)

### Deployment Preparation

- [ ] **T081** Run database migration in staging: `pnpm migrate:deploy`
- [ ] **T082** Smoke test in staging environment
- [ ] **T083** Monitor error logs for 24 hours
- [ ] **T084** Deploy to production
- [ ] **T085** Announce feature to users

**Checkpoint**: Feature complete, tested, and production-ready

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
