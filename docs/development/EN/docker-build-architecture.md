# Docker Build Architecture

This document explains the updated Docker build architecture after the monorepo refactoring.

---

## Package Build Strategy

### Overview

After the new architecture, not all packages need to be pre-built. The build strategy differs based on how each package is consumed:

| Package | Build Needed? | Reason | Consumers |
|---------|--------------|--------|-----------|
| `@idea/contracts` | ✅ **Yes** | Generates TypeScript types from Prisma schema | API, Client |
| `@idea/utils` | ❌ **No** | Pure TypeScript utilities consumed from source | API, Client (via webpack/vite) |
| `@idea/editor` | ❌ **No** | TipTap extensions consumed from source | API, Client (via webpack/vite) |

### Why This Works

**Modern Build Tools Handle It:**
- **Webpack (API):** Configured to transpile `@idea/utils` and `@idea/editor` from source
- **Vite (Client):** Configured to transpile workspace packages from source
- **No Pre-build Needed:** Both build tools handle TypeScript compilation and bundling

**Benefits:**
- ✅ Faster Docker builds (skip unnecessary build steps)
- ✅ Simpler Dockerfile (fewer build commands)
- ✅ Smaller production image (no intermediate build artifacts)
- ✅ Consistent with local development (direct source consumption)

---

## Dockerfile Build Flow

### Stage 1: Builder

```dockerfile
# 1. Install dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# 2. Copy source code
COPY . .

# 3. Build only what needs building
RUN cd packages/contracts && pnpm build  # Prisma type generation

# 4. Build applications (they bundle utils/editor from source)
RUN cd apps/api && pnpm build           # Webpack bundles utils/editor
RUN cd apps/client && pnpm build        # Vite bundles utils/editor
```

**What Gets Built:**
- ✅ `packages/contracts/dist` - Prisma-generated types
- ✅ `apps/api/dist` - Webpack bundle (includes utils/editor)
- ✅ `apps/api/view` - Vite-built client (includes utils/editor)

**What Does NOT Get Built:**
- ❌ `packages/utils/dist` - Not needed (consumed from source)
- ❌ `packages/editor/dist` - Not needed (consumed from source)

### Stage 2: Production

```dockerfile
# Copy only contracts (has dist/)
COPY --from=builder /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist

# No need to copy utils/editor dist - they're already bundled in API/client

# Copy API (bundled application)
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/view ./apps/api/view

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile --ignore-scripts
```

**What's in Production Image:**
- ✅ Bundled API code (with utils/editor bundled inside)
- ✅ Bundled client code (with utils/editor bundled inside)
- ✅ Contracts types (for runtime type checking)
- ❌ No separate utils/editor packages

---

## Webpack Configuration

The API's `webpack.config.js` is configured to bundle workspace packages:

```javascript
externals: [nodeExternals({
  allowlist: [
    '@idea/contracts',
    '@idea/editor',
    '@idea/utils',  // Bundle from source
    // ... other ESM packages
  ],
})],

module: {
  rules: [
    {
      test: /\.tsx?$/,
      // Transpile workspace packages from source
      exclude: /node_modules\/(?!@idea\/(contracts|editor|utils))/,
      use: {
        loader: 'swc-loader',
        // ... SWC config
      },
    },
  ],
},
```

**Key Points:**
- Webpack transpiles `@idea/utils` and `@idea/editor` TypeScript files
- No pre-built dist folder needed
- Source files are bundled directly into `apps/api/dist/main.js`

---

## Vite Configuration

The client's Vite config handles workspace packages similarly:

```typescript
// Vite automatically handles TypeScript in workspace packages
// No special configuration needed - it just works!
```

**Key Points:**
- Vite natively supports TypeScript in monorepos
- Workspace packages are resolved and transpiled automatically
- No pre-build needed

---

## Local Development vs Docker

### Local Development

```bash
# No build needed for utils/editor
pnpm dev  # Starts API and client with hot-reload

# API webpack watches and transpiles utils/editor on change
# Client vite watches and transpiles utils/editor on change
```

### Docker Build

```bash
# Same strategy - no pre-build needed
./scripts/build-docker.sh

# Webpack/Vite transpile utils/editor during build
# Output is bundled application code
```

**Consistent Behavior:** Docker build uses the same webpack/vite configuration as local development.

---

## Package.json Scripts

### @idea/utils

```json
{
  "scripts": {
    "build": "echo 'Build skipped - consumers build from source'"
  }
}
```

**Why skip?** Pure utility functions, no compilation needed, consumers handle TypeScript.

### @idea/editor

```json
{
  "scripts": {
    "build": "echo 'Build skipped - consumers build from source'"
  }
}
```

**Why skip?** TipTap extensions, consumed directly by API/client build tools.

### @idea/contracts

```json
{
  "scripts": {
    "build": "prisma generate && tsc"
  }
}
```

**Why build?** Generates TypeScript types from Prisma schema, needed by other packages.

---

## Troubleshooting

### "Cannot find module '@idea/utils'"

**Cause:** Webpack/Vite not configured to transpile workspace packages.

**Solution:** Check `webpack.config.js` / `vite.config.ts` includes workspace packages in allowlist/transpilation.

### "Build failed - no dist folder"

**Cause:** Dockerfile trying to copy non-existent `packages/utils/dist` or `packages/editor/dist`.

**Solution:** Remove these COPY commands - they're not needed (already bundled in API/client).

### "Missing dependency in production"

**Cause:** Workspace package listed in `dependencies` instead of being bundled.

**Solution:** Ensure workspace packages are in webpack allowlist and being bundled (not externalized).

---

## FAQ

**Q: Why don't we pre-build utils/editor packages?**
A: Modern build tools (webpack/vite) can transpile workspace packages directly from source. Pre-building adds complexity without benefits.

**Q: What if I add a new workspace package?**
A: If it's pure TypeScript utilities, follow the utils pattern (no build). If it generates code, follow the contracts pattern (with build).

**Q: How do I verify the build is correct?**
A: Use `./scripts/verify-docker-build.sh` to test build stages independently and verify artifacts.

**Q: Does this affect local development?**
A: No - local development and Docker use the same build configuration. Both transpile from source.

**Q: What about type checking?**
A: Type checking happens during development (`pnpm typecheck`) and in CI. Production build assumes types are valid.

---

## Related Documentation

- [Docker Development Guide](./docker.md) - Building and deploying Docker images
- [CLAUDE.md](../../../CLAUDE.md) - General development setup
- [Dockerfile](../../../Dockerfile) - Actual build configuration
