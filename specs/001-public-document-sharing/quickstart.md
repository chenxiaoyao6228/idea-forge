# Quickstart: Public Document Sharing

**Feature**: Public Document Sharing | **For**: Developers implementing this feature

## Overview

This quickstart guide provides a step-by-step walkthrough for implementing the public document sharing feature. Follow these steps in order for a smooth implementation process.

## Prerequisites

- ✅ Read `spec.md` - Understand user stories and requirements
- ✅ Read `data-model.md` - Understand database schema
- ✅ Read `research.md` - Understand technical decisions
- ✅ Node.js 18+, pnpm 8.5.1+
- ✅ PostgreSQL and Redis running (via `pnpm dev:docker`)
- ✅ Familiarity with Idea Forge codebase structure

## Implementation Checklist

### Phase 1: Database Setup (30 minutes)

- [ ] **Step 1.1**: Update Prisma schema
  ```bash
  cd apps/api
  # Edit prisma/schema.prisma - add PublicShare model (see data-model.md)
  ```

- [ ] **Step 1.2**: Create migration
  ```bash
  pnpm prisma:migrate:dev --name add-public-share
  # Review generated migration in prisma/migrations/
  ```

- [ ] **Step 1.3**: Generate Prisma types
  ```bash
  pnpm prisma:generate
  # Verify types in node_modules/.prisma/client
  ```

- [ ] **Step 1.4**: Test schema
  ```bash
  pnpm prisma:studio
  # Verify PublicShare table appears in Prisma Studio
  ```

### Phase 2: Contracts Package (45 minutes)

- [ ] **Step 2.1**: Create Zod schemas
  ```bash
  cd packages/contracts/src
  # Create public-share.ts with schemas from contracts/public-share.schemas.ts
  ```

- [ ] **Step 2.2**: Export from index
  ```typescript
  // packages/contracts/src/index.ts
  export * from './public-share';
  ```

- [ ] **Step 2.3**: Build contracts
  ```bash
  cd packages/contracts
  pnpm build
  ```

- [ ] **Step 2.4**: Verify types
  ```bash
  # Check that types are available in apps/api and apps/client
  ```

### Phase 3: Backend Module (4-6 hours)

- [ ] **Step 3.1**: Create module structure
  ```bash
  cd apps/api/src
  mkdir public-share
  cd public-share
  touch public-share.module.ts
  touch public-share.controller.ts
  touch public-share.service.ts
  touch public-share.dto.ts
  touch public-share.presenter.ts
  touch public-share.types.ts
  ```

- [ ] **Step 3.2**: Implement `PublicShareService`
  - CUID token generation
  - Permission validation (MANAGE required)
  - Workspace setting check
  - Create/update/revoke logic
  - View count increment
  - Navigation tree building (upward traversal)

- [ ] **Step 3.3**: Implement `PublicShareController`
  - Authenticated routes: `/api/public-shares/*`
  - Public routes: `/public/:token`, `/public/:token/doc/:documentId`
  - Rate limiting setup
  - Bot detection for view tracking

- [ ] **Step 3.4**: Create DTOs
  ```typescript
  // public-share.dto.ts
  import { createPublicShareSchema } from '@idea/contracts';
  import { createZodDto } from 'nestjs-zod';

  export class CreatePublicShareDto extends createZodDto(createPublicShareSchema) {}
  ```

- [ ] **Step 3.5**: Add to AppModule
  ```typescript
  // apps/api/src/app.module.ts
  import { PublicShareModule } from './public-share/public-share.module';

  @Module({
    imports: [
      // ... existing modules
      PublicShareModule,
    ],
  })
  ```

- [ ] **Step 3.6**: Add WebSocket events
  ```typescript
  // apps/api/src/_shared/socket/business-event.constant.ts
  export const PUBLIC_SHARE_CREATED = 'publicShare:created';
  export const PUBLIC_SHARE_UPDATED = 'publicShare:updated';
  export const PUBLIC_SHARE_REVOKED = 'publicShare:revoked';
  ```

### Phase 4: Backend Tests (3-4 hours)

- [ ] **Step 4.1**: Create test structure
  ```bash
  cd apps/api/src/public-share
  mkdir __tests__
  cd __tests__
  touch public-share.service.unit.test.ts
  touch public-share.controller.int.test.ts
  ```

- [ ] **Step 4.2**: Unit tests
  - Token generation
  - Permission validation
  - Expiration calculation
  - Share state logic
  - Upward traversal algorithm

- [ ] **Step 4.3**: Integration tests
  - Create share with valid permissions
  - Reject creation without MANAGE permission
  - Reject when workspace setting disabled
  - Upsert behavior (concurrent creation)
  - Revoke share
  - Regenerate token
  - Access public document
  - View count increment
  - Bot filtering

- [ ] **Step 4.4**: Run tests
  ```bash
  pnpm test:unit
  pnpm test:integration
  ```

### Phase 5: Frontend API Client (1 hour)

