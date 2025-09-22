# Repository Guidelines

## Project Structure & Modules

- `apps/api`: NestJS backend with Prisma migrations in `prisma/`; sample env in `.env.example`.
- `apps/client`: Vite + React front end; vitest specs under `test/`; translations live in `apps/`.
- `packages/contracts`: Shared Typescript schemas and mail utilities consumed by API and client.
- `tests/` holds Playwright E2E suites; `docs/` stores marketing assets; automation scripts live in `scripts/`.

## NestJS API

### Scope & Workflow Expectations

- Target files: `apps/api/src/**` plus shared utilities under `@/_shared`.
- The API dev server might already be running externally; never run `pnpm dev` inside Codex unless the user confirms it is safe.
- Prefer incremental edits: explain schema, DTO, and module impacts before touching files with Prisma migrations or background jobs.
- Validate major flows with available test commands only when necessary (`pnpm -F @idea/api test` or `pnpm test`); report unrun checks.

### Architectural Conventions

- Each feature lives in its own module directory with `*.module.ts`, `*.service.ts`, `*.controller.ts`, `dto/`, and optional `guards/`, `strategies/`, `listeners/`.
- Shared providers reside in `_shared/` (config, database, queues, socket, CASL, mail). Import them via path aliases instead of relative paths.
- Stick to Nest dependency-injection patterns (`@Injectable`, constructor injection). Provide modules with `ModuleMetadata` arrays (`imports`, `providers`, `controllers`, `exports`).
- Controllers expose REST endpoints only; shift workflows to services and reuse shared exceptions (`@/_shared/exceptions`).

### DTOs, Validation, and Contracts

- Mirror API payloads with Zod schemas from `@idea/contracts`; extend or narrow using `.partial()`, `.pick()`, or `.omit()`.
- Generate DTO classes using `createZodDto(schema)` and keep them colocated in `*.dto.ts` files.
- Accept `@Body()`/`@Query()` parameters as DTOs and prefer `@Patch` for partial updates.
- Align Prisma type usage with DTOs; cast minimal fields and surface domain-specific exceptions for missing records.

### Persistence & Prisma Usage

- Access the database through `PrismaService`; never instantiate Prisma clients directly.
- Prefer atomic updates and transactions for collaborative document changes; encapsulate repeated selectors in private helpers.
- Respect audit fields (`createdById`, `lastModifiedById`, `publishedAt`) and workspace scoping—propagate `userId` through service methods.
- Keep Prisma schema changes in migrations and document breakages in PR descriptions.

### Auth, Authorization, and Realtime

- Use guards (`PolicyGuard`, `JwtAuthGuard`) and `@UseGuards` decorators on controller routes.
- Policies are defined via CASL; update abilities in `_shared/casl` when introducing new actions.
- For collaborative endpoints, integrate with Hocuspocus/Yjs services from `@/collaboration` and reuse shared WebSocket strategies.

### Error Handling & Responses

- Throw typed exceptions (`ApiException`, `ResourceNotFoundException`) with consistent `ErrorCodeEnum` values.
- Lean on global filters for translation; avoid in-controller `try/catch` unless remapping external errors.

### Testing Standards

- Unit and integration tests use Vitest (`apps/api/test`).
- Name test files `*.spec.ts`; mirror module structure.
- Mock external services (mail, Redis, BullMQ) via factories under `apps/api/test/__mocks__`.
- Update fixture builders when altering Prisma models.

### Tooling & Quality Gates

- Run `pnpm lint`/`pnpm format` after larger refactors; Biome enforces 2-space indents, double quotes, 160-char line width.
- Lefthook pre-commit hooks run automatically; keep the tree clean before committing.
- Document new environment variables in `apps/api/.env.example`.

Use this sheet as authoritative context when the Codex agent edits backend code.

## React Client

### Scope & Workflow Expectations

- Applies to `apps/client/src/**` plus shared UI packages (`packages/ui`, `packages/mindmap`).
- Codex should avoid running long-lived dev servers; rely on static analysis and focused test commands (`pnpm -F @idea/client test`).
- Communicate UI or build impacts up front (routes, stores, editor behaviors) before touching multiple packages.

### Project Structure & Imports

- Organize features inside `components/`, `pages/`, `hooks/`, `stores/`, `lib/`, `router/`, `types/`.
- Prefer absolute imports via configured aliases; avoid deep relative paths.
- Co-locate barrel exports (`index.ts`) with component directories for discoverability.

