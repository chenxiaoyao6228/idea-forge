# @idea/editor

Shared isomorphic TipTap editor package for Idea Forge.

## Overview

This package contains the core editor implementation that can be used in both client (browser) and server (Node.js) environments. It includes:

- **Extensions**: TipTap nodes, marks, and base extensions
- **Parsers**: Markdown and HTML parsers
- **Serializers**: Document serializers (markdown, HTML)
- **Schema**: ProseMirror schema definitions
- **Utilities**: Document manipulation and validation

## Installation

This is an internal workspace package. Add it to your `package.json`:

```json
{
  "dependencies": {
    "@idea/editor": "workspace:*"
  }
}
```

## Usage

### Client (Browser)

```typescript
import { coreExtensions, createEditor } from '@idea/editor';
import { useEditor } from '@tiptap/react';

// Create editor with core extensions
const editor = useEditor({
  extensions: coreExtensions,
  content: '<p>Hello World!</p>',
});
```

### Server (Node.js)

```typescript
import { markdownToDoc, validateDocument, createEditor } from '@idea/editor';

// Parse markdown to ProseMirror document
const doc = markdownToDoc('# Hello World\n\nThis is **bold** text.');

// Validate document structure
const isValid = validateDocument(doc, schema);

// Convert back to markdown
const markdown = docToMarkdown(doc);
```

## Architecture

This package follows the **isomorphic editor** pattern inspired by Outline:

### What's Included (Shared)

✅ Core nodes (Document, Paragraph, Heading, etc.)
✅ Text marks (Bold, Italic, Link, etc.)
✅ List extensions (BulletList, OrderedList, TaskList)
✅ Table extensions (schemas)
✅ Markdown parser and serializer
✅ Document validation utilities
✅ Pure ProseMirror plugins (no UI)

### What's NOT Included (Client-Only)

❌ React components (Editor wrapper, menus)
❌ UI bubble menus and toolbars
❌ Browser-specific features (clipboard, file upload)
❌ User interaction handlers
❌ App-specific state management

## Decision Tree

When adding new code, use this decision tree:

```
Does the code need browser APIs?
├─ YES → Keep in apps/client/
└─ NO → Does it render interactive UI?
   ├─ YES → Keep in apps/client/
   └─ NO → Does it access app state/stores/API?
      ├─ YES → Keep in apps/client/
      └─ NO → Does it depend on user preferences?
         ├─ YES → Keep in apps/client/
         └─ NO → Put in @idea/editor
```

## Development

```bash
# Build the package
pnpm build

# Watch mode (for development)
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck
```

## Package Structure

```
packages/editor/
├── src/
│   ├── extensions/       # TipTap extensions
│   │   ├── nodes/        # Node extensions
│   │   ├── marks/        # Mark extensions
│   │   └── base/         # Base extensions
│   ├── parsers/          # Markdown/HTML parsers
│   ├── serializers/      # Document serializers
│   ├── schema/           # ProseMirror schema
│   ├── plugins/          # ProseMirror plugins
│   ├── utils/            # Utilities
│   ├── types/            # TypeScript types
│   └── index.ts          # Public API
├── package.json
├── tsconfig.json
└── README.md
```

## Dependencies

### Peer Dependencies

- `@tiptap/core` - TipTap core library
- `@tiptap/pm` - ProseMirror packages

### Direct Dependencies

- `unified` - Markdown processing pipeline
- `remark-parse` - Markdown parser
- `remark-stringify` - Markdown serializer
- `mdast-util-to-markdown` - Markdown AST utilities

## Testing

Tests are written with Vitest and run in Node.js (no browser required).

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test --watch

# Run with coverage
pnpm test --coverage
```

## Design Decisions

See the [design document](../../openspec/changes/extract-editor-package/design.md) for detailed architectural decisions and rationale.

## References

- [Proposal](../../openspec/changes/extract-editor-package/proposal.md)
- [Tasks](../../openspec/changes/extract-editor-package/tasks.md)
- [Specification](../../openspec/changes/extract-editor-package/specs/editor/spec.md)
- [Outline's Architecture](../../outline-client-vs-shared-editor.md) (competitor reference)

## License

MIT (Private - Internal Use Only)