- [ ] **Step 5.1**: Create API client
  ```bash
  cd apps/client/src/apis
  touch public-share.ts
  ```

- [ ] **Step 5.2**: Implement API methods
  ```typescript
  // public-share.ts
  export const publicShareApi = {
    create: (dto: CreatePublicShareDto) => http.post('/api/public-shares', dto),
    get: (docId: string) => http.get(`/api/public-shares/${docId}`),
    revoke: (docId: string) => http.delete(`/api/public-shares/${docId}`),
    regenerate: (docId: string) => http.post(`/api/public-shares/${docId}/regenerate`),
    access: (token: string) => http.get(`/public/${token}`),
    accessChild: (token: string, docId: string) => http.get(`/public/${token}/doc/${docId}`),
  };
  ```

### Phase 6: Frontend Store (2 hours)

- [ ] **Step 6.1**: Create Zustand store
  ```bash
  cd apps/client/src/stores
  touch public-share-store.ts
  ```

- [ ] **Step 6.2**: Implement store
  ```typescript
  import { create } from 'zustand';
  import { PublicShareResponse } from '@idea/contracts';

  interface PublicShareState {
    shares: Map<string, PublicShareResponse>; // docId → share
    // Actions
    setShare: (docId: string, share: PublicShareResponse) => void;
    removeShare: (docId: string) => void;
  }

  export const usePublicShareStore = create<PublicShareState>()((set) => ({
    shares: new Map(),
    setShare: (docId, share) => set((state) => ({
      shares: new Map(state.shares).set(docId, share)
    })),
    removeShare: (docId) => set((state) => {
      const newShares = new Map(state.shares);
      newShares.delete(docId);
      return { shares: newShares };
    }),
  }));
  ```

- [ ] **Step 6.3**: Create hooks
  ```typescript
  export const useCreatePublicShare = () => {
    return useRequest(async (dto: CreatePublicShareDto) => {
      try {
        const response = await publicShareApi.create(dto);
        usePublicShareStore.getState().setShare(dto.docId, response.data);
        toast.success('Public link created');
        return response;
      } catch (error) {
        toast.error('Failed to create public link');
        throw error;
      }
    }, { manual: true });
  };
  ```

### Phase 7: Frontend UI Components (4-6 hours)

- [ ] **Step 7.1**: Update sharing section
  ```bash
  cd apps/client/src/pages/main/sharing
  # Edit public-sharing-section.tsx
  ```

  Components to add:
  - Public sharing toggle
  - Expiration dropdown (Never, 1h, 1d, 1w, 1m)
  - Copy link button
  - View count display
  - Revoke button
  - Regenerate button

- [ ] **Step 7.2**: Create public document page
  ```bash
  cd apps/client/src/pages
  mkdir public-document
  cd public-document
  touch index.tsx
  touch public-layout.tsx
  touch public-sidebar.tsx
  touch authenticated-banner.tsx
  ```

- [ ] **Step 7.3**: Implement public layout
  - No workspace header
  - Minimal branding (Idea Forge logo)
  - No collaboration toolbar
  - Public sidebar (navigation tree)

- [ ] **Step 7.4**: Implement TipTap editor (read-only)
  ```typescript
  <TipTapEditor
    content={document.content}
    editable={false}
    extensions={baseExtensions}  // No collaboration extensions
  />
  ```

- [ ] **Step 7.5**: Implement navigation sidebar
  - Build tree from `navigationTree` response
  - Collapsible/expandable nodes
  - Active document highlighting
  - Click to navigate: `/public/:token/doc/:childId`

- [ ] **Step 7.6**: Implement authenticated banner
  - Show only if user is logged in AND has permissions
  - Display permission level
  - "Open in workspace" button
  - Dismissible

### Phase 8: Frontend Routing (30 minutes)

- [ ] **Step 8.1**: Add routes
  ```typescript
  // apps/client/src/router/index.tsx
  {
    path: '/public/:token',
    element: <PublicDocumentPage />,
  },
  {
    path: '/public/:token/doc/:documentId',
    element: <PublicDocumentPage />,
  }
  ```

- [ ] **Step 8.2**: Add route guards
  - No auth required for public routes
  - Rate limiting handled by backend

### Phase 9: WebSocket Integration (1 hour)

- [ ] **Step 9.1**: Add event listeners
  ```bash
  cd apps/client/src/hooks/websocket
  touch public-share-events.ts
  ```

- [ ] **Step 9.2**: Implement handlers
  ```typescript
  export function usePublicShareEvents() {
    const socket = useWebSocket();

    useEffect(() => {
      socket.on('publicShare:created', (data) => {
        usePublicShareStore.getState().setShare(data.docId, data);
        // Update UI badge
      });

      socket.on('publicShare:revoked', (data) => {
        usePublicShareStore.getState().removeShare(data.docId);
        // Remove UI badge
      });

      return () => {
        socket.off('publicShare:created');
        socket.off('publicShare:revoked');
      };
    }, [socket]);
  }
  ```

