# @idea/icons

Custom icon components for the Idea Forge application.

## Overview

This package contains custom SVG icons as React components that are not available in `lucide-react`. For standard icons (arrows, common UI elements, etc.), use `lucide-react` directly in your components.

**Current icons:**
- `Google` - Google OAuth provider logo
- `SubspaceWorkspaceWide` - Workspace-wide subspace icon
- `SubspacePublic` - Public subspace icon
- `SubspaceInviteOnly` - Invite-only subspace icon
- `SubspacePrivate` - Private subspace icon

## Installation

This package is part of the monorepo workspace. To use it in other packages:

```json
{
  "dependencies": {
    "@idea/icons": "workspace:*"
  }
}
```

## Usage

Import and use icons as regular React components:

```tsx
import { Google, SubspacePrivate } from '@idea/icons';

function MyComponent() {
  return (
    <div>
      <Google className="w-6 h-6" />
      <SubspacePrivate className="w-8 h-8 text-blue-500" />
    </div>
  );
}
```

All icons accept standard SVG props including `className`, `style`, `onClick`, etc.

## Adding New Icons

### Step 1: Create the Icon Component

Create a new `.tsx` file in `packages/icons/src/` with your icon name in PascalCase (e.g., `MyCustomIcon.tsx`):

```tsx
import type React from "react";

export function MyCustomIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
      {/* Your SVG paths here */}
      <path d="..." fill="currentColor" />
    </svg>
  );
}
```

**Important tips:**
- Use `fill="currentColor"` or `stroke="currentColor"` to make the icon color controllable via CSS
- Preserve the original `viewBox` from your SVG source
- Spread `{...props}` on the root `<svg>` element
- Use `React.SVGProps<SVGSVGElement>` for proper TypeScript typing

### Step 2: Export from Index

Add your icon to `packages/icons/src/index.ts`:

```ts
export { MyCustomIcon } from "./MyCustomIcon";
```

### Step 3: Build the Package

#### Quick Build (Recommended for most cases)

**For normal development**, just build once after adding your icon:

```bash
pnpm -F @idea/icons build
```

This takes ~2 seconds and the client will pick it up automatically on next hot reload. **You don't need to run a watcher!**

#### Watch Mode (Only when actively working on multiple icons)

If you're adding/modifying many icons in one session, use watch mode in a **temporary third terminal**:

```bash
# From project root
pnpm run dev:icons
```

Or directly:

```bash
pnpm -F @idea/icons dev
```

This auto-rebuilds on changes. **Close it when done** - you don't need it running during normal development.

### Step 4: Use Your Icon

After building, you can import and use it anywhere in the monorepo:

```tsx
import { MyCustomIcon } from '@idea/icons';

<MyCustomIcon className="w-6 h-6 text-red-500" />
```

## Development Workflow

### Normal Development (Most Common)

When you only need to add one or two icons:

1. Create your icon component in `src/`
2. Export it from `src/index.ts`
3. Run **one-time build**: `pnpm -F @idea/icons build`
4. Import and use in your app (client auto hot-reloads)

### Active Icon Development (Multiple Icons)

When working on many icons in one session:

1. Create your icon component in `src/`
2. Export it from `src/index.ts`
3. Run **watch mode** in separate terminal: `pnpm run dev:icons`
4. Make changes, it auto-rebuilds
5. **Close watcher** when done adding icons

### Finding SVG Sources

**Where to get SVGs:**
- [Heroicons](https://heroicons.com/) - Clean, MIT licensed icons
- [Lucide Icons](https://lucide.dev/) - Use `lucide-react` package directly (preferred)
- [Iconify](https://icon-sets.iconify.design/) - Search across icon sets
- [SVG Repo](https://www.svgrepo.com/) - Free SVG vectors
- Design tools (Figma, Sketch, etc.) - Export custom designs

**Converting SVG files to React components:**

1. Copy the SVG code
2. Replace attributes: `stroke-width` → `strokeWidth`, `fill-opacity` → `fillOpacity`, etc.
3. Use `{...props}` to spread props
4. Ensure proper typing with `React.SVGProps<SVGSVGElement>`

Example conversion:

```html
<!-- Original SVG -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="10"/>
</svg>
```

```tsx
// React Component
export function CircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="10"/>
    </svg>
  );
}
```

## Build Commands

- `pnpm -F @idea/icons build` - **One-time build** (recommended for normal development)
- `pnpm run dev:icons` - Watch mode (only when actively working on icons)
- `pnpm -F @idea/icons dev` - Same as above (direct command)

**💡 Tip:** You usually only need `pnpm -F @idea/icons build` once after creating an icon. The watcher is optional!

## When to Add Icons Here vs. Using Lucide

**Use this package when:**
- Icon is completely custom or brand-specific (logos, unique designs)
- Icon is not available in `lucide-react`
- You need multi-color icons (lucide is monochrome)

**Use `lucide-react` when:**
- Icon is a standard UI element (arrows, check marks, settings, etc.)
- Available in the lucide icon set
- Prefer tree-shaking benefits (only bundle what you use)

## Package Structure

```
packages/icons/
├── src/
│   ├── Google.tsx              # Individual icon components
│   ├── SubspacePrivate.tsx
│   ├── ...
│   └── index.ts                # Barrel export
├── dist/                       # Build output (git-ignored)
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── README.md
```

## TypeScript Support

All icons are fully typed with TypeScript. The package exports:

- Individual icon components with `React.SVGProps<SVGSVGElement>` typing
- Full IntelliSense support
- Type-safe props

## License

Same license as the parent project.
