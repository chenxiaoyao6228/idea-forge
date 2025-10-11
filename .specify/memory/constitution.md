# Idea Forge Constitution

A collaborative document platform combining Notion-like functionality with AI capabilities.

## Core Principles

### I. Type Safety & Contract-First Architecture

**All communication between frontend and backend MUST go through the shared contracts package.**

- TypeScript strict mode is mandatory across all packages
- Runtime validation via Zod schemas for all API inputs/outputs
- Shared contracts package (`@idea/contracts`) is the single source of truth for types
- Prisma schema drives database types - never manually write database types
- No `any` types except for explicitly documented legacy code

**Rationale**: Type safety prevents runtime errors and enables confident refactoring. The contracts package ensures frontend and backend stay in sync.

### II. Monorepo Modularity (NON-NEGOTIABLE)

**Every feature must be developed in isolated, well-defined modules.**

- Backend: Feature-based NestJS modules (e.g., `auth`, `document`, `workspace`)
- Frontend: Component-driven architecture with clear separation of concerns
- Shared code lives in `packages/` directory
- Module dependencies must be explicit and documented
- No circular dependencies between modules

**Structure Requirements**:
```
apps/
  ├── api/          # NestJS backend
  └── client/       # React frontend
packages/
  ├── contracts/    # Shared types and validation
  └── [future]/     # Additional shared packages
```

### III. Testing-First Development (NON-NEGOTIABLE)

**All business logic MUST have test coverage before implementation is considered complete.**

Testing layers (in order of development):
1. **Unit Tests**: Business logic, utilities, pure functions (Vitest)
2. **Integration Tests**: Service layer with real database via test containers (Vitest)
3. **E2E Tests**: Critical user journeys (Playwright)

**Test Requirements**:
- Unit tests for all services, stores, and complex utilities
- Integration tests for all database operations and API endpoints
- E2E tests for critical workflows (auth, document creation, collaboration, sharing)
- Test containers (PostgreSQL, Redis) for realistic integration testing
- Factory pattern for consistent test data generation

**Test Naming Convention**:
- `*.unit.test.ts` - Unit tests
- `*.int.test.ts` - Integration tests
- `*.e2e.test.ts` - End-to-end tests

### IV. Real-time Collaboration Architecture

**The platform is collaboration-first - all features must consider real-time implications.**

- Yjs operational transforms for conflict-free document editing
- Hocuspocus WebSocket server for document sync
- Socket.io for live features (presence, notifications, events)
- Event-driven architecture with BullMQ for async processing
- WebSocket event batching and deduplication to prevent race conditions

**Collaboration Principles**:
- Document state is stored as Yjs binary in PostgreSQL
- All document mutations go through Yjs to maintain consistency
- User presence and cursors handled via Socket.io
- Permission changes propagate via WebSocket events

### V. Separation of Concerns & Clean Architecture

**Business logic must be separated from presentation logic.**

**Backend (NestJS)**:
- Controllers handle HTTP/WebSocket routing only
- Services contain all business logic
- DTOs define API contracts (imported from contracts package)
- Guards handle authentication/authorization (JWT + CASL)
- No business logic in controllers or guards

**Frontend (React)**:
- Components handle UI rendering only
- Stores (Zustand) contain business logic and state
- Custom hooks encapsulate reusable logic
- No API calls or complex logic in components
- Functional programming - no classes

**Mandatory Patterns**:
- Use `@ahooksjs/use-request` for all async operations (with try-catch, not callbacks)
- Use `useRefCallback` for stable function references
- Keep UI state local (`useState`) - only shared data goes in global stores
- Use `react-confirm` for all modals and confirmations

### VI. Code Quality Standards

**Code quality is enforced through automated tooling - manual reviews focus on design.**

- **Linter/Formatter**: Biome (NOT ESLint or Prettier)
  - 2-space indentation
  - 160 character line width
  - Double quotes, always semicolons