### Phase 10: End-to-End Tests (2-3 hours)

- [ ] **Step 10.1**: Create E2E test file
  ```bash
  cd tests/e2e
  touch public-share.e2e.test.ts
  ```

- [ ] **Step 10.2**: Write test scenarios
  - Create public share
  - Copy link
  - Access link in incognito (simulate anonymous user)
  - Verify read-only mode
  - Navigate child documents
  - Test expiration (use 1-hour link, fast-forward time)
  - Test revocation
  - Test authenticated user banner

- [ ] **Step 10.3**: Run E2E tests
  ```bash
  pnpm test:e2e
  pnpm test:e2e:ui  # Visual debugging
  ```

### Phase 11: Quality & Performance (2-3 hours)

- [ ] **Step 11.1**: Lint and format
  ```bash
  pnpm lint:fix
  pnpm format:fix
  ```

- [ ] **Step 11.2**: Type check
  ```bash
  pnpm typecheck:api
  pnpm typecheck:client
  ```

- [ ] **Step 11.3**: Performance testing
  - Test with large document hierarchies (100+ children)
  - Measure navigation tree build time
  - Verify view count atomic operations
  - Check rate limiting effectiveness

- [ ] **Step 11.4**: Security audit
  - Test XSS prevention (try injecting scripts)
  - Verify token guessing is infeasible
  - Test permission checks (try accessing without MANAGE)
  - Verify workspace setting enforcement

### Phase 12: Documentation & Deployment (1-2 hours)

- [ ] **Step 12.1**: Update CLAUDE.md (if needed)

- [ ] **Step 12.2**: Add feature flags (optional)
  - Environment variable: `ENABLE_PUBLIC_SHARING`
  - Defaults to `true`

- [ ] **Step 12.3**: Database migration (production)
  ```bash
  pnpm migrate:deploy
  ```

- [ ] **Step 12.4**: Deploy to staging
  - Run full test suite
  - Manual QA testing
  - Performance monitoring

- [ ] **Step 12.5**: Deploy to production
  - Feature announcement
  - Monitor error rates
  - Track success metrics (20% adoption target)

## Development Tips

### Quick Test Cycle

```bash
# Terminal 1: API with hot reload
cd apps/api
pnpm dev

# Terminal 2: Client with hot reload
cd apps/client
pnpm dev

# Terminal 3: Watch tests
pnpm test:unit --watch
```

### Common Commands

```bash
# Full dev environment
pnpm dev

# Run all tests
pnpm test

# Type check everything
pnpm typecheck

# Generate Prisma types
pnpm prisma:generate

# Open Prisma Studio
pnpm prisma:studio

# View database
PGPASSWORD=123456 psql -h localhost -p 5432 -U postgres -d ideaforge
```

### Debugging Tips

1. **Token issues**: Use Prisma Studio to verify token generation
2. **Permission errors**: Check `DocPermissionService` logs
3. **Navigation tree**: Log the upward traversal steps
4. **WebSocket events**: Use browser dev tools WebSocket tab
5. **Rate limiting**: Test with curl/Postman to avoid browser cache

### Performance Benchmarks

Expected performance targets:
- Token lookup: <10ms
- Navigation tree: <100ms
- Full page load: <2s (95th percentile)
- View count update: <5ms

### Security Checklist

Before deploying:
- ✅ XSS prevention tested (TipTap read-only)
- ✅ Permission checks on all authenticated endpoints
- ✅ Workspace setting enforced
- ✅ Rate limiting configured
- ✅ Bot filtering working
- ✅ HTTPS enforced in production
- ✅ CSP headers configured

## Troubleshooting

### Issue: "Permission denied" when creating share
- **Cause**: User lacks MANAGE permission
- **Fix**: Use DocumentPermissionService to grant MANAGE permission

### Issue: Share creation fails silently
- **Cause**: Workspace `allowPublicSharing` is false
- **Fix**: Update workspace settings or check validation logic

### Issue: Navigation tree is empty
- **Cause**: Upward traversal not finding root
- **Fix**: Verify share token matches parent documents

### Issue: View count not incrementing
- **Cause**: Bot detection filtering all requests
- **Fix**: Check `isbot` library configuration, test with real browser

### Issue: E2E tests timing out
- **Cause**: Page load too slow in test environment
- **Fix**: Increase Playwright timeout, check for network delays

## Next Steps

After completing implementation:
1. Review with team
2. Run full QA cycle
3. Deploy to staging
4. Gather user feedback
5. Plan Phase 2 features (custom slugs, SEO, analytics)

## References

- [Spec](./spec.md) - Full feature specification
- [Data Model](./data-model.md) - Database schema details
- [Research](./research.md) - Technical decisions
- [Contracts](./contracts/public-share.schemas.ts) - API schemas
- [Constitution](../../.specify/memory/constitution.md) - Project principles
- [CLAUDE.md](../../CLAUDE.md) - Development patterns

**Estimated Total Time**: 20-30 hours for complete implementation
