# Document Permission Inheritance System

## Table of Contents
1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Permission Resolution Order](#permission-resolution-order)
4. [Inheritance Behavior](#inheritance-behavior)
5. [Permission Override](#permission-override)
6. [Guest Collaborator Permissions](#guest-collaborator-permissions)
7. [Shared-With-Me Area](#shared-with-me-area)
8. [UI/UX Guidelines](#uiux-guidelines)
9. [API Design](#api-design)
10. [Testing](#testing)
11. [Common Scenarios](#common-scenarios)

---

## Overview

The Idea Forge permission system implements **live inheritance** where child documents dynamically inherit permissions from their parent documents. This design eliminates the need to copy permission records, reduces database overhead, and ensures permission changes propagate automatically through the document hierarchy.

### Key Principles
- **No Permission Copying**: Child documents don't store inherited permissions - they resolve them at runtime
- **Override Capability**: Child documents can override inherited permissions with direct permissions
- **Automatic Propagation**: Changes to parent permissions immediately affect all descendants
- **Closest Ancestor Wins**: When multiple ancestors have permissions, the nearest parent takes precedence
- **Multi-Level Support**: Supports unlimited depth (with safety limit of 25 levels)

---

## Core Concepts

### 1. Document Hierarchy

Documents form a tree structure using the `parentId` field:

```
workspace/
├── parent (id: abc123)
│   ├── child (id: def456, parentId: abc123)
│   │   └── grand-child (id: ghi789, parentId: def456)
│   └── child2 (id: jkl012, parentId: abc123)
```

### 2. Permission Types

Permissions are stored in the `DocumentPermission` table with an `inheritedFromType` field:

| Type | Description | Inheritable |
|------|-------------|-------------|
| `DIRECT` | Directly granted to a user on a document | ✅ Yes |
| `GROUP` | Granted via group membership | ✅ Yes |
| `SUBSPACE` | Role-based subspace permission | ❌ No |
| `WORKSPACE` | Workspace-level permission | ❌ No |
| `GUEST` | Guest collaborator permission | ❌ No |

**Important**: Only `DIRECT` and `GROUP` permissions cascade to child documents.

### 3. Permission Levels

From lowest to highest access:

```
NONE < READ < COMMENT < EDIT < MANAGE
```

---

## Permission Resolution Order

When determining a user's permission on a document, the system checks in priority order:

### Priority Hierarchy

```
1. DIRECT permission on current document (priority 1)
2. GROUP permission on current document (priority 2)
3. Inherited DIRECT/GROUP from parent chain (priority 1-2)
4. Document-level subspace overrides (priority 3-4)
5. Subspace role-based permissions (priority 4)
6. Workspace member permissions (priority 5)
7. Guest permissions (priority 7)
8. NONE (no access)
```

### Resolution Algorithm

```typescript
function resolvePermission(userId: string, doc: Document): PermissionResult {
  // Step 1: Check direct permission on current document
  const directPerm = findDirectPermission(userId, doc.id);
  if (directPerm) {
    return { level: directPerm, source: "direct", sourceDocId: doc.id };
  }

  // Step 2: Walk up parent chain for inherited permissions
  let currentParent = doc.parentId;
  while (currentParent) {
    const parentPerm = findDirectPermission(userId, currentParent);
    if (parentPerm && parentPerm.inheritedFromType in ['DIRECT', 'GROUP']) {
      return {
        level: parentPerm,
        source: "inherited",
        sourceDocId: currentParent,
        sourceDocTitle: getDocTitle(currentParent)
      };
    }
    currentParent = getParentId(currentParent);
  }

  // Step 3-8: Fallback to subspace/workspace/guest permissions
  // ... (see DocPermissionResolveService for full implementation)
}
```

**Key Points**:
- Algorithm stops at **first match** (closest ancestor wins)
- Maximum depth: 25 levels (prevents infinite loops)
- Circular references detected via visited set

---

## Inheritance Behavior

### Basic Inheritance

**Scenario**: Parent document shared with user → Child automatically inherits

```
Setup:
  - parent (EDIT shared with Alice)
  - child (parentId: parent)

Result:
  - Alice has EDIT on parent (direct)
  - Alice has EDIT on child (inherited from parent)
```

**Database State**:
```sql
-- Only ONE permission record exists
DocumentPermission {
  userId: alice,
  docId: parent,
  permission: EDIT,
  inheritedFromType: DIRECT
}

-- NO record for child document
-- Child permission resolved at runtime by walking up to parent
```

### Multi-Level Inheritance

**Scenario**: Grandparent → Parent → Child chain

```
Setup:
  - grandparent (MANAGE shared with Bob)
  - parent (parentId: grandparent, no direct permission)
  - child (parentId: parent, no direct permission)

Result:
  - Bob has MANAGE on grandparent (direct)
  - Bob has MANAGE on parent (inherited from grandparent)
  - Bob has MANAGE on child (inherited from grandparent via parent)
```

**Important**: Child inherits from the **closest ancestor** with a permission. In this case, both parent and grandparent could provide the permission, but since parent is closer and has no direct permission, the algorithm continues walking up to grandparent.

### Closest Ancestor Wins

**Scenario**: Multiple ancestors have different permissions

```
Setup:
  - grandparent (READ shared with Carol)
  - parent (EDIT shared with Carol, parentId: grandparent)
  - child (parentId: parent, no direct permission)

Result:
  - Carol has READ on grandparent (direct)
  - Carol has EDIT on parent (direct, overrides inherited READ)
  - Carol has EDIT on child (inherited from parent, NOT grandparent)
```

**Why?** The algorithm stops at the **first match** when walking up the tree. Parent is encountered first, so its EDIT permission is used.

---

## Permission Override

Child documents can override inherited permissions by creating a direct permission record.

### Override Scenarios

#### 1. Downgrade Permission

```
Setup:
  - parent (EDIT shared with Dave)
  - child (READ shared with Dave, parentId: parent)

Result:
  - Dave has EDIT on parent (direct)
  - Dave has READ on child (direct override, downgraded from inherited EDIT)
```

**Use Case**: Parent is a project folder with EDIT access, but a specific child document should be read-only for certain users.

#### 2. Upgrade Permission

```
Setup:
  - parent (READ shared with Eve)
  - child (MANAGE shared with Eve, parentId: parent)

Result:
  - Eve has READ on parent (direct)
  - Eve has MANAGE on child (direct override, upgraded from inherited READ)
```

**Use Case**: General folder is read-only, but specific users need management rights on a particular document.

### Restore Inherited Permission

To remove an override and restore inherited permission:

```typescript
// Delete the child's direct permission record
await prisma.documentPermission.delete({
  where: {
    userId_docId: { userId: dave.id, docId: child.id }
  }
});

// Result: Child now inherits parent's permission again
```

**UI**: The "Restore Inherited" option in the permission dropdown triggers this deletion.

---

## Group Permissions

Groups provide a powerful way to manage permissions for multiple users at once. When a document is shared with a group, all group members receive GROUP permissions that work similarly to DIRECT permissions but with some key differences.

### Key Characteristics

| Feature | GROUP Permission | DIRECT Permission |
|---------|------------------|-------------------|
| **Inheritance** | ✅ Inherits to child documents | ✅ Inherits to child documents |
| **Priority** | 2 (lower than DIRECT) | 1 (highest) |
| **Can Override** | ✅ Yes, child can override parent GROUP | ✅ Yes, child can override parent DIRECT |
| **Source Tracking** | `sourceGroupId` field tracks which group | `createdById` tracks who granted it |
| **Multi-Group** | ✅ User can have multiple GROUP permissions | ❌ User has single DIRECT permission |

### Basic Group Permission Flow

```
Setup:
  - Group "Engineering" contains: Alice, Bob, Carol
  - Document "Project Plan" shared with Engineering (EDIT)

Result:
  - Alice, Bob, Carol each have GROUP permission (EDIT) on "Project Plan"
  - Database has 3 DocumentPermission records:
    - userId: alice.id, inheritedFromType: GROUP, sourceGroupId: engineering.id
    - userId: bob.id, inheritedFromType: GROUP, sourceGroupId: engineering.id
    - userId: carol.id, inheritedFromType: GROUP, sourceGroupId: engineering.id
```

**Database State**:
```sql
DocumentPermission {
  userId: alice.id,
  docId: projectPlan.id,
  permission: EDIT,
  inheritedFromType: GROUP,
  priority: 2,
  sourceGroupId: engineering.id
}
```

### GROUP Permission Inheritance

GROUP permissions inherit to child documents just like DIRECT permissions:

```
Setup:
  - Parent: Shared with "Engineering" (EDIT)
  - Child: No direct share with "Engineering"

Result:
  - Engineering members have EDIT on parent (GROUP)
  - Engineering members have EDIT on child (inherited GROUP from parent)
  - NO permission records created on child (resolved at runtime)
```

### Multi-Group Permissions

**CRITICAL DIFFERENCE**: Unlike DIRECT permissions, a user can have **multiple GROUP permissions** on the same document when they belong to multiple groups.

```
Setup:
  - User Alice is in: "Engineering" and "Design"
  - Document shared with "Engineering" (EDIT)
  - Document shared with "Design" (READ)

Database State:
  - Alice has TWO GROUP permissions on the document:
    1. GROUP EDIT (sourceGroupId: engineering.id)
    2. GROUP READ (sourceGroupId: design.id)

Resolution:
  - Permission resolver returns HIGHEST: EDIT
  - Alice sees EDIT permission in UI
```

**Implementation Note**: The `resolveUserPermissionForDocument` function queries all permissions and picks the HIGHEST when multiple GROUP permissions exist with the same priority.

### GROUP vs DIRECT Priority

When a user has both GROUP and DIRECT permissions, DIRECT always wins:

```
Setup:
  - Alice is in "Engineering" group
  - Document shared with "Engineering" (EDIT)  → GROUP permission
  - Document shared directly with Alice (READ)   → DIRECT permission

Result:
  - Alice has READ (DIRECT wins over GROUP due to priority 1 < 2)
```

**Priority Order**:
```
1. DIRECT permission (priority 1)
2. GROUP permission (priority 2)
3. Inherited DIRECT/GROUP from parent
4. Subspace permissions (priority 3-4)
5. Workspace permissions (priority 5)
```

### Group Permission Override on Child

Just like DIRECT permissions, GROUP permissions can be overridden on child documents:

```
Setup:
  - Parent: Shared with "Engineering" (READ)
  - Child: Shared with "Engineering" (MANAGE)  → Override

Result for Alice (in Engineering):
  - Parent: GROUP READ (direct on parent)
  - Child: GROUP MANAGE (direct on child, overrides inherited READ)
  - hasParentPermission: true (override detected)
  - parentPermissionSource: { level: READ, source: "inherited", sourceDocTitle: "Parent" }
```

**UI Behavior**:
- Shows "Permission overridden from parent document 'Parent' inherited permission"
- Displays "Restore Inherited" option
- Clicking "Restore Inherited" removes child's GROUP permissions → inherits parent's READ

### Updating Group Permissions

When updating a group's permission on a document:

```typescript
// API: PATCH /api/share-documents/:docId
{ groupId: "engineering-id", permission: "MANAGE" }

// Implementation:
// 1. Calls shareDocument internally with targetGroupIds
// 2. Creates/updates GROUP permissions for all group members
// 3. Sets sourceGroupId to track which group granted it
```

**Result**:
- All current group members get updated GROUP permission
- If document has children, they inherit the new permission
- Previous GROUP permissions for that group are replaced

### Group Membership Changes

**Adding User to Group**:
```
1. User Bob added to "Engineering" group
2. Query documents shared with "Engineering"
3. Create GROUP permissions for Bob on all those documents
4. Bob immediately sees all Engineering-shared documents
```

**Removing User from Group**:
```
1. User Bob removed from "Engineering" group
2. Delete Bob's GROUP permissions where sourceGroupId = "Engineering"
3. Bob loses access to Engineering-shared documents
4. If Bob is in other groups, those GROUP permissions remain
```

**Edge Case - User in Multiple Groups**:
```
Setup:
  - Bob in "Engineering" and "Design"
  - Document shared with both groups (EDIT)
  - Bob removed from "Engineering"

Result:
  - Bob's Engineering GROUP permission deleted
  - Bob's Design GROUP permission remains
  - Bob still has EDIT access via Design group
```

### API Response Format

When fetching document collaborators, groups are returned separately from users:

```typescript
GET /api/share-documents/:docId

Response: {
  data: [
    // Users (from DIRECT + GROUP + inherited)
    {
      id: "alice-id",
      type: "user",
      permission: { level: "EDIT" },
      permissionSource: { source: "group", level: "EDIT" },
      hasParentPermission: false
    },

    // Groups
    {
      id: "engineering-id",
      type: "group",
      name: "Engineering",
      memberCount: 15,
      permission: { level: "EDIT" },
      permissionSource: { source: "group", level: "EDIT" },
      hasParentPermission: true,  // If child overrides parent
      parentPermissionSource: { level: "READ", sourceDocTitle: "Parent" }
    }
  ]
}
```

### Common Scenarios

#### Scenario 1: Share with Multiple Groups

```
Goal: Give both Engineering (EDIT) and Design (READ) access

Steps:
1. Share with "Engineering" group (EDIT)
2. Share with "Design" group (READ)

Result for Alice (in both groups):
- Two GROUP permissions in database
- Resolver returns EDIT (highest)
- UI shows EDIT permission
```

#### Scenario 2: Override Group Permission on Child

```
Goal: Engineering has EDIT on folder, but specific doc should be read-only

Steps:
1. Parent shared with "Engineering" (EDIT)
2. Child shared with "Engineering" (READ) → Override

Result:
- Engineering members: EDIT on parent, READ on child
- hasParentPermission: true on child
- UI shows "Restore Inherited" option
```

#### Scenario 3: Mix GROUP and DIRECT

```
Goal: Engineering has READ, but Alice needs MANAGE

Steps:
1. Share with "Engineering" (READ) → GROUP permission for all
2. Share with Alice directly (MANAGE) → DIRECT permission

Result for Alice:
- Has both GROUP READ and DIRECT MANAGE
- DIRECT wins (priority 1 < 2)
- Alice sees MANAGE
```

#### Scenario 4: Remove Group Permission (Restore Inherited)

```
Setup:
  - Parent: "Engineering" (READ)
  - Child: "Engineering" (MANAGE) - override

Action: Remove Engineering from child (restore inherited)

API: DELETE /api/share-documents/:childId/group
{ targetGroupId: "engineering-id" }

Result:
- Deletes GROUP permissions for all Engineering members on child
- Members inherit parent's READ permission
- hasParentPermission: false (no override anymore)
```

### Testing GROUP Permissions

Required test coverage:

```typescript
describe("GROUP Permissions", () => {
  it("should create GROUP permission for all group members");
  it("should allow multiple GROUP permissions for user in multiple groups");
  it("should resolve HIGHEST permission when multiple GROUP permissions exist");
  it("should allow GROUP permission to override inherited GROUP from parent");
  it("should prefer DIRECT over GROUP permission");
  it("should inherit GROUP permissions to child documents");
  it("should set hasParentPermission when GROUP overrides parent GROUP");
  it("should clean up GROUP permissions when user removed from group");
  it("should keep other GROUP permissions when user removed from one group");
});
```

---

## Guest Collaborator Permissions

Guest collaborators implement a **two-tier permission system** that provides different inheritance behavior based on whether the guest has a linked user account.

### Two-Tier Guest Architecture

| Guest Type | Permission Type | Inheritable | Use Case |
|------------|----------------|-------------|----------|
| **Linked Guest** (has userId) | DIRECT (priority 1) | ✅ Yes | Existing users invited as guests - inherit from parents |
| **Unlinked Guest** (no userId) | GUEST (priority 7) | ❌ No | Unknown emails - no inheritance until signup |

### Key Differences from Regular Users

| Feature | Regular Users (DIRECT/GROUP) | Linked Guests (DIRECT) | Unlinked Guests (GUEST) |
|---------|------------------------------|------------------------|-------------------------|
| **Inheritance** | ✅ Inherits from parent docs | ✅ Inherits from parent docs | ❌ No inheritance until signup |
| **Workspace access** | ✅ Has workspace membership | ❌ No workspace membership | ❌ No workspace membership |
| **Subspace access** | ✅ Can be subspace member | ❌ No subspace membership | ❌ No subspace membership |
| **Share list API** | ✅ Included in `/api/documents/{id}/shares` | ❌ Separate guest API | ❌ Separate guest API |
| **Navigation** | ✅ Can browse subspace trees | ❌ Only "Shared with me" | ❌ Only "Shared with me" |
| **Permission Override** | ✅ Can override parent | ✅ Can override parent | ❌ No override (no inheritance) |

### Linked Guest Permissions (Inheritable)

When you invite an **existing user** as a guest, they receive a DIRECT permission that works exactly like regular user permissions:

```typescript
// Guest with existing account
const guest = {
  id: "guest-456",
  email: "existing@example.com",
  userId: "user-123",  // ✅ Linked to existing user
};

// Creates DIRECT permission (inheritable)
DocumentPermission {
  userId: "user-123",           // ✅ Uses userId for inheritance
  guestCollaboratorId: "guest-456", // ✅ Tracks guest origin (audit trail)
  docId: "parent-doc",
  permission: "EDIT",
  inheritedFromType: "DIRECT",  // ✅ Inheritable!
  priority: 1
}
```

**Result**: Linked guest can access child documents via inheritance, just like regular users who aren't subspace members.

**Example**:
```
Parent Doc (Linked Guest Alice has EDIT)
  ├─ Child Doc A (Alice inherits EDIT from parent) ✅
  └─ Child Doc B (Alice inherits EDIT from parent) ✅

Alice's Access:
- Parent: EDIT (direct)
- Child A: EDIT (inherited from parent)
- Child B: EDIT (inherited from parent)
```

### Unlinked Guest Permissions (Non-Inheritable)

When you invite an **unknown email** as a guest, they receive a GUEST permission that does NOT inherit:

```typescript
// Guest without account
const guest = {
  id: "guest-789",
  email: "new@example.com",
  userId: null,  // ❌ No linked account
};

// Creates GUEST permission (non-inheritable)
DocumentPermission {
  userId: null,
  guestCollaboratorId: "guest-789",
  docId: "parent-doc",
  permission: "EDIT",
  inheritedFromType: "GUEST",   // ❌ NOT inheritable
  priority: 7
}
```

**Result**: Unlinked guest CANNOT access child documents until they sign up and accept the invitation.

**Example**:
```
Parent Doc (Unlinked Guest Bob has EDIT)
  ├─ Child Doc A (Bob has NO access) ❌
  └─ Child Doc B (Bob has NO access) ❌

Bob's Access:
- Parent: EDIT (direct)
- Child A: NONE (GUEST permissions don't inherit)
- Child B: NONE (GUEST permissions don't inherit)
```

### Guest Permission Resolution Algorithm

```typescript
function resolveGuestPermission(guest: Guest, doc: Document): PermissionLevel {
  if (guest.userId) {
    // LINKED GUEST - Uses standard resolution with inheritance
    // Step 1: Check DIRECT permission on current document
    // Step 2: Check inherited DIRECT from parent chain ✅
    // Step 3: Check GROUP permission (if added to groups)
    // Step 4: Check document-level subspace overrides
    // Step 5: Return NONE
  } else {
    // UNLINKED GUEST - No inheritance
    // Step 1: Check GUEST permission on current document only
    // Step 2: Return NONE (no inheritance, no workspace access)
  }
}
```

### Guest Acceptance and Permission Migration

When an unlinked guest signs up and accepts an invitation, their GUEST permissions are automatically migrated to DIRECT permissions:

```typescript
// BEFORE Acceptance (Unlinked Guest)
DocumentPermission {
  userId: null,
  guestCollaboratorId: "guest-789",
  inheritedFromType: "GUEST",   // Non-inheritable
  priority: 7
}

// User signs up and accepts invitation
await acceptWorkspaceInvitation({ guestId: "guest-789", userId: "user-999" });

// AFTER Acceptance (Linked Guest)
DocumentPermission {
  userId: "user-999",           // ✅ Now linked!
  guestCollaboratorId: "guest-789", // ✅ Audit trail preserved
  inheritedFromType: "DIRECT",  // ✅ Now inheritable!
  priority: 1
}
```

**Implementation** (guest-collaborators.service.ts:158-182):
```typescript
await this.prisma.$transaction(async (tx) => {
  // Update guest status
  await tx.guestCollaborator.update({
    where: { id: guestId },
    data: { status: "ACTIVE", userId },
  });

  // Migrate GUEST → DIRECT permissions
  await tx.documentPermission.updateMany({
    where: {
      guestCollaboratorId: guestId,
      inheritedFromType: "GUEST",
    },
    data: {
      userId: userId,
      inheritedFromType: "DIRECT",
      priority: 1,
    },
  });
});
```

### Guest Permission Override System

Linked guests can override inherited permissions just like regular users. See the "Permission Override" section for details on how this works.

#### Override States for Linked Guests

1. **Inherited Only**:
   - Guest has permission from parent, NO direct permission on child
   - Permission selector: **Disabled** (read-only)
   - Tooltip: "Inherited from parent document: 'Parent Title'"

2. **Direct Only**:
   - Guest has direct permission on child, NO parent permission
   - Permission selector: **Enabled**
   - Actions: **Remove button** (can delete direct permission)

3. **Override (Direct + Inherited)**:
   - Guest has BOTH direct on child AND inherited from parent
   - Permission selector: **Enabled**
   - Actions: **Restore Inherited dropdown option** (removes direct, falls back to inherited)

**UI Implementation** (guest-sharing-tab.tsx:76-84):
```typescript
const hasParentPermission = guest.hasParentPermission || false;
const isDirect = guest.permissionSource?.source === "direct";

const showRestoreInherited = hasParentPermission && isDirect;
const showRemove = isDirect && !hasParentPermission;
```

### Guest API Endpoints

Guest collaborators are managed through **separate API endpoints** from regular user shares:

**API Structure**:
```typescript
// For workspace members and groups
GET /api/documents/{docId}/shares
Response: {
  users: UserShareData[],    // DIRECT + GROUP + inherited (NO guests)
  groups: GroupShareData[]   // DIRECT + GROUP + inherited
}

// For guest collaborators (separate endpoint)
GET /api/guest-collaborators/documents/{docId}/guests
Response: GuestCollaboratorResponse[]  // Both linked and unlinked guests
```

**Guest Response Schema**:
```typescript
interface GuestCollaboratorResponse {
  id: string;
  email: string;
  name: string | null;
  status: "PENDING" | "ACTIVE";
  permission?: PermissionLevel;         // Effective permission (resolved)
  isInherited?: boolean;                // True if only inherited (no direct)
  hasParentPermission?: boolean;        // True if has both (override state)
  permissionSource?: {
    source: "direct" | "inherited";
    sourceDocId: string;
    sourceDocTitle: string;
    level: PermissionLevel;
  };
  parentPermissionSource?: {            // For overrides
    source: "inherited";
    sourceDocId: string;
    sourceDocTitle: string;
    level: PermissionLevel;
  };
  documents: Array<{
    documentId: string;
    documentTitle: string;
    permission: PermissionLevel;
    createdAt: Date;
  }>;
}
```

**UI Implication**: Sharing UI must make **TWO separate API calls**:
1. `/api/documents/{id}/shares` - Get users and groups (includes inherited)
2. `/api/guest-collaborators/documents/{id}/guests` - Get guests (includes inherited for linked guests)

### Sharing Documents with Guests

#### Invite Existing User as Guest (Linked)

```typescript
POST /api/guest-collaborators/documents/invite
{
  "documentId": "parent-id",
  "email": "existing-user@example.com",  // Email of existing user
  "permission": "EDIT"
}

Result:
- Guest created with userId (linked)
- DIRECT permission created (inheritable)
- Guest can access child documents via inheritance ✅
```

#### Invite Unknown Email as Guest (Unlinked)

```typescript
POST /api/guest-collaborators/documents/invite
{
  "documentId": "parent-id",
  "email": "new-user@example.com",  // Unknown email
  "permission": "EDIT"
}

Result:
- Guest created without userId (unlinked)
- GUEST permission created (non-inheritable)
- Guest CANNOT access child documents ❌
- After signup: GUEST → DIRECT migration, inheritance enabled ✅
```

#### Batch Invite Mixed Guests

```typescript
POST /api/guest-collaborators/documents/batch-invite
{
  "documentId": "parent-id",
  "guests": [
    { "guestId": "linked-guest-id", "permission": "EDIT" },    // Linked
    { "guestId": "unlinked-guest-id", "permission": "READ" }   // Unlinked
  ]
}

Result:
- Linked guest gets DIRECT permission (inherits to children)
- Unlinked guest gets GUEST permission (no inheritance)
```

### Guest Navigation and Shared-With-Me

**ALL** documents shared with a guest appear in "Shared with me" because:
- Guests have no workspace membership → can't browse workspace trees
- Guests have no subspace membership → can't browse subspace trees

**Example**:
```
Workspace "Acme Corp"
  Public Subspace:
    - handbook (Linked Guest Eve has READ via parent share)
      └─ policies (Eve inherits READ from parent) ✅
  Marketing Subspace:
    - campaign (Unlinked Guest Bob has EDIT, direct share)
      └─ budget (Bob has NO access) ❌

Eve's Shared-With-Me Shows:
✅ handbook (READ, direct)
  └─ policies (READ, inherited) - Accessible via client tree

Bob's Shared-With-Me Shows:
✅ campaign (EDIT, direct only)
  └─ budget (Hidden - no permission)
```

**Client-Side Tree Building**: The shared-with-me navigation tree is built client-side by progressively fetching children via `/api/documents/list` with `sharedDocumentId` parameter.

### Guest Promotion to Workspace Member

When a guest is promoted to a workspace member, permissions are migrated:

**Permission Migration Algorithm**:
```typescript
async function promoteGuestToMember(guestId: string, role: WorkspaceRole) {
  const guestPermissions = await getGuestPermissions(guestId);

  for (const perm of guestPermissions) {
    const workspaceDefaultPermission = PermissionLevel.READ;

    if (perm.permission > workspaceDefaultPermission) {
      // Guest has HIGHER permission than workspace default
      // Keep as DIRECT to preserve access
      if (perm.inheritedFromType === "GUEST") {
        // Migrate GUEST → DIRECT (if not already DIRECT)
        await updatePermission({
          ...perm,
          userId: guest.userId,
          inheritedFromType: "DIRECT",
          priority: 1
        });
      }
    } else {
      // Workspace permission is sufficient
      // Delete permission record (workspace READ is enough)
      await deletePermission(perm.id);
    }
  }

  await deleteGuest(guestId);
  await addWorkspaceMember(guest.userId, role);
}
```

**Example**:
```
Before Promotion:
- Doc A: DIRECT permission MANAGE (linked guest)
- Doc B: GUEST permission READ (was unlinked, now linked after acceptance)

After Promotion (Member):
- Doc A: DIRECT permission MANAGE (preserved - higher than workspace READ)
- Doc B: No permission record (deleted - workspace READ sufficient)
- Workspace: Now MEMBER (default READ on all docs)

Key Benefit:
- Can now browse workspace/subspace trees (no longer limited to shared-with-me)
- High permissions preserved, low permissions cleaned up
- Inheritance continues to work (already using DIRECT permissions)
```

### Testing Guest Permissions

**Required Test Coverage**:

```typescript
describe("Linked Guest Permissions", () => {
  it("should create DIRECT permission for linked guest", async () => {
    // Given: Existing user invited as guest
    // When: Guest shared on document
    // Then: DIRECT permission created with userId
    // And: Priority = 1 (inheritable)
  });

  it("should inherit permissions from parent to child", async () => {
    // Given: Linked guest shared on parent (EDIT)
    // When: Child document created under parent
    // Then: Guest has EDIT on child (inherited)
    // And: No permission record on child
  });

  it("should allow override of inherited permission", async () => {
    // Given: Linked guest inherits EDIT from parent
    // When: Guest shared on child with READ (override)
    // Then: Guest has READ on child (override)
    // And: hasParentPermission = true
    // And: Shows "Restore Inherited" option
  });

  it("should restore inherited permission when override removed", async () => {
    // Given: Linked guest has override on child
    // When: Direct permission removed from child
    // Then: Guest inherits parent permission again
    // And: hasParentPermission = false
  });
});

describe("Unlinked Guest Permissions", () => {
  it("should create GUEST permission for unlinked guest", async () => {
    // Given: Unknown email invited as guest
    // When: Guest shared on document
    // Then: GUEST permission created without userId
    // And: Priority = 7 (non-inheritable)
  });

  it("should NOT inherit permissions to child documents", async () => {
    // Given: Unlinked guest shared on parent (EDIT)
    // When: Child document created under parent
    // Then: Guest has NONE on child (no inheritance)
  });
});

describe("Guest Acceptance Migration", () => {
  it("should migrate GUEST to DIRECT on acceptance", async () => {
    // Given: Unlinked guest with GUEST permissions
    // When: Guest accepts invitation and creates account
    // Then: All GUEST permissions → DIRECT permissions
    // And: userId linked to guest
    // And: Priority changed to 1
  });

  it("should enable inheritance after acceptance", async () => {
    // Given: Unlinked guest on parent (no child access)
    // When: Guest accepts invitation
    // Then: Guest can access child documents (inheritance enabled)
  });
});

describe("Batch Invite Mixed Guests", () => {
  it("should handle mixed linked/unlinked guests", async () => {
    // Given: Batch invite with linked and unlinked guests
    // When: Batch invite executed
    // Then: Linked guests get DIRECT permissions (priority 1)
    // And: Unlinked guests get GUEST permissions (priority 7)
  });
});
```

### Common Scenarios

#### Scenario 1: Invite Existing User as Guest

```
Goal: Share project folder with external user who has an account

Steps:
1. Invite user@example.com as guest (existing user)
2. Guest receives DIRECT permission on parent folder
3. Guest can access child documents via inheritance

Result:
- 1 permission record created (on parent)
- Children inherit permission at runtime
- Guest appears in child's guest-sharing-tab with inherited indicator
```

#### Scenario 2: Invite Unknown Email as Guest

```
Goal: Share document with external collaborator (unknown email)

Steps:
1. Invite newuser@example.com as guest (unknown email)
2. Guest receives GUEST permission on document
3. Guest CANNOT access child documents

After Guest Signs Up:
1. Guest accepts invitation
2. GUEST permissions → DIRECT permissions
3. Guest can now access child documents
```

#### Scenario 3: Override Linked Guest Permission on Child

```
Goal: Guest has EDIT on folder, but specific doc should be read-only

Steps:
1. Parent shared with linked guest (EDIT)
2. Child shared with same guest (READ) → Override

Result:
- Guest has EDIT on parent
- Guest has READ on child (override)
- Child shows "Restore Inherited" option
- Clicking restore removes READ, guest inherits EDIT again
```

#### Scenario 4: Promote Guest to Member

```
Goal: Convert guest to full workspace member

Steps:
1. Guest has DIRECT permissions on multiple docs
2. Promote guest to MEMBER role
3. High permissions preserved, low permissions cleaned up

Result:
- MANAGE/EDIT permissions → Kept as DIRECT
- READ/COMMENT permissions → Deleted (workspace READ sufficient)
- Guest can now browse workspace trees
- Inheritance continues to work
```

### Implementation Files

**API Service**:
- `apps/api/src/guest-collaborators/guest-collaborators.service.ts`
  - `inviteGuestToDocument()` (lines 200-354) - Creates DIRECT or GUEST based on linked status
  - `batchInviteGuestsToDocument()` (lines 356-491) - Handles mixed guest types
  - `acceptWorkspaceInvitation()` (lines 124-198) - Migrates GUEST → DIRECT
  - `updateGuestPermission()` (lines 572-698) - Updates/creates permissions (supports overrides)
  - `getGuestsOfDocument()` (lines 818-965) - Returns guests with inheritance metadata

**Permission Resolution**:
- `apps/api/src/permission/document-permission.service.ts`
  - Linked guests use standard user resolution (includes inheritance)
  - Unlinked guests use `getGuestPermissionForDocument()` (no inheritance)

**Client UI**:
- `apps/client/src/pages/main/sharing/guest-sharing-tab.tsx`
  - Displays guests with inheritance indicators
  - Shows "Restore Inherited" option for overrides
  - Handles permission updates with override detection

**Contracts**:
- `packages/contracts/src/guest-collaborators.ts`
  - `guestCollaboratorResponseSchema` - Includes override metadata fields

---

## Shared-With-Me Area

The "Shared with me" section is a **dedicated area for documents that have no other navigation entry point**. It shows documents where the user has direct permission but cannot access through normal navigation.

### Why This Area Exists

The application has two main navigation paradigms:

1. **Subspace Navigation Tree**: Documents in subspaces where you are a member appear in the subspace's navigation tree
2. **Shared-With-Me**: Documents you cannot access through the subspace tree appear here

**Key Insight**: If a document can be accessed through the subspace navigation tree, it doesn't need to appear in shared-with-me. This area serves two purposes:
- **Cross-personal-subspace sharing**: Documents from other users' "My Docs" shared with you
- **Non-member subspace access**: Documents in subspaces where you're not a member but have been granted direct permission

### Display Rules

Documents appear in shared-with-me when EITHER condition is met:

1. **Cross-Personal Subspace Sharing**:
   - Document is in a PERSONAL type subspace
   - Document's author is someone other than you (`authorId != userId`)

2. **Non-Member Subspace Access**:
   - Document is in a subspace where you are NOT a member
   - You have direct permission on the document

Additional filters apply to both cases:
- **Only Top-Level Shared Documents**: Child documents are excluded if their ancestor is also shared
- **Only Direct Permissions**: Documents must have a `DIRECT` permission record (not inherited)

### Rationale

| Document Location | Owner | User Status | Appears In | Rationale |
|------------------|-------|-------------|------------|-----------|
| Alice's "My Docs" | Alice | Bob (workspace member) | Bob's shared-with-me ✅ | Cross-personal sharing, no other navigation entry |
| Alice's "My Docs" | Alice | Alice | Alice's "My Docs" tree ❌ | Alice owns it, appears in her own tree |
| Public Space | Alice | Bob (member of Public Space) | Public Space tree ✅ | Bob is subspace member, can navigate via tree |
| Public Space | Alice | Carol (NOT member of Public Space) | Carol's shared-with-me ✅ | Carol cannot access subspace tree, needs entry point |
| Public Space | Alice | Guest Dave | Dave's shared-with-me ✅ | Guests have no subspace access at all |

### Filtering Logic

```typescript
async getSharedDocuments(userId: string) {
  // Step 1: Get all documents with DIRECT permissions for user
  const directPermissions = await findDirectPermissions(userId);

  // Step 2: Filter to documents with no other navigation entry point
  const orphanedDocs = directPermissions.filter(perm => {
    // Case 1: Cross-personal subspace sharing
    const isCrossPersonal =
      perm.doc.subspace.type === "PERSONAL" &&
      perm.doc.authorId !== userId;

    // Case 2: Non-member subspace access
    const isNonMemberAccess =
      !perm.doc.subspace.members.some(m => m.userId === userId);

    return isCrossPersonal || isNonMemberAccess;
  });

  // Step 3: Exclude children if parent is also shared (top-level only)
  const topLevel = orphanedDocs.filter(perm => {
    let parentId = perm.doc.parentId;
    while (parentId) {
      if (orphanedDocs.find(p => p.docId === parentId)) {
        return false; // Parent is shared, exclude this child
      }
      parentId = getParentId(parentId);
    }
    return true; // No shared ancestor, include
  });

  return topLevel;
}
```

### Examples

#### Example 1: Cross-Personal Subspace Sharing

```
Alice's Personal Subspace ("My Docs"):
  - project-proposal (Alice owns, shares EDIT with Bob)
    - budget (Alice owns, shares READ with Bob)
  - personal-notes (Alice owns, not shared)

Bob's Personal Subspace ("My Docs"):
  - my-tasks (Bob owns)

Bob's Shared-With-Me Shows:
  ✅ project-proposal (from Alice's personal space)
  ❌ budget (parent project-proposal is shown, navigate through tree)
  ❌ personal-notes (not shared with Bob)
  ❌ my-tasks (Bob owns it, appears in his own tree)
```

**Result**: Bob sees `project-proposal` in shared-with-me. He can navigate to `budget` through the folder tree after opening `project-proposal`.

#### Example 2: Non-Member Subspace Access

```
Public Space (Bob is a member):
  - team-handbook (Alice owns, shares EDIT with Bob)

Marketing Space (Bob is NOT a member):
  - campaign-doc (Alice owns, shares EDIT with Bob)

Bob's Personal Subspace ("My Docs"):
  - my-notes

Bob's Shared-With-Me Shows:
  ❌ team-handbook (Bob is member of Public Space, accessible via tree)
  ✅ campaign-doc (Bob is NOT member of Marketing Space, needs entry point)
  ❌ my-notes (Bob owns it)
```

**Result**: Bob can access `team-handbook` through the "Public Space" subspace tree. But he cannot access the "Marketing Space" tree, so `campaign-doc` appears in shared-with-me as an entry point.

#### Example 3: Guest Collaborator Access

```
Marketing Space (Guest Eve has no membership):
  - campaign-plan (Alice shares EDIT with Guest Eve)

Public Space (Guest Eve has no membership):
  - company-handbook (Alice shares READ with Guest Eve)

Eve's Shared-With-Me Shows:
  ✅ campaign-plan (Eve is guest, cannot access Marketing Space tree)
  ✅ company-handbook (Eve is guest, cannot access Public Space tree)
```

**Result**: Guest collaborators have no subspace memberships, so ALL documents shared with them appear in shared-with-me, regardless of subspace type.

### Navigation Tree for Shared Documents

**Important**: The shared-with-me navigation tree is built **client-side**, unlike subspace navigation trees which are maintained server-side.

**Rationale**:
- Subspace trees need real-time collaboration (Yjs document sync)
- Shared-with-me documents don't require collaborative tree editing
- Client-side building reduces server complexity and database writes

**Implementation**:
1. Initial load fetches **root-level shared documents** only
2. When user expands a folder, client calls `/api/documents/list` with:
   - `parentId`: The folder being expanded
   - `sharedDocumentId`: The root shared document ID (preserved through tree)
3. Server returns children user has permission to access
4. Children rendered using same component recursively
5. Each child remembers `rootSharedDocumentId` for subsequent fetches

**Example Flow**:
```
1. User opens shared-with-me
   API: GET /api/documents/shared-with-me
   Response: [{ id: "root-doc", title: "Project" }]

2. User expands "Project" folder
   API: POST /api/documents/list
   Body: { parentId: "root-doc", sharedDocumentId: "root-doc" }
   Response: [{ id: "child-1" }, { id: "child-2" }]

3. User expands "child-1" subfolder
   API: POST /api/documents/list
   Body: { parentId: "child-1", sharedDocumentId: "root-doc" }
   Response: [{ id: "grandchild-1" }]
```

**Key Point**: The `sharedDocumentId` is passed down through all levels to maintain context that we're navigating a shared tree, not a subspace tree.

### User Experience Flow

**Workspace Member (Bob) Accessing Shared Documents:**

1. **Subspace Member Documents**: Browse via subspace navigation tree (server-maintained)
   - Public Space (Bob is member) → team-handbook
   - Project Space (Bob is member) → project-files

2. **Cross-Personal Documents**: Browse via "Shared with me" (client-built tree)
   - Alice's "My Docs" → project-proposal (appears in shared-with-me)
   - Carol's "My Docs" → research (appears in shared-with-me)

3. **Non-Member Subspace Documents**: Browse via "Shared with me" (client-built tree)
   - Marketing Space (Bob is NOT member) → campaign-doc (appears in shared-with-me)

**Guest Collaborator (Eve) Accessing Shared Documents:**

Guests have no subspace memberships at all, so they rely entirely on shared-with-me:

1. **All Shared Documents**: Browse via "Shared with me" (client-built tree)
   - Marketing Space → campaign-plan (appears in shared-with-me)
   - Public Space → company-handbook (appears in shared-with-me)
   - Alice's "My Docs" → meeting-notes (appears in shared-with-me)

**Summary**: The filtering logic automatically handles both workspace members and guests correctly:
- **Members**: See cross-personal docs + non-member subspace docs
- **Guests**: See ALL shared docs (since they're not a member of ANY subspace)
- **All users**: Navigate shared document children via client-built tree

---

## UI/UX Guidelines

### Permission Source Tooltips

The UI must clearly communicate where permissions come from using tooltips:

#### 1. Direct Permission (No Parent)

```
Tooltip: "Granted by Alice Johnson"
UI State:
  - Permission selector: enabled
  - Remove button: visible
```

#### 2. Direct Permission (Overriding Inherited)

```
Tooltip: "Permission overridden from parent document 'Project Folder' inherited permission. To restore inherited permission, select 'Restore Inherited' from dropdown"
UI State:
  - Permission selector: enabled with "Restore Inherited" option
  - "Restore Inherited" button: visible
  - "Remove" button: HIDDEN (mutually exclusive with "Restore Inherited")
```

**Important**: The `parentPermissionSource.sourceDocTitle` must be used for the tooltip, NOT `permissionSource.sourceDocTitle`. The latter refers to the current document where the direct permission exists, not the parent document being overridden.

#### 3. Inherited Permission (No Override)

```
Tooltip: "Inherited from parent document 'Project Folder'"
UI State:
  - Permission selector: disabled (cannot edit inherited permissions)
  - Remove button: hidden
  - User must go to parent to change permission
```

### Share List Behavior

The document share list shows **both direct and inherited permissions**:

```
Document: child (parent: project-folder)

Shared with:
┌─────────────────────────────────────────────────┐
│ Alice Johnson    [EDIT ▼]  [X]                  │
│ ℹ️ Granted by Bob Smith                         │
├─────────────────────────────────────────────────┤
│ Carol Davis      [READ ▼]  [ ]                  │
│ ℹ️ Inherited from parent document 'Project...'  │
│ (Permission selector disabled, no X button)     │
├─────────────────────────────────────────────────┤
│ Dave Wilson      [COMMENT ▼ Restore]  [X]       │
│ ℹ️ Permission overridden from parent...         │
└─────────────────────────────────────────────────┘
```

**Key Points**:
- Alice: Direct permission on child (can edit/remove)
- Carol: Inherited from parent (read-only, must edit on parent)
- Dave: Overriding inherited permission (can restore or remove override)

### Subspace Permission Tooltips

Document-level subspace permission overrides also show source information:

```
Without Override (Inherited):
  Tooltip: "Permission inherited from subspace 'Public Space'"
  UI: No "Restore Inherited" option

With Override:
  Tooltip: "Permission overridden from subspace 'Public Space' inherited permission. To restore default, select 'Restore Inherited' from dropdown"
  UI: "Restore Inherited" option in dropdown
```

---

## API Design

### Permission Resolution Response

```typescript
interface PermissionResolutionResult {
  level: PermissionLevel;
  source: "direct" | "group" | "inherited" | "subspace" | "workspace" | "guest" | "none";
  sourceDocId?: string;        // Document where permission originates
  sourceDocTitle?: string;     // Title of source document
  priority: number;            // 1=highest priority
  inheritanceChain?: string[]; // Array of doc IDs from current to source
}
```

### Share List Response

```typescript
interface DocShareUser {
  id: string;
  email: string;
  displayName: string | null;
  permission: { level: PermissionLevel };
  permissionSource?: PermissionResolutionResult;
  hasParentPermission?: boolean;           // True if user has inherited permission
  parentPermissionSource?: PermissionResolutionResult; // Parent's permission details
  grantedBy?: {                            // Who granted this permission
    displayName: string | null;
    email: string;
  };
  type: "user";
}
```

**Important**: The `getDocumentCollaborators` API **must deduplicate users** who appear in multiple ancestors. When walking the parent chain, if the same user has permissions on both parent and grandparent, they should appear **only once** in the response with the correctly resolved permission level.

**Implementation Detail**: The `getInheritedUserShares` method uses a `Set<string>` to track unique user IDs and processes each user only once. The `resolveUserPermissionForDocument` method automatically returns the HIGHEST permission from the parent chain.

### Key Endpoints

```
GET  /api/documents/:id/shares
  → Returns both direct AND inherited permissions
  → Includes permissionSource and parentPermissionSource metadata
  → **Deduplicates users** who have permissions on multiple ancestors
  → For users with direct overrides, includes parentPermissionSource for tooltip

POST /api/documents/:id/share
  → Creates direct permission records
  → Automatically cascades to child documents (via inheritance)

DELETE /api/documents/:id/shares/:userId
  → Removes direct permission (user may still have inherited access)
  → Use to implement "Restore Inherited" feature
  → Returns updated collaborator list (deduplicated)

POST /api/documents/list
  → Lists child documents with optional permission filtering
  → When sharedDocumentId is provided, used for shared-with-me navigation trees
  → Client builds navigation tree progressively (not server-maintained like subspaces)

PATCH /api/documents/:id/subspace-permissions
  → Accepts null values to reset overrides
  → { subspaceAdminPermission: null } removes override, restores inheritance
```

---

## Testing

### Integration Tests

All inheritance behavior is validated in `parent-child-permission.int.test.ts`:

```typescript
// Test: Basic inheritance
it('should inherit parent permissions to child', async () => {
  // Setup: Share parent with Alice (EDIT)
  // Verify: Alice has EDIT on child (inherited)
  // Verify: No permission record exists for child
});

// Test: Override
it('should allow child to override inherited permission', async () => {
  // Setup: Parent shared with Bob (EDIT), child shared with Bob (READ)
  // Verify: Bob has EDIT on parent, READ on child
  // Verify: Child has direct permission record
});

// Test: Restore inherited
it('should restore inherited permission when override removed', async () => {
  // Setup: Child has override
  // Action: Delete child permission record
  // Verify: Child now inherits from parent
});

// Test: Multi-level
it('should handle grandparent → parent → child inheritance', async () => {
  // Setup: Only grandparent has permission
  // Verify: Child inherits through parent
});

// Test: Closest ancestor wins
it('should use closest ancestor permission when multiple exist', async () => {
  // Setup: Grandparent has READ, parent has EDIT
  // Verify: Child inherits EDIT from parent (closer)
});

// Test: Deduplication in share list
it('should deduplicate users with permissions on multiple ancestors', async () => {
  // Setup: Grandparent (Alice: READ), parent (Alice: EDIT), child (no direct)
  // Action: Get shares for grandchild
  // Verify: Alice appears ONCE with EDIT permission (from parent)
  // Verify: permissionSource shows parent as source, not grandparent
});

// Test: Parent permission source metadata
it('should return correct parentPermissionSource for overrides', async () => {
  // Setup: Parent (Bob: EDIT), child (Bob: READ direct override)
  // Action: Get shares for child
  // Verify: Bob's permissionSource.source === "direct"
  // Verify: Bob's permissionSource.sourceDocTitle === child title
  // Verify: Bob's parentPermissionSource.sourceDocTitle === parent title
  // Verify: Bob's hasParentPermission === true
});

// Test: Client-side navigation tree building
it('should return accessible children when sharedDocumentId provided', async () => {
  // Setup: Parent (Carol: MANAGE), child (Carol: EDIT), grandchild (no direct)
  // Action: List children with sharedDocumentId=parent
  // Verify: Returns child (Carol has permission)
  // Action: List children of child with sharedDocumentId=parent
  // Verify: Returns grandchild (Carol has inherited permission)
});
```

### Test Coverage

Current status: **12+ integration tests required** ✅

Tests must cover:
- Basic inheritance (DIRECT and GROUP)
- Permission overrides (upgrade and downgrade)
- Multi-level inheritance (3+ levels)
- Closest ancestor priority
- Restore inherited functionality
- Mixed permission types (direct + group)
- **Deduplication of users in share lists** ⚠️ NEW
- **Parent permission source metadata** ⚠️ NEW
- **Shared-with-me navigation tree building** ⚠️ NEW

---

## Common Scenarios

### Scenario 1: Share Folder with Team

```
Goal: Give team READ access to project folder and all contents

Steps:
1. Share parent folder with team group (READ)
2. All child documents automatically inherit READ
3. No need to share each child individually

Result:
- 1 permission record created (on parent)
- All descendants inherit permission at runtime
- Adding new children automatically inherits permission
```

### Scenario 2: Restrict Sensitive Document

```
Goal: Team has EDIT on folder, but sensitive doc should be read-only

Steps:
1. Parent folder shared with team (EDIT)
2. Override sensitive child with team (READ)

Result:
- Team has EDIT on parent and siblings
- Team has READ on sensitive child (override)
- Tooltip shows "Permission overridden from parent..."
```

### Scenario 3: Promote User on Specific Document

```
Goal: User has READ on folder, but needs MANAGE on one document

Steps:
1. Parent folder shared with user (READ)
2. Override specific child with user (MANAGE)

Result:
- User has READ on parent and siblings
- User has MANAGE on promoted child (override)
- Can use "Restore Inherited" to revert to READ
```

### Scenario 4: Move Document to New Parent

```
Before Move:
  old-parent (Alice has EDIT)
    ├── doc (Alice inherits EDIT)

After Move:
  new-parent (Alice has READ)
    ├── doc (Alice inherits READ, permission downgraded!)

Result:
- Document moved to new parent
- Permission automatically recalculated based on new parent chain
- Alice's access downgraded from EDIT to READ
- No permission records modified (inheritance handles it)
```

### Scenario 5: Remove Parent Permission

```
Setup:
  parent (Bob has EDIT)
    ├── child (Bob inherits EDIT)

Action: Remove Bob from parent

Result:
- Delete permission record on parent
- Bob loses access to parent AND child
- Child doesn't need cleanup (no permission record existed)
- Automatic propagation through inheritance
```

---

## Implementation Notes

### Document Creation Permission Logic

**Rule**: When creating a document, the system checks if the author already has MANAGE permission through parent inheritance before creating a redundant permission record.

**Implementation** (document.service.ts:48-76):
```typescript
// Create direct OWNER permission for the document author
// ONLY if they don't already have MANAGE permission through parent inheritance
let shouldCreatePermission = true;

if (doc.parentId) {
  // Check if author would inherit MANAGE from parent
  const parentPermission = await this.docPermissionResolveService.resolveUserPermissionForDocument(
    authorId,
    { id: doc.parentId, workspaceId: doc.workspaceId, subspaceId: doc.subspaceId }
  );

  // If author already has MANAGE on parent, don't create redundant permission
  if (parentPermission.level === "MANAGE") {
    shouldCreatePermission = false;
  }
}

if (shouldCreatePermission) {
  await this.prismaService.documentPermission.create({
    data: {
      userId: authorId,
      docId: doc.id,
      permission: "MANAGE",
      inheritedFromType: "DIRECT",
      priority: 1,
      createdById: authorId,
    },
  });
}
```

**Why This Matters**:
- **Root documents**: Always get DIRECT MANAGE permission (no parent to inherit from)
- **Child documents**: Only get DIRECT permission if author doesn't have MANAGE on parent
- **Prevents redundant records**: If author has MANAGE on parent, child inherits it automatically
- **Correct tooltip behavior**: Prevents "Permission overridden" tooltip when no override exists

**Test Coverage**: See `document.service.int.test.ts` for comprehensive test cases covering all scenarios.

### Share List Merge and Deduplication

The `getDocumentCollaborators` API merges direct and inherited permissions with deduplication:

**Algorithm** (share-document.services.ts):
1. **Get direct permissions** on current document
2. **Get inherited permissions** from parent chain
3. **Deduplicate users**: Use `Set<string>` to track unique user IDs when walking ancestors
4. **Merge**: Direct permissions override inherited ones
5. **Set flags**: Mark `hasParentPermission = true` when user has both direct and inherited

**Deduplication Details**:
```typescript
// When walking parent chain for inherited permissions
const uniqueUserIds = new Set<string>();

for (const perm of userPermissions) {
  if (!perm.userId) continue;

  // Skip if we've already processed this user
  if (uniqueUserIds.has(perm.userId)) continue;
  uniqueUserIds.add(perm.userId);

  // resolveUserPermissionForDocument automatically returns HIGHEST permission
  const permissionSource = await this.docPermissionResolveService.resolveUserPermissionForDocument(...);
  // ...
}
```

**Why Deduplication is Needed**:
- User might have permissions on both grandparent and parent
- Without deduplication, they'd appear twice in the collaborator list
- `resolveUserPermissionForDocument` returns the closest/highest permission
- We only need to process each unique user once

## Best Practices

### For Developers

1. **Never Copy Permissions**: Always use inheritance for child documents
2. **Check hasParentPermission**: When showing override UI, check this flag
3. **Document Creation**: Let the system handle permission creation automatically - it checks for inheritance
4. **Deduplication**: Share list APIs automatically deduplicate users with permissions on multiple ancestors
5. **Test Depth Limits**: Ensure 25-level limit is respected

### For Product Managers

1. **Educate Users**: Inherited permissions are read-only by design
2. **Clear Tooltips**: Always show permission source in tooltips
3. **Restore vs Remove**: "Restore Inherited" removes override; "Remove" removes direct permission
4. **Shared-With-Me**: Only top-level personal documents appear (children accessible via tree)
5. **Override Sparingly**: Encourage using parent permissions; overrides add complexity

### For QA

1. **Test Multi-Level**: Verify inheritance works 3-5 levels deep
2. **Test Overrides**: Verify both upgrade and downgrade scenarios
3. **Test Restore**: Ensure "Restore Inherited" correctly removes override
4. **Test Shared-With-Me**: Verify filtering excludes children when parent is shared
5. **Test Personal Only**: Verify workspace-wide docs don't appear in shared-with-me

---

## Troubleshooting

### Issue: Child doesn't inherit parent permission

**Possible Causes**:
1. Parent permission type is SUBSPACE/WORKSPACE/GUEST (only DIRECT/GROUP inherit)
2. Child has a direct permission override (takes precedence)
3. Circular reference in parent chain (max depth 25)

**Debug**:
```typescript
const result = await resolveUserPermissionForDocument(userId, childDoc);
console.log(result.source); // Check if "inherited" or something else
console.log(result.sourceDocId); // Should be parent document ID
```

### Issue: "Restore Inherited" not working

**Possible Causes**:
1. User doesn't have direct permission (nothing to remove)
2. hasParentPermission flag is false (no parent permission exists)
3. API returned error (check network tab)

**Debug**:
```typescript
// Check share list response
const shares = await getDocumentShares(docId);
const user = shares.find(s => s.id === userId);
console.log(user.hasParentPermission); // Should be true
console.log(user.permissionSource.source); // Should be "direct"
```

### Issue: Shared-with-me shows too many documents

**Possible Causes**:
1. Child document filtering not working
2. Workspace-wide documents included (should only be personal)
3. Cache issue (outdated results)

**Debug**:
```sql
-- Check which documents user has direct permissions on
SELECT d.id, d.title, s.type as subspace_type, d."parentId"
FROM "DocumentPermission" dp
JOIN "Doc" d ON dp."docId" = d.id
JOIN "Subspace" s ON d."subspaceId" = s.id
WHERE dp."userId" = '<user-id>'
  AND dp."inheritedFromType" = 'DIRECT'
  AND dp."createdById" != '<user-id>';
```

---

## References

- **Implementation**: `apps/api/src/permission/document-permission.service.ts`
- **Tests**: `apps/api/src/permission/parent-child-permission.int.test.ts`
- **UI**: `apps/client/src/pages/main/sharing/member-sharing-tab.tsx`
- **Plan**: `parent_child_permission_enhancements_PLAN.md`

---

**Document Version**: 1.0
**Last Updated**: 2025-01-XX
**Maintained By**: Product & Engineering Team