- **Git Hooks**: Lefthook runs format/lint on pre-commit
- **TypeScript**: Strict mode with no implicit any
- **File Naming**: kebab-case for files, PascalCase for components/classes
- **Import Order**: External deps → Internal absolute paths → Relative imports

### VII. Database-First with Prisma

**Database schema is the source of truth - all changes go through migrations.**

- Prisma schema defines all data models
- Migrations are required for all schema changes
- Use `prisma migrate dev` for development
- Use `prisma migrate deploy` for production
- Type generation happens automatically after schema changes
- CLS (Continuation Local Storage) for transaction management
- Never write raw SQL unless absolutely necessary

**Permission System**:
- Multi-level permissions: Document → Workspace → User
- Hierarchical permission inheritance
- DIRECT, INHERITED, and WORKSPACE permission types
- Priority-based permission resolution

## Development Workflow

### Feature Development Process

1. **Design Phase**
   - Define feature requirements and acceptance criteria
   - Create/update Zod schemas in contracts package
   - Design database schema changes (if needed)
   - Write test cases (TDD approach)

2. **Implementation Phase**
   - **Backend**: Create NestJS module with service/controller/DTOs
   - **Database**: Add Prisma schema changes and run migrations
   - **Frontend**: Create components, hooks, and stores
   - **Real-time**: Add WebSocket events if needed
   - **Tests**: Write unit → integration → E2E tests

3. **Quality Gate**
   - All tests passing (`pnpm test`)
   - Code formatted and linted (`pnpm lint:fix && pnpm format:fix`)
   - Type checking passes (`pnpm typecheck:api`)
   - No console errors in development
   - PR review with design discussion

### Testing Workflow

```bash
# Backend unit tests
pnpm -F @idea/api test:unit

# Backend integration tests (uses test containers)
pnpm -F @idea/api test:integration

# E2E tests
pnpm test:e2e
pnpm test:e2e:ui        # With Playwright UI
pnpm test:e2e:debug     # Debug mode
```

### Database Workflow

```bash
# Development: Push schema changes without migration
pnpm prisma:push

# Production: Create and run migrations
pnpm migrate:dev        # Create migration
pnpm migrate:deploy     # Deploy to production

# View database
pnpm prisma:studio
```

## Technology Stack Requirements

### Backend (NestJS)
- NestJS 10.x with TypeScript 5.x
- PostgreSQL with Prisma ORM
- Redis for sessions and pub/sub
- Hocuspocus for Yjs document sync
- Socket.io for real-time features
- BullMQ for background jobs
- CASL for authorization
- Vitest for testing

### Frontend (React)
- React 18.x with TypeScript 5.x
- Vite for build tooling
- Zustand for state management
- TipTap editor with Yjs
- Shadcn UI + Radix components
- TailwindCSS for styling
- React Router for navigation
- Vitest for unit tests

### Shared Tools
- Turbo for monorepo management
- pnpm for package management
- Biome for linting/formatting
- Playwright for E2E testing
- Lefthook for git hooks

## Design Patterns

### Backend Patterns

**NestJS Module Pattern**:
```typescript
@Module({
  imports: [SharedModule, DependencyModule],
  providers: [FeatureService, FeatureGuard],
  controllers: [FeatureController],
  exports: [FeatureService]
})
export class FeatureModule {}
```

**Service Pattern** (Business Logic):
```typescript
@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: DocPermissionService
  ) {}

  async create(authorId: string, dto: CreateDocumentDto) {
    // 1. Validate input
    // 2. Check permissions
    // 3. Execute business logic
    // 4. Emit events if needed
    return result;
  }
}
```

**DTO Pattern** (API Contracts):
```typescript
// Import from contracts package
import { createDocumentSchema } from '@idea/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateDocumentDto extends createZodDto(createDocumentSchema) {}
```

### Frontend Patterns

