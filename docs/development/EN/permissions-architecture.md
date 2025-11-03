# Permissions Architecture - CASL Implementation

## Overview

This document explains how Idea Forge implements permissions using CASL (Conditional Access Subject-based Language), an isomorphic authorization library that works seamlessly on both backend and frontend. By the end of this guide, you'll understand:

- Why we chose CASL and how it works
- The difference between global and per-document permissions
- How to check permissions in your code
- Common patterns and troubleshooting tips

---

## Quick Start for New Developers

### I want to check if a user can perform an action

**Frontend** - Use the permission hooks:
```typescript
// In your React component
import { useDocumentPermissions } from "@/hooks/permissions";

const MyComponent = ({ document }) => {
  const { canDeleteDocument, canUpdateDocument } = useDocumentPermissions(document);

  return (
    <Button disabled={!canDeleteDocument} onClick={handleDelete}>
      Delete
    </Button>
  );
};
```

**Backend** - Add the `@CheckPolicy` decorator:
```typescript
// In your controller
@Delete(":id")
@UseGuards(PolicyGuard)
@CheckPolicy(Action.Delete, "Doc")
async deleteDocument(@Param("id") id: string) {
  // PolicyGuard automatically checks permissions before this runs
  return this.documentService.delete(id);
}
```

### I want to add a new permission action

1. **Add to the enum** (`packages/contracts/src/ability.ts`):
```typescript
export enum AbilityAction {
  // ... existing actions
  MyNewAction = "myNewAction",
}
```

2. **Define the rule** (`apps/api/src/document/document.ability.ts`):
```typescript
// In buildGlobalPermissions or defineContentPermissionsByLevel
can(Action.MyNewAction, "Doc", { authorId: user.id });
```

3. **Add the hook property** (`apps/client/src/hooks/permissions/use-document-permissions.ts`):
```typescript
interface DocumentPermissions {
  // ... existing permissions
  canMyNewAction: boolean;
}

// In the hook body
const { can: canMyNewAction } = useAbilityCan("Doc", Action.MyNewAction, docSubject);

// In the return object
return {
  // ... existing permissions
  canMyNewAction,
};
```

4. **Use it in your UI**:
```typescript
const { canMyNewAction } = useDocumentPermissions(document);
<Button disabled={!canMyNewAction}>My Action</Button>
```

### Understanding the Two Permission Types

**Structural Permissions (Global "Doc" abilities)**:
- Sent once at login
- Examples: Delete, Restore, Archive, PermanentDelete, Publish, Duplicate
- Work for unopened documents (trash, search results)
- Role-based rules

**Content Permissions (Per-document "DocContent" abilities)**:
- Sent when opening a document
- Examples: Read, Update, Comment, Manage
- Handle complex permission inheritance
- Change based on parent document permissions

---

## CASL Packages: `@casl/prisma` vs `@casl/ability`

### `@casl/prisma`

**Purpose**: Backend-only package that integrates CASL with Prisma ORM.

**Key Features**:
- Designed to work with Prisma queries on the backend
- Converts CASL rules into Prisma `where` clauses
- Supports advanced database-level filtering
- **Limitation**: The query parser only works with Prisma's query format

**Use Case**:
```typescript
// Backend - filtering database queries with CASL rules
const ability = createPrismaAbility(rules);
const accessibleDocs = await prisma.doc.findMany({
  where: {
    AND: [
      ability.accessibleBy('read', 'Doc'), // Converts to Prisma where clause
      { deletedAt: null }
    ]
  }
});
```

### `@casl/ability`

**Purpose**: Universal package that works on both frontend and backend.

**Key Features**:
- Supports MongoDB-style query operators (`$in`, `$ne`, `$gt`, etc.)
- Works in browser environment
- Can check permissions on in-memory objects
- Supports both simple and complex conditions

**Use Case**:
```typescript
// Frontend or Backend - checking permissions on objects
const ability = createMongoAbility(rules);
const canDelete = ability.can('delete', subject('Doc', document));
```

### Why Use Different Packages?

| Package | Environment | Purpose | Query Support |
|---------|-------------|---------|---------------|
| `@casl/prisma` | Backend only | Database query filtering | Prisma query format |
| `@casl/ability` (with `createMongoAbility`) | Backend + Frontend | In-memory object checks | MongoDB operators (`$in`, etc.) |

