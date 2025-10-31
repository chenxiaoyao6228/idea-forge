# Project Context

## Purpose
Idea Forge is a collaborative document platform that combines Notion-like functionality with AI capabilities. The platform provides:
- Real-time collaborative document editing with conflict-free synchronization
- Multi-tenant workspace management with hierarchical permissions
- Rich text editing with block-based content structure
- Document sharing and granular access control
- Real-time notifications and user presence
- AI-powered document assistance

## Tech Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Cache & Pub/Sub**: Redis
- **Real-time**: Hocuspocus WebSocket server (Yjs document sync)
- **Authentication**: JWT with passport (local, GitHub, Google strategies)
- **Background Jobs**: BullMQ for async processing
- **File Storage**: S3-compatible storage (MinIO for local dev)
- **Validation**: Zod schemas

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand with hook-based architecture
- **UI Framework**: Shadcn UI + TailwindCSS
- **Editor**: TipTap (built on ProseMirror)
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: @ahooksjs/use-request for async state
- **Real-time**: Socket.io client + Yjs provider

### Collaboration & Real-time
- **CRDT**: Yjs for operational transforms (conflict-free collaborative editing)
- **WebSocket Server**: Hocuspocus for Yjs document state management
- **Live Features**: Socket.io for presence, cursors, notifications
- **Persistence**: Binary Yjs documents stored in PostgreSQL

### Monorepo & Build
- **Package Manager**: pnpm with workspaces
- **Build System**: Turbo for monorepo orchestration
- **Linting/Formatting**: Biome (NOT ESLint/Prettier)
- **Git Hooks**: Lefthook for pre-commit checks
- **Testing**: Vitest (unit/integration), Playwright (e2e)

## Project Conventions

### Code Style
- **Linter & Formatter**: Biome exclusively (configured in `biome.json`)
  - 2-space indentation
  - 160 character line width
  - Semicolons required
  - Single quotes preferred
- **TypeScript**: Strict mode enabled across all packages
- **File Naming**:
  - Components: PascalCase (e.g., `DocumentEditor.tsx`)
  - Utilities/hooks: kebab-case (e.g., `use-document.ts`)
  - Tests: `*.test.ts`, `*.unit.test.ts`, `*.int.test.ts`
- **Import Order**: External deps → internal deps → types → styles
- **Component Structure**: Functional components with TypeScript, hooks-based

### Architecture Patterns

#### Monorepo Structure
```
idea-forge/
├── apps/
│   ├── api/          # NestJS backend
│   └── client/       # React frontend
├── packages/
│   ├── contracts/    # Shared TypeScript types & Prisma client
│   ├── mindmap/      # Mind map features
│   └── ui/           # Shared UI components
```

#### Backend (NestJS)
- **Module-based**: Feature modules (auth, document, workspace, notification, etc.)
- **Dependency Injection**: Constructor-based DI throughout
- **Transaction Management**: CLS (continuation-local-storage) for Prisma transactions
- **Validation**: Zod schemas for DTOs with automatic validation pipes
- **Error Handling**: Global exception filters with structured responses
- **API Documentation**: Swagger/OpenAPI auto-generated from decorators

#### Frontend (React)
- **Component Patterns**:
  - Functional components with hooks
  - Shadcn UI patterns for consistent styling
  - Component composition over inheritance
- **State Management**:
  - Zustand stores for global state
  - Hook-based access (`useDocumentStore`, `useAuthStore`)
  - Computed values via selectors
- **Styling**:
  - TailwindCSS utility classes
  - CVA (class-variance-authority) for component variants
  - Shadcn UI components as base
- **Routing**: React Router with nested routes

#### Real-time Collaboration
- **Document Sync**: Yjs operational transforms ensure conflict-free editing
- **WebSocket Management**: Hocuspocus server handles Yjs document state
- **Persistence**: Automatic saves to PostgreSQL with version history
- **Conflict Resolution**: Automatic merge via Yjs algorithms
- **User Presence**: Socket.io for cursors, selections, and online status

#### Permission System
Multi-level permissions with inheritance chain:
1. **Document-level**: Direct user/guest permissions (highest priority)
2. **Workspace-level**: Inherited from workspace membership
3. **Subspace-level**: Hierarchical permission inheritance from parent documents
4. **Priority System**: Explicit > Inherited, with numeric priority for conflict resolution

### Development Patterns

#### API Development (NestJS)

**Type Safety & Validation:**
- **Always** define Zod schemas in `@idea/contracts` package for shared types
- Use `nestjs-zod` to generate DTOs from Zod schemas automatically
- Import schemas from contracts: `import { UserSchema } from "@idea/contracts"`
- DTOs provide automatic validation via NestJS pipes

**HTTP Methods:**
- **CRITICAL**: Always use `@Patch` for partial updates (NOT `@Put`)
- `@Post` for creation
- `@Get` for retrieval
- `@Delete` for deletion
- Example:
```typescript
@Patch(':id')  // ✅ Correct for updates
async update(@Param('id') id: string, @Body() dto: UpdateDto) { ... }

@Put(':id')    // ❌ Never use Put for updates
```