### Component & State Patterns

- Separate presentation and logic. Place business logic in Zustand stores (`apps/client/src/stores/**`) or reusable hooks under `hooks/`.
- Keep React components as functions; name components in PascalCase, hooks as `useX`, stores as `createXStore`.
- Memoize expensive derived state with `useMemo`/`useCallback`. Use Suspense and error boundaries for async-heavy routes.
- Manage modal flows with the shared confirmation utilities (`react-confirm`) or dedicated store slices.

### Styling & UI Systems

- Tailwind + Shadcn UI components are the baseline; declare class names with `cn()` helper and CVA when variants diverge.
- Store shared design tokens in `packages/ui`; only add local CSS modules when Tailwind cannot express the styling.
- Respect accessibility (ARIA attributes, keyboard handlers) consistent with Radix primitives.

### Internationalization

- Wrap user-visible strings with `t()` and maintain keys under `apps/client/apps/**/locales`.
- Run `pnpm i18n:process` after introducing new copy; include translation updates in the same change.

### Data & Networking

- Consume the API through typed client helpers in `lib/api.ts` or contract-generated types (`@idea/contracts`).
- For collaborative editor features, integrate with Yjs/TipTap utilities provided under `components/editor/` and `packages/mindmap`.
- Handle async state with `@ahooksjs/use-request` or Zustand actions; surface loader states (`isLoading`, `error`) explicitly.

### Testing & Quality

- Write component tests with Vitest + Testing Library (`apps/client/test`); name files `*.spec.tsx` mirroring the source tree.
- Mock network calls with MSW or local helpers; snapshot only for stable UI fragments.
- Run `pnpm lint` and `pnpm format` for UI changes; Biome enforces 2-space indent, double quotes, max width 160.

### Performance & Accessibility

- Lazy-load large routes or editors via dynamic `import()`.
- Optimize images (use `WebP`, specify sizes) and enable virtualization for long lists.
- Ensure focus management on dialogs/menus and provide keyboard shortcuts where applicable.

Use this reference when Codex works on the client so generated changes remain aligned with the existing architecture.

## Build, Test, and Development Commands

- `pnpm install && pnpm run setup`: Install dependencies, register lefthook, and seed local API config.
- `pnpm run dev` (or `pnpm dev:client`, `pnpm dev:api`): Launch full stack or targeted services.
- `pnpm build`, `pnpm build:client`, `pnpm build:api`: Turbo-powered production builds per package.
- `pnpm lint`, `pnpm format:fix`: Apply Biome linting and formatting across the workspace.
- `pnpm test`, `pnpm test:e2e`, `pnpm test:e2e:ui`: Run Vitest suites and Playwright E2E checks; use `pnpm test:e2e:report` for triage.

## Testing Expectations

- Unit tests use Vitest (`apps/*/test`); mirror source structure and suffix files with `.spec.ts`.
- API integration flows live in `apps/api/test`; reuse Prisma factories and test mailers via stubs.
- Playwright specs reside in `tests/`; run `pnpm test:e2e` before opening a PR and attach report links when flaky.
- Add regression coverage whenever modifying collaborative editing, AI prompts, or document persistence paths.

## Coding Style & Naming

- Biome enforces two-space indents, 160-char max width, double quotes, and semicolons.
- Keep reusable schema and Prisma helpers in `packages/contracts`; avoid duplicating API DTOs.
- Lefthook pre-commit hooks run format and lint—commit only with a clean tree.

## Commit & Pull Request Checklist

- Follow Conventional Commits (e.g., `feat(client): draft toolbar shortcuts`); scope by package when helpful.
- Provide PR context, linked issues, and flag migrations, env, or Docker adjustments in the description.
- Record UI screenshots or clips for visual updates; enumerate test commands executed.
- Keep migrations idempotent and accompany schema changes with notes in `docs/` if user-facing.
- Update locale bundles via `pnpm i18n:process` whenever introducing new copy.

## Environment & Security Notes

- Copy `apps/api/.env.example` before development; never commit real credentials.
- Ensure Docker services from `apps/api/docker-compose-dev.yml` are running prior to `pnpm migrate:dev` or `pnpm prisma:studio`.
- Clear stale build artifacts with `pnpm clean` or `pnpm removeCache` before filing build issues.