**Hook-Based Store Pattern**:
```typescript
// Store definition
const useDocumentStore = create<DocumentState>()((set) => ({
  documents: [],
}));

// Simple selector - use direct store access
const documents = useDocumentStore((state) => state.documents);

// Computed values - use custom hook with useMemo
export const useActiveDocuments = () => {
  const documents = useDocumentStore((state) => state.documents);
  return useMemo(
    () => documents.filter(doc => doc.status === 'active'),
    [documents]
  );
};

// CRUD operations - use hooks with useRequest
export const useCreateDocument = () => {
  return useRequest(async (params: CreateDocumentDto) => {
    try {
      const response = await documentApi.create(params);
      useDocumentStore.setState((state) => ({
        documents: [...state.documents, response.data]
      }));
      toast.success('Document created');
      return response;
    } catch (error) {
      toast.error('Failed to create document');
      throw error;
    }
  }, { manual: true });
};
```

**Component Pattern** (UI Only):
```typescript
export function DocumentCard({ document }: DocumentCardProps) {
  const { run: deleteDoc, loading } = useDeleteDocument();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{document.title}</CardTitle>
      </CardHeader>
      <CardFooter>
        <Button onClick={() => deleteDoc(document.id)} disabled={loading}>
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
```

**Modal Pattern** (react-confirm):
```typescript
import { showConfirmModal } from '@/components/ui/confirm-modal';

const handleDelete = () => {
  showConfirmModal({
    type: 'alert',
    confirmVariant: 'destructive',
    title: t('Delete Document'),
    description: t('Are you sure? This cannot be undone.'),
    confirmText: t('Delete'),
    onConfirm: async () => {
      await documentApi.delete(id);
      toast.success(t('Document deleted'));
      return true;
    }
  });
};
```

## Internationalization (i18n)

**All user-facing text MUST be internationalized.**

- Use `t()` function from `react-i18next` for all text
- Design layouts to accommodate text length variations (German can be 50% longer than English)
- Use flexible widths with minimums (`min-w-[80px]`) instead of fixed widths
- Support RTL languages with Tailwind utilities (`rtl:text-right`)
- Test with long placeholder text to verify truncation handling

## Security & Performance

### Security Requirements
- JWT authentication with refresh tokens
- CASL for fine-grained authorization
- Permission inheritance with priority resolution
- Rate limiting on all public endpoints
- Helmet for security headers
- Input validation via Zod on all endpoints
- No sensitive data in client-side storage

### Performance Standards
- React.memo for expensive components
- useMemo for expensive computations
- useRefCallback (not useCallback) for stable refs
- Lazy loading for routes and heavy components
- Code splitting via dynamic imports
- Proper key props for lists
- Image optimization for assets
- Bundle size monitoring

## Governance

### Constitution Authority
- This constitution supersedes all conflicting practices
- All pull requests must demonstrate compliance
- Amendments require team approval and version update
- Breaking changes require migration plan

### Code Review Standards
- Design and architecture review (not formatting - automated)
- Test coverage verification
- Performance impact assessment
- Security implications review
- Breaking change documentation

### Development Guidance
- CLAUDE.md provides runtime development guidance for AI assistants
- .cursor/rules/ contains pattern-specific guidelines
- This constitution defines non-negotiable principles
- When in doubt, consult the constitution first

### Anti-Patterns to Avoid
- ❌ Any types in TypeScript
- ❌ Business logic in React components
- ❌ Manual type definitions (use Zod + Prisma)
- ❌ UI state in global stores
- ❌ Callbacks in useRequest (use try-catch)
- ❌ Classes in frontend code
- ❌ Direct database queries (use Prisma)
- ❌ Native confirm() dialogs (use react-confirm)
- ❌ ESLint or Prettier (use Biome)
- ❌ Schema changes without migrations

**Version**: 1.0.0 | **Ratified**: 2025-10-10 | **Last Amended**: 2025-10-10
