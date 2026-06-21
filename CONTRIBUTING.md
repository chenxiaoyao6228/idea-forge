# Contributing to Idea Forge

Thanks for your interest in contributing! Idea Forge is a collaborative document
platform combining Notion-like editing with AI capabilities. This guide explains how to
set up the project, the conventions we follow, and how to submit changes.

> 中文版本请见 [CONTRIBUTING-CN.md](CONTRIBUTING-CN.md)。

## Ways to contribute

- 🐛 Report bugs and issues
- 💡 Propose new features
- 🎨 Improve UI/UX
- 📚 Enhance documentation
- 🌍 Add translations

For bugs and feature requests, please [open an issue](https://github.com/chenxiaoyao6228/idea-forge/issues)
before starting significant work so we can discuss the approach.

## Prerequisites

- **Node.js** `>=18`
- **pnpm** `>=8.5.1` (this repo enforces pnpm — npm/yarn are blocked)
- **Docker** and **Docker Compose** (used to run PostgreSQL, Redis, and MinIO locally)

## Getting started

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone git@github.com:<your-username>/idea-forge.git
cd idea-forge

# 2. Install dependencies and run the one-time setup
pnpm install && pnpm run setup
```

`pnpm run setup` will:

- Create `.vscode/settings.json` from the example (if missing)
- Copy `.env.example` to `.env`
- Start the Docker services (PostgreSQL, Redis, MinIO) via `docker-compose-dev.yml`
- Create the default MinIO bucket
- Generate the Prisma client and apply database migrations
- Install Lefthook git hooks

Once setup completes, start the dev servers:

```bash
pnpm dev          # runs API + client with hot-reload
```

Default ports: API (5000), WebSocket (5001), Client (5173), PostgreSQL (5432),
Redis (6379), MinIO (9000/9001). See `.env.example` for configuration.

> **Tip:** To work on multiple features in parallel without port conflicts, use the
> git worktree helper: `./scripts/development/create-worktree.sh <name> <offset>`.

## Development workflow

1. Create a branch off `master`:
   ```bash
   git checkout -b fix/short-description
   ```
2. Make your changes.
3. Run lint, type checks, and tests locally (see below).
4. Commit using Conventional Commits.
5. Push to your fork and open a Pull Request against `chenxiaoyao6228/idea-forge:master`.

## Code quality

This project uses **[Biome](https://biomejs.dev/)** for linting and formatting (not
ESLint/Prettier), with 2-space indentation and a 160-character line width.

```bash
pnpm lint           # check lint across all packages
pnpm lint:fix       # auto-fix lint issues
pnpm format         # check formatting
pnpm format:fix     # apply formatting

# Type checking
pnpm -F @idea/api typecheck
pnpm -F @idea/client typecheck
```

Lefthook runs format/lint on pre-commit, so commits are checked automatically.

## Commit messages

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/) — this is
enforced by commitlint (`@commitlint/config-conventional`). Use a type prefix:

- `feat:` — a new feature
- `fix:` — a bug fix
- `docs:` — documentation only
- `refactor:`, `test:`, `chore:`, `perf:`, etc.

Example:

```
fix: prevent empty paragraph from unique id extension
```

## Testing

```bash
pnpm test                          # run all tests via Turbo
pnpm test:e2e                      # Playwright e2e tests

# API tests
pnpm -F @idea/api test:unit        # unit tests (*.unit.test.ts)
pnpm -F @idea/api test:int         # integration tests (*.int.test.ts)

# Client tests
pnpm -F @idea/client test
```

Integration tests use Testcontainers (real PostgreSQL/Redis), so Docker must be running.

## Internationalization (i18n)

Use the **English text itself as the translation key**, not nested key paths:

```tsx
// ✅ Correct
t("Login")
t("Are you sure you want to delete \"{{name}}\"?", { name: item.name })

// ❌ Wrong
t("auth.login.title")
```

Locale files live in `apps/api/public/locales/{lang}.json`.

## Pull requests

- Keep PRs focused on a single concern.
- Reference any related issue (e.g. `Closes #123`).
- Make sure lint, type checks, and tests pass.
- Describe what changed and why, and how you verified it.

## License

By contributing, you agree that your contributions will be licensed under the project's
[MIT License](LICENSE).