---

## How CASL Works in Idea Forge

### Backend (API)

**Package Used**: `@casl/prisma` (via `createPrismaAbility`)

**Location**: `apps/api/src/_shared/casl/`

**Flow**:

1. **Define Ability Factories** (per model):
   ```typescript
   // apps/api/src/document/document.ability.ts
   @DefineAbility("Doc")
   export class DocumentAbility extends BaseAbility {
     async createForUser(user: User, context?: Record<string, unknown>) {
       return this.createAbilityAsync(async (builder) => {
         const { can } = builder;

         // Global rules (no context)
         can(['delete', 'restore'], 'Doc', { authorId: user.id });
         can(['delete', 'restore'], 'Doc', { workspaceId: { $in: adminWorkspaceIds } });

         // Context-specific rules (when context provided)
         if (context?.doc) {
           // Resolve permission for this specific document
           can(['read', 'update'], 'Doc', { id: context.doc.id });
         }
       });
     }
   }
   ```

2. **Policy Guard** (NestJS guard):
   ```typescript
   // apps/api/src/_shared/casl/policy.guard.ts
   @CheckPolicy(Action.Delete, "Doc")
   async deleteDocument() {
     // PolicyGuard automatically checks if user can delete this document
   }
   ```

3. **Serialize Abilities** (send to frontend):
   ```typescript
   // At login - send global abilities
   const abilities = await abilityService.serializeAbilitiesForUser(
     user,
     ["Workspace", "Doc"]  // Include Doc global abilities
   );

   // Returns: { Doc: { rules: [...] }, Workspace: { rules: [...] } }
   ```

**Backend Rule Types**:

- **Global Rules**: Apply to all documents based on user role
  - `can('delete', 'Doc', { authorId: userId })` - Author can delete their docs
  - `can('delete', 'Doc', { workspaceId: { $in: [adminWorkspaces] } })` - Workspace admins
  - `can('delete', 'Doc', { subspaceId: { $in: [adminSubspaces] } })` - Subspace admins

- **Context-Specific Rules**: Apply to a specific document (NOT used in current implementation)
  - `can('read', 'Doc', { id: 'specific-doc-id' })` - Permission for one document

### Frontend (Client)

**Package Used**: `@casl/ability` (via `createMongoAbility`)

**Location**: `apps/client/src/stores/ability-store.ts`

**Flow**:

1. **Initialize Abilities at Login**:
   ```typescript
   // apps/client/src/hocs/with-auth.tsx
   const userInfo = getUserInfoFromLocal();
   initializeSubjectAbilities(userInfo.abilities);

   // Stores: { Doc: MongoAbility, Workspace: MongoAbility }
   ```

2. **Check Permissions with Hooks**:
   ```typescript
   // apps/client/src/hooks/permissions/use-document-permissions.ts
   const { canRestoreDocument, canPermanentDeleteDocument } = useDocumentPermissions(doc);

   // Internally calls:
   ability.can('restore', subject('Doc', {
     id: doc.id,
     authorId: doc.authorId,
     workspaceId: doc.workspaceId,
     subspaceId: doc.subspaceId
   }));
   ```

3. **How Matching Works**:
   ```typescript
   // Rule: can('restore', 'Doc', { authorId: 'user-123' })
   // Check: ability.can('restore', { id: 'doc-1', authorId: 'user-123', workspaceId: 'ws-1' })
   // Result: ✅ MATCH (authorId matches)

   // Rule: can('restore', 'Doc', { subspaceId: { $in: ['sub-1', 'sub-2'] } })
   // Check: ability.can('restore', { id: 'doc-1', subspaceId: 'sub-1' })
   // Result: ✅ MATCH (subspaceId is in the array)
   ```

**Why `createMongoAbility` on Frontend?**

The global rules use the `$in` operator for arrays:
```typescript
{ subspaceId: { $in: ['sub-1', 'sub-2', 'sub-3'] } }
```

- ❌ `createPrismaAbility` - Doesn't support `$in` in browser (throws error)
- ✅ `createMongoAbility` - Supports MongoDB operators like `$in`, `$ne`, etc.