**Controller Pattern:**
- Apply guards for authentication/authorization: `@UseGuards(PolicyGuard)`
- Inject services via constructor dependency injection
- Use DTOs for all request bodies and query parameters
- Keep controllers thin - delegate business logic to services
- Example:
```typescript
@UseGuards(PolicyGuard)
@Controller('/api/notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly settingService: NotificationSettingService,
  ) {}

  @Get('settings')
  async getSettings(@GetUser('id') userId: string) {
    return this.settingService.getUserSettings(userId);
  }

  @Patch('settings/:category')
  async updateSettings(
    @GetUser('id') userId: string,
    @Param('category') category: NotificationCategory,
    @Body() dto: UpdateCategorySettingsRequest
  ) {
    return this.settingService.updateCategorySettings(userId, category, dto.enabled);
  }
}
```

**Service Pattern:**
- Inject `PrismaService` via constructor for database access
- Keep methods focused on single responsibility
- Validate input at service boundaries
- Return typed responses matching contract schemas
- Handle errors with appropriate exceptions (BadRequestException, NotFoundException, etc.)
- Example:
```typescript
@Injectable()
export class NotificationSettingService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserSettings(userId: string): Promise<GetNotificationSettingsResponse> {
    const settings = await this.prisma.notificationSetting.findMany({
      where: { userId },
    });
    // Transform and return...
  }
}
```

**Module Registration:**
- Register services in module `providers` array
- Export services that need to be used by other modules
- Import required modules (PrismaModule, etc.)
- Example:
```typescript
@Module({
  imports: [PrismaModule],
  providers: [NotificationService, NotificationSettingService],
  controllers: [NotificationController],
  exports: [NotificationService, NotificationSettingService],
})
export class NotificationModule {}
```

#### UI Component Development (React)

**Confirmation Dialogs - MANDATORY PATTERN:**
- **ALWAYS** use `showConfirmModal` from `@/components/ui/confirm-modal`
- **NEVER** use native browser `confirm()` or `alert()`
- **NEVER** create custom AlertDialog implementations with local state
- **MANDATORY**: All modal functions must start with `show` prefix

**showConfirmModal API:**
```typescript
import { showConfirmModal } from "@/components/ui/confirm-modal";
import { useTranslation } from "react-i18next";

// In component
const { t } = useTranslation();

const confirmed = await showConfirmModal({
  type: "alert",                        // or "confirm"
  confirmVariant: "destructive",        // or "default"
  title: t("Disable Notifications?"),
  description: t("Are you sure you want to disable this category?"),
  confirmText: t("Disable"),
  cancelText: t("Cancel"),
});

if (confirmed) {
  // User clicked confirm
  performAction();
} else {
  // User clicked cancel or closed dialog
}
```

**Example Usage in Event Handler:**
```typescript
const handleToggleChange = async (category: string, enabled: boolean) => {
  // Show warning when disabling important features
  if (!enabled && isActionRequired) {
    const confirmed = await showConfirmModal({
      type: "alert",
      confirmVariant: "destructive",
      title: t(`Disable ${category} Notifications?`),
      description: t("This may cause you to miss important events."),
      confirmText: t("Disable Notifications"),
      cancelText: t("Cancel"),
    });

    if (!confirmed) {
      return; // User cancelled - exit early
    }
  }

  // Proceed with the action
  updateSetting({ category, enabled });
};
```

**Common Patterns:**
```typescript
// ❌ WRONG - Don't use native confirm
if (window.confirm("Are you sure?")) { ... }

// ❌ WRONG - Don't use custom AlertDialog with state
const [dialogOpen, setDialogOpen] = useState(false);
<AlertDialog open={dialogOpen}>...</AlertDialog>

// ✅ CORRECT - Use showConfirmModal
const confirmed = await showConfirmModal({
  type: "alert",
  title: t("Confirm Action"),
  description: t("Description here"),
  confirmText: t("Confirm"),
  cancelText: t("Cancel"),
});
if (confirmed) { /* do action */ }
```

**Modal Function Naming:**
- All modal utility functions must start with `show` prefix
- Examples: `showConfirmModal`, `showDeleteDialog`, `showSettingsModal`
- This ensures consistent API and easy discoverability

### Testing Strategy

#### Unit Tests
- **Framework**: Vitest for both API and client
- **Location**: Co-located with source files (`*.unit.test.ts`)
- **Coverage**: Business logic, utilities, pure functions, complex components
- **Mocking**: Test doubles for external dependencies
- **Naming**: `describe('ClassName/functionName', () => { it('should...') })`

#### Integration Tests
- **Framework**: Vitest with test containers
- **Location**: `*.int.test.ts` files
- **Database**: Real PostgreSQL/Redis instances via test containers
- **Transactions**: Each test runs in isolated transaction (rolled back after)
- **Scope**: Service layer, database operations, API endpoints
- **Commands**:
  - `pnpm -F @idea/api test:int` - All integration tests
  - `pnpm -F @idea/api test:int:watch` - Watch mode
  - `pnpm -F @idea/api test:int path/to/file.int.test.ts` - Specific file

