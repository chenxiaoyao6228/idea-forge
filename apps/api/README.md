## Known issues

### ESM Import Compatibility

NestJS runs in a CommonJS environment bundled by webpack, which cannot directly load pure ESM packages at runtime. This causes `ERR_REQUIRE_ESM` errors when trying to import ESM-only packages.

#### The Problem

When webpack encounters an ESM package:

1. By default, packages in `node_modules` are **externalized** (not bundled)
2. NestJS tries to `require()` them at runtime
3. Pure ESM packages cannot be loaded with `require()`
4. Result: `ERR_REQUIRE_ESM: require() of ES Module not supported`

see also:

- https://github.com/nestjs/nest/issues/13319
- https://github.com/nestjs/nest-cli/issues/2851

#### The Solution: Webpack Allowlist

Configure webpack to **bundle** ESM packages instead of externalizing them. This happens in `webpack.config.js`:

```javascript
externals: [nodeExternals({
  allowlist: isDevelopment
    ? ['webpack/hot/poll?100', '@idea/editor', /^@idea\/editor\//]
    : ['@idea/editor', /^@idea\/editor\//],
})],
```

#### When to Add Packages to the Allowlist

**Add a package to the allowlist when:**

1. You directly import an ESM-only package in your API code
2. The package has `"type": "module"` in its `package.json`
3. You see `ERR_REQUIRE_ESM` errors mentioning that package

**You do NOT need to add:**

- Transitive dependencies (webpack bundles them automatically)
- CommonJS packages (they work fine as externals)
- Packages already listed in the allowlist

#### Example: `@idea/editor` Package

Our `@idea/editor` package is pure ESM with ESM-only dependencies (unified, remark, etc.):

```javascript
// API code imports from @idea/editor
import { Markdown, parseMarkdown } from "@idea/editor";
import { createMarkdownParser } from "@idea/editor/server";

// webpack.config.js configuration
allowlist: [
  "@idea/editor", // Matches: import from '@idea/editor'
  /^@idea\/editor\//, // Matches: import from '@idea/editor/server'
];
```

**What gets bundled:**

```
@idea/editor (allowlisted)
  ├── unified (ESM) ← Bundled automatically
  ├── remark-parse (ESM) ← Bundled automatically
  ├── remark-gfm (ESM) ← Bundled automatically
  └── mdast-util-to-markdown (ESM) ← Bundled automatically
```

All ESM dependencies are bundled transitively - you only need to allowlist the direct import!

#### How to Add a New ESM Package

**Step 1:** Install the package

```bash
pnpm -F @idea/api add some-esm-package
```

**Step 2:** Add to webpack allowlist in `webpack.config.js`

```javascript
allowlist: isDevelopment
  ? ['webpack/hot/poll?100', '@idea/editor', /^@idea\/editor\//, 'some-esm-package']
  : ['@idea/editor', /^@idea\/editor\//, 'some-esm-package'],
```

**Step 3:** If the package has sub-exports, add a regex pattern

```javascript
allowlist: [
  "some-esm-package",
  /^some-esm-package\//, // Matches some-esm-package/sub-export
];
```

**Step 4:** Restart the dev server

```bash
# Webpack will rebuild with the new configuration
```

#### Package.json Exports Field

For workspace packages like `@idea/editor`, ensure the `exports` field is properly configured:

```json
{
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/esm/index.js",
      "default": "./dist/esm/index.js"
    },
    "./server": {
      "types": "./dist/types/server.d.ts",
      "import": "./dist/esm/server.js",
      "default": "./dist/esm/server.js"
    }
  }
}
```

The `exports` field tells webpack where to find the module files before bundling.

#### Development Workflow with Workspace Packages

When actively developing workspace packages (like `@idea/editor`) alongside the API:

**Option 1: Watch mode (recommended)**

```bash
# Terminal 1: Run editor in watch mode
pnpm -F @idea/editor dev  # Runs: tsc --watch

# Terminal 2: API dev server (already watching)
# Automatically rebuilds when editor dist/ changes
```

**Option 2: Manual rebuild**

```bash
# After editing @idea/editor source
pnpm -F @idea/editor build
# API webpack will detect the change and rebuild
```

#### Troubleshooting

**Error: `require() of ES Module not supported`**

- Add the package to webpack allowlist
- Ensure the package is installed
- Restart the dev server

**Error: `Package subpath './server' is not defined`**

- Check the package's `exports` field in `package.json`
- Ensure the sub-export path is defined
- For workspace packages, rebuild the package

**Webpack not detecting changes in workspace packages:**

- Ensure the workspace package is in watch mode (`pnpm -F <package> dev`)
- Check that the package's `dist/` directory is being updated
- Try manually triggering a rebuild: `touch src/main.ts`

#### Why Not Convert API to ESM?

You might wonder: why not make the entire API server use ESM instead?

**Current limitations:**

1. NestJS ecosystem has many CommonJS-only plugins
2. Webpack HMR (Hot Module Replacement) for NestJS works best with CommonJS
3. Some dependencies don't support dual-mode (ESM + CJS)
4. The bundling approach is battle-tested and reliable

**The bundling approach is actually an advantage:**

- Faster startup time (single bundled file)
- Better compatibility across the ecosystem
- Webpack handles all ESM/CJS complexity at build time
- No runtime module resolution overhead