---

## Permission Strategies: Global vs Per-Document

Idea Forge uses a **hybrid permission approach** that combines efficiency with accuracy.

### Approach 1: Per-Document Abilities

**Strategy**: Calculate and send abilities for each document individually.

**Example Flow**:
```typescript
// Backend
const documents = await fetchDeletedDocuments();
const documentsWithAbilities = documents.map(doc => ({
  ...doc,
  abilities: calculateAbilitiesForDocument(user, doc)  // Per document!
}));

return documentsWithAbilities;

// Frontend
const ability = doc.abilities;
const canRestore = ability.can('restore');
```

**Characteristics**:
- ✅ Exact permissions for each document
- ✅ Supports highly customized per-document logic
- ❌ More bandwidth (abilities sent with every list)
- ❌ More computation (calculate abilities for each doc)
- ❌ Redundant data (many docs have identical abilities)

### Approach 2: Global Role-Based Abilities

**Strategy**: Send global abilities once at login, reuse for all documents.

**Example Flow**:
```typescript
// Backend - At login, send global rules
const abilities = {
  Doc: {
    rules: [
      { action: ['delete', 'restore'], subject: 'Doc', conditions: { authorId: user.id } },
      { action: ['delete', 'restore'], subject: 'Doc', conditions: { workspaceId: { $in: adminWorkspaces } } },
      { action: ['delete', 'restore'], subject: 'Doc', conditions: { subspaceId: { $in: adminSubspaces } } }
    ]
  }
};

// When fetching trash documents
const docs = await fetchDeletedDocuments();
return docs;  // No abilities needed - use global ones!

// Frontend
const ability = useSubjectAbility('Doc');  // Same ability for all docs
const canRestore = ability.can('restore', subject('Doc', doc));  // Check against global rules
```

**Characteristics**:
- ✅ Minimal bandwidth (abilities sent once)
- ✅ Efficient (no per-document calculation)
- ✅ Consistent (one rule set for entire app)
- ✅ Works for unopened documents (trash, search results)
- ❌ Requires role-based permission model
- ❌ Less flexible for highly customized permissions

### Idea Forge's Hybrid Approach

We combine both strategies to get the best of both worlds:

1. **Global Abilities for Structural Permissions**:
   - Sent once at login
   - Role-based rules: Delete, Restore, Archive, PermanentDelete, Publish, Unpublish, Share, Duplicate
   - Works for unopened documents (trash dialog, search results, sidebar)

2. **Per-Document Abilities for Content Permissions**:
   - Sent when document is opened
   - Dynamic permissions: Read, Update, Comment, Manage
   - Handles complex inheritance from parent documents

**Benefits**:
- ✅ **Performance**: Structural permissions cached globally, no redundant fetches
- ✅ **Accuracy**: Content permissions reflect current inheritance state
- ✅ **No conflicts**: Separate subjects ("Doc" vs "DocContent") prevent merging issues
- ✅ **Works everywhere**: Unopened docs use global rules, opened docs get precise content permissions

### When to Use Each Strategy

**Use Global Abilities when**:
- Permissions are primarily role-based
- Rules like: "workspace admins can X", "authors can Y"
- Most documents follow similar permission patterns
- Need to check permissions on many documents efficiently

**Use Per-Document Abilities when**:
- Permissions are highly customized per document
- Complex inheritance or group-based permissions
- Each document may have unique access rules
- Precision is more important than performance

---

## Key Implementation Details

### Ability Serialization

**Backend** (`apps/api/src/_shared/casl/casl.service.ts`):
```typescript
async serializeAbilityForUser(model: ModelName, user: User, context?: Record<string, unknown>) {
  const ability = await this.createAbilityForUser(model, user, context);

  return {
    subject: model,
    rules: packRules(ability.rules)  // Serialize rules for transmission
  };
}
```

**Frontend** (`apps/client/src/stores/ability-store.ts`):
```typescript
const deserializeAbility = (serialized: SerializedAbility): MongoAbility => {
  return createMongoAbility(unpackRules(serialized.rules));  // Deserialize rules
};
```

### Where Abilities Are Sent