#### E2E Tests
- **Framework**: Playwright with TypeScript
- **Location**: `e2e/` directory
- **Scope**: Critical user journeys (auth, document CRUD, collaboration, sharing)
- **Environment**: Isolated test environment with seeded data
- **Commands**:
  - `pnpm test:e2e` - Headless mode
  - `pnpm test:e2e:ui` - Interactive UI mode
  - `pnpm test:e2e:debug` - Debug mode

### Git Workflow
- **Main Branch**: `main`
- **Feature Branches**: `feat-*` (e.g., `feat-notification`)
- **Hooks**: Lefthook runs on pre-commit:
  - Format check (Biome)
  - Lint check (Biome)
  - Type check (TypeScript)
- **Commit Messages**: Conventional commits format (feat:, fix:, docs:, etc.)
- **Type Checking**: Always run after changes:
  - `pnpm -F @idea/client typecheck`
  - `pnpm -F @idea/api typecheck`
- **Contract Updates**: Contracts are automatically bundled by Vite (client) and Webpack (API). No build step needed.

## Domain Context

### Document Collaboration
- **Operational Transforms**: Uses Yjs CRDT for automatic conflict resolution
- **Binary Format**: Documents stored as Yjs binary updates in PostgreSQL
- **Block-based Structure**: Documents composed of blocks (paragraphs, headings, lists, etc.)
- **Real-time Sync**: Sub-second synchronization across all connected clients
- **Offline Support**: Yjs allows offline editing with automatic sync on reconnection

### Multi-tenant Architecture
- **Workspaces**: Top-level isolation boundary (separate data, permissions, settings)
- **Subspaces**: Hierarchical document organization within workspaces
- **Guest Access**: Temporary access links for external users without accounts
- **Cross-workspace**: Recent feature enabling document access across workspaces

### Permission Model
- **Roles**: Owner, Admin, Editor, Commenter, Viewer
- **Inheritance**: Permissions flow from workspace → subspace → document
- **Priority System**: Explicit permissions override inherited (with numeric priority)
- **Guest Permissions**: Time-limited or revocable access for external users

### Notification System
- **Real-time**: Socket.io broadcasts notifications instantly
- **Types**: Mentions, shares, comments, document updates
- **Delivery**: In-app notifications with read/unread state
- **Persistence**: Stored in PostgreSQL with user preferences
- **Cross-workspace**: Recent enhancement for notifications across workspace boundaries

## Important Constraints

### Development Environment
- **Node.js**: Version 18+ required
- **pnpm**: Version 8.5.1+ for workspace management
- **Docker**: Required for PostgreSQL, Redis, MinIO services
- **No Manual Dev Commands**: Dev servers auto-start with hot-reload, never run manually

### Code Quality
- **Biome Only**: NO ESLint or Prettier - Biome handles both linting and formatting
- **Strict TypeScript**: Strict mode must remain enabled
- **Test Coverage**: New features require corresponding tests
- **Type Safety**: Shared contracts package ensures API/client type consistency

### Performance
- **Bundle Size**: Monitor client bundle, lazy-load heavy features
- **Database Queries**: Use Prisma's query optimization, avoid N+1 queries
- **Real-time Overhead**: Limit Socket.io broadcasts, batch updates when possible
- **Yjs Document Size**: Large documents may need chunking or optimization

### Dependencies
- **Check Before Installing**: Always verify existing dependencies before adding new ones
- **Workspace-specific**: Use `pnpm -F @idea/client add` or `pnpm -F @idea/api add`
- **Version Compatibility**: Ensure new deps work with existing React 18, NestJS 10
- **License Compliance**: Verify license compatibility for new dependencies

## External Dependencies

### Required Services
- **PostgreSQL**: Primary database (port 5432)
  - Stores application data, user accounts, permissions
  - Stores Yjs documents as binary data
  - Version: 14+
- **Redis**: Cache and pub/sub (port 6379)
  - Session storage
  - Real-time event pub/sub for Socket.io
  - BullMQ job queues
- **S3-compatible Storage**: File attachments
  - MinIO for local development (port 9000)
  - AWS S3 or compatible for production

### WebSocket Services
- **Hocuspocus Server**: Integrated in NestJS app
  - Manages Yjs document state
  - Handles WebSocket connections for collaboration
  - Persists Yjs updates to PostgreSQL
- **Socket.io Server**: Integrated in NestJS app
  - User presence and cursors
  - Real-time notifications
  - Live updates (non-document features)

### Authentication Providers
- **Local**: Email/password authentication
- **GitHub OAuth**: Social login
- **Google OAuth**: Social login

### Development Tools
- **Prisma Studio**: Database GUI (port 5555)
- **Docker Compose**: Local service orchestration
- **Turbo**: Monorepo task runner and caching