1. **Login** (`apps/api/src/auth/auth.controller.ts`):
   ```typescript
   const abilities = await abilityService.serializeAbilitiesForUser(
     user,
     ["Workspace", "Doc"]  // Global abilities
   );
   ```

2. **Page Load** (`apps/api/src/_shared/middlewares/fallback.middleware.ts`):
   ```typescript
   const abilities = await abilityService.serializeAbilitiesForUser(
     user,
     ["Workspace", "Subspace", "Doc"]
   );
   ```

3. **Token Refresh** (same middleware):
   ```typescript
   const abilities = await abilityService.serializeAbilitiesForUser(
     user,
     ["Workspace", "Subspace", "Doc"]
   );
   ```

4. **Role Updates** (`apps/api/src/workspace/workspace.service.ts`):
   ```typescript
   // When workspace role changes, send updated abilities
   const abilities = await abilityService.serializeAbilitiesForUser(
     user,
     ["Workspace", "Doc"]
   );
   ```

### Important: Document Detail Endpoint - Hybrid Permission System

**Sends DocContent abilities** for content permissions (`apps/api/src/document/document.service.ts`):
```typescript
// Build content-specific abilities (READ, UPDATE, COMMENT, MANAGE)
const contentAbilityRaw = await this.documentAbility.buildContentAbilityForDocument(userId, {
  id: document.id,
  workspaceId: document.workspaceId,
  parentId: document.parentId,
  subspaceId: document.subspaceId,
  authorId: document.authorId,
});

return {
  doc,
  permissions: {
    DocContent: {
      subject: "DocContent",
      rules: packRules(contentAbilityRaw.rules)
    }
    // Doc global abilities (DELETE, RESTORE, etc.) already loaded at login
  },
  permissionSource
};
```

**Why Hybrid Approach?**
- **Content permissions (READ, UPDATE, COMMENT, MANAGE)**: Change frequently due to complex inheritance logic, sent per-document as "DocContent"
- **Structural permissions (DELETE, RESTORE, ARCHIVE, etc.)**: Stable role-based rules, sent once at login as "Doc"
- Using separate subjects ("Doc" vs "DocContent") prevents merging conflicts
- Unopened documents (trash, search) still work with global "Doc" abilities

---

## Common Patterns

### Backend: Defining Global Rules

```typescript
// Author permissions
can([Action.Delete, Action.Restore, Action.PermanentDelete], "Doc", {
  authorId: user.id
});

// Workspace admin permissions
if (workspaceAdminIds.length > 0) {
  can([Action.Delete, Action.Restore, Action.PermanentDelete], "Doc", {
    workspaceId: { $in: workspaceAdminIds }
  });
}

// Subspace admin permissions
if (adminSubspaceIds.length > 0) {
  can([Action.Delete, Action.Restore, Action.PermanentDelete], "Doc", {
    subspaceId: { $in: adminSubspaceIds }
  });
}
```

### Frontend: Checking Permissions with Hybrid System

```typescript
// Using the hook (recommended) - automatically uses correct ability store
const {
  // Content permissions - checked against "DocContent" ability
  canReadDocument,
  canUpdateDocument,
  canCommentDocument,
  canManageDocument,

  // Structural permissions - checked against "Doc" ability
  canRestoreDocument,
  canPermanentDeleteDocument,
  canDeleteDocument,
  canArchiveDocument
} = useDocumentPermissions({
  documentId: doc.id,
  authorId: doc.authorId,
  workspaceId: doc.workspaceId,
  subspaceId: doc.subspaceId
});

// Direct ability check (advanced) - choose appropriate subject
// For content permissions (after document is opened):
const contentAbility = useSubjectAbility('DocContent');
const canRead = contentAbility.can('read', subject('DocContent', { id: doc.id }));

// For structural permissions (works even for unopened documents):
const docAbility = useSubjectAbility('Doc');
const canRestore = docAbility.can('restore', subject('Doc', {
  id: doc.id,
  authorId: doc.authorId,
  workspaceId: doc.workspaceId,
  subspaceId: doc.subspaceId
}));
```

### Building the Subject

**Important**: Include all fields that rules might check against:

```typescript
// ❌ Incomplete subject - rules won't match
const subject = { id: doc.id };

// ✅ Complete subject - rules can match
const subject = {
  id: doc.id,
  authorId: doc.authorId,        // For author rules
  workspaceId: doc.workspaceId,  // For workspace admin rules
  subspaceId: doc.subspaceId     // For subspace admin rules
};
```

---

## Troubleshooting

### Error: "equals does not support comparison of arrays and objects"

**Cause**: Using `@casl/prisma` (`createPrismaAbility`) on the frontend with `$in` operator.

**Solution**: Use `@casl/ability` with `createMongoAbility` instead.

```typescript
// ❌ Wrong - Prisma ability doesn't support $in in browser
import { createPrismaAbility } from "@casl/prisma";
const ability = createPrismaAbility(rules);

// ✅ Correct - Mongo ability supports $in
import { createMongoAbility } from "@casl/ability";
const ability = createMongoAbility(rules);
```

### Permissions Not Working for Unopened Documents

**Cause**: Global Doc abilities not loaded at login.

**Solution**: Ensure Doc abilities are included in login/auth responses:

```typescript
// apps/api/src/auth/auth.controller.ts
const abilities = await abilityService.serializeAbilitiesForUser(
  user,
  ["Workspace", "Doc"]  // ← Must include "Doc"
);
```

### Content Permissions Not Updating

**Cause**: Document content permissions (READ, UPDATE, COMMENT, MANAGE) not refreshed when document is opened.

**Solution**: Ensure DocContent abilities are sent from document detail endpoint:

```typescript
// apps/api/src/document/document.service.ts
const contentAbilityRaw = await this.documentAbility.buildContentAbilityForDocument(userId, doc);

return {
  doc,
  permissions: {
    DocContent: {
      subject: "DocContent",
      rules: packRules(contentAbilityRaw.rules)
    }
  },
  permissionSource
};
```

---

## Summary

### Quick Reference Table

| Aspect | Backend | Frontend |
|--------|---------|----------|
| **Package** | `@casl/prisma` | `@casl/ability` |
| **Factory** | `createPrismaAbility` | `createMongoAbility` |
| **Purpose** | Prisma query filtering | In-memory object checks |
| **Operators** | Prisma format | MongoDB format (`$in`, etc.) |
| **Rules** | Global + context-specific | Global + per-document |
| **When Sent** | Login (Doc), document detail (DocContent) | - |
| **Storage** | - | Zustand store (separate subjects) |

### Understanding Idea Forge's Hybrid Permission Model

We use a **two-tier permission system** that balances efficiency and accuracy:

#### Tier 1: Global Abilities ("Doc" subject)
**What**: Role-based structural permissions
**When sent**: Once at login, page load, and role updates
**Examples**: Delete, Restore, Archive, PermanentDelete, Publish, Unpublish, Share, Duplicate
**Use case**: Works for unopened documents (trash dialog, search results, sidebar)
**Benefit**: Efficient - no redundant fetches

#### Tier 2: Per-Document Abilities ("DocContent" subject)
**What**: Dynamic content permissions
**When sent**: When document detail is fetched
**Examples**: Read, Update, Comment, Manage
**Use case**: Handles complex inheritance logic from parent documents
**Benefit**: Accurate - always reflects current permission state

### Decision Flowchart: Which Permission Type?

```
Are you adding a new permission?
│
├─ Is it about CONTENT (reading, editing, commenting)?
│  └─ YES → Use "DocContent" (per-document)
│     - Add to defineContentPermissionsByLevel()
│     - Will be sent when document is opened
│     - Handles inheritance from parent docs
│
└─ Is it about STRUCTURE (deleting, archiving, publishing)?
   └─ YES → Use "Doc" (global)
      - Add to buildGlobalPermissions()
      - Will be sent at login
      - Works for unopened documents
```

### Why This Approach Works

✅ **Efficient**: Structural permissions cached globally, no redundant fetches
✅ **Accurate**: Content permissions always reflect current inheritance state
✅ **No conflicts**: Separate subjects ("Doc" vs "DocContent") prevent ability merging issues
✅ **Works everywhere**: Unopened docs use global rules, opened docs get precise content permissions
✅ **Developer-friendly**: Clear separation of concerns, predictable behavior
