# Data Model: Public Document Sharing

**Feature**: Public Document Sharing | **Date**: 2025-10-10
**Source**: Extracted from spec.md requirements and PRD design decisions

## Overview

This document defines the database schema, entities, relationships, and validation rules for the public document sharing feature. All schemas use Prisma ORM and follow the Database-First principle from the Idea Forge constitution.

## Entity Diagram

```
┌─────────────┐       1:N        ┌──────────────┐
│  Workspace  │◄─────────────────┤ PublicShare  │
└─────────────┘                  └──────────────┘
       │                                 │
       │                                 │ 1:1
       │ 1:N                             │
       ▼                                 ▼
┌─────────────┐                  ┌──────────────┐
│     Doc     │◄─────────────────┤ PublicShare  │
└─────────────┘       1:1        └──────────────┘
       │
       │ 1:N
       ▼
┌─────────────┐
│    User     │
└─────────────┘
       │
       │ 1:N (author)
       ▼
┌──────────────┐
│ PublicShare  │
└──────────────┘
```

## Prisma Schema

### PublicShare Model (New)

```prisma
model PublicShare {
  // Primary Key
  id              String    @id @default(cuid())

  // Foreign Keys
  docId           String    @unique  // One public share per document
  workspaceId     String    // Explicit workspace scoping
  authorId        String    // User who created the share

  // Access Token
  token           String    @unique  @db.VarChar(255) // CUID token for anonymous access

  // Optional URL Features (Phase 2+)
  urlId           String?   @unique  @db.VarChar(255) // Custom URL slug
  domain          String?   @db.VarChar(255)          // Custom domain

  // Publication State
  published       Boolean   @default(true)            // Reserved for future, always true in Phase 1

  // Permission Level
  permission      Permission @default(READ)           // READ or COMMENT (Phase 1: READ only)

  // Expiration
  expiresAt       DateTime?  // Nullable for "never expire"

  // Revocation (Soft Delete)
  revokedAt       DateTime?  // Nullable for active shares
  revokedById     String?    // User who revoked

  // Analytics
  views           Int       @default(0)               // Total view count (bot-filtered)
  lastAccessedAt  DateTime? // Last successful access

  // SEO
  allowIndexing   Boolean   @default(false)           // Phase 1: hardcoded false

  // Audit Trail
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relationships
  doc             Doc       @relation(fields: [docId], references: [id], onDelete: Cascade)
  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  author          User      @relation("PublicShareAuthor", fields: [authorId], references: [id])
  revoker         User?     @relation("PublicShareRevoker", fields: [revokedById], references: [id])

  // Indexes
  @@index([token, revokedAt])          // Fast validation check
  @@index([docId, revokedAt])          // Fast share lookup by document
  @@index([workspaceId])               // Workspace filtering
  @@index([expiresAt])                 // Expiration checks
  @@map("PublicShare")
}
```

### Workspace Model (Extended)

```prisma
model Workspace {
  // ... existing fields ...

  // Public Sharing Configuration
  allowPublicSharing  Boolean @default(true)  // Master toggle for public sharing

  // Relationships
  publicShares  PublicShare[]  // All public shares in this workspace

  // ... existing relationships ...
}
```

### Permission Enum (Extended)

```prisma
enum Permission {
  READ
  COMMENT    // Phase 2: not exposed in UI for Phase 1
  EDIT
  MANAGE
}
```

## Field Specifications

### PublicShare Fields

| Field | Type | Nullable | Default | Description | Validation Rules |
|-------|------|----------|---------|-------------|------------------|
| `id` | String | No | cuid() | Primary key | Auto-generated CUID |
| `docId` | String | No | - | Document being shared | Must reference existing Doc, unique constraint |
| `workspaceId` | String | No | - | Workspace scoping | Must reference existing Workspace |
| `authorId` | String | No | - | Creator user | Must reference existing User |
| `token` | String | No | cuid() | Public access token | 25+ chars, URL-safe, unique |
| `urlId` | String | Yes | null | Custom URL slug | Alphanumeric + dashes, unique per workspace |
| `domain` | String | Yes | null | Custom domain | Valid domain format (Phase 3) |
| `published` | Boolean | No | true | Publication status | Always true in Phase 1 |
| `permission` | Permission | No | READ | Access level | READ or COMMENT (Phase 1: READ only) |
| `expiresAt` | DateTime | Yes | null | Expiration time | Must be future date if set, null = never |
| `revokedAt` | DateTime | Yes | null | Revocation time | Set when share is revoked |
| `revokedById` | String | Yes | null | Revoker user | Must reference existing User if set |
| `views` | Int | No | 0 | View count | Non-negative, atomic increment |
| `lastAccessedAt` | DateTime | Yes | null | Last access time | Updated on each valid access |
| `allowIndexing` | Boolean | No | false | SEO indexing flag | Hardcoded false in Phase 1 |
| `createdAt` | DateTime | No | now() | Creation timestamp | Auto-set |
| `updatedAt` | DateTime | No | now() | Last update timestamp | Auto-updated |

## Relationships

### PublicShare Relationships

1. **PublicShare → Doc** (Many-to-One, required)
   - One document can have one active public share
   - Cascade delete: If document deleted, public share is deleted
   - Use case: Access document content for rendering

2. **PublicShare → Workspace** (Many-to-One, required)
   - Explicit workspace scoping for admin controls
   - Cascade delete: If workspace deleted, all shares are deleted
   - Use case: Enforce workspace-level `allowPublicSharing` setting

3. **PublicShare → User (author)** (Many-to-One, required)
   - Tracks who created the share
   - No cascade: If user deleted, shares remain (audit trail)
   - Use case: Audit logging, permission validation

4. **PublicShare → User (revoker)** (Many-to-One, optional)
   - Tracks who revoked the share
   - No cascade: If user deleted, revocation record remains
   - Use case: Audit logging

## State Transitions

### Share Lifecycle

```
┌─────────┐
│ Created │  (revokedAt = null, expiresAt = null or future)
└────┬────┘
     │
     ├──► Active ──────┐
     │                 │
     │                 ├──► Expired (expiresAt < now, revokedAt = null)
     │                 │
     └─────────────────┴──► Revoked (revokedAt != null)
```

### State Validation Rules

**Active Share:**
- `revokedAt` IS NULL
- `expiresAt` IS NULL OR `expiresAt` > NOW()
- `workspace.allowPublicSharing` = true
- `doc.deletedAt` IS NULL
- `doc.archivedAt` IS NULL

**Expired Share:**
- `revokedAt` IS NULL
- `expiresAt` <= NOW()
- Returns 410 Gone on access

**Revoked Share:**
- `revokedAt` IS NOT NULL
- Returns 410 Gone on access
- Record preserved for audit trail (no hard delete)

## Validation Rules

### Business Logic Validation

1. **One Active Share Per Document**
   - Enforced by unique constraint on `docId`
   - Upsert operation for concurrent creation attempts
   - Returns existing share with `created: false` flag

2. **MANAGE Permission Required**
   - User must have MANAGE permission on document to create share
   - Validated in service layer (not database)
   - Permission check via existing `DocPermissionService`

3. **Workspace Setting Check**
   - `workspace.allowPublicSharing` must be true
   - Checked on every share creation
   - Existing shares become inaccessible (but not deleted) if disabled

4. **Expiration Time Validation**
   - If set, must be future date
   - Calculated from createdAt + duration
   - Supported durations: 1h, 1d, 1w, 1m, never (null)

5. **Child Document Access**
   - When accessing child via `/public/:token/doc/:childId`
   - System validates child is descendant of shared parent
   - Query: `SELECT id FROM Doc WHERE id = :childId AND parentId IN (recursive select from share.docId)`

### Database Constraints

```prisma
// Unique constraints
@@unique([docId])            // One share per document
@@unique([token])            // Tokens must be globally unique
@@unique([urlId])            // Custom slugs must be unique

// Index constraints (for performance)
@@index([token, revokedAt])  // Fast "is this token valid?" check
@@index([docId, revokedAt])  // Fast "does doc have active share?" check
```

## Migration Strategy

### Initial Migration (Phase 1)

```prisma
// Remove old DocShare model (if exists)
// CREATE TABLE PublicShare
// ADD COLUMN Workspace.allowPublicSharing
```

**Migration Steps**:
1. Create new `PublicShare` table with all fields
2. Add `allowPublicSharing` to Workspace (default true)
3. Remove old `DocShare` references (if any exist)
4. Create indexes for performance
5. Seed test data (optional for development)

**Data Migration**:
- No existing data to migrate (new feature)
- Clean slate implementation

**Rollback Plan**:
- Drop `PublicShare` table
- Remove `allowPublicSharing` from Workspace
- No data loss (new table)

## Query Patterns

### Common Queries

**1. Find Active Share by Token:**
```typescript
await prisma.publicShare.findUnique({
  where: { token },
  include: {
    doc: {
      include: {
        workspace: true,
      }
    }
  }
});

// Then validate:
// - share.revokedAt === null
// - share.expiresAt === null || share.expiresAt > now
// - share.workspace.allowPublicSharing === true
// - share.doc.deletedAt === null
```

**2. Find Share by Document:**
```typescript
await prisma.publicShare.findUnique({
  where: { docId },
  include: { author: true }
});
```

**3. List Workspace Shares:**
```typescript
await prisma.publicShare.findMany({
  where: {
    workspaceId,
    revokedAt: null  // Active shares only
  },
  include: {
    doc: { select: { id: true, title: true } },
    author: { select: { id: true, displayName: true } }
  },
  orderBy: { createdAt: 'desc' }
});
```

**4. Increment View Count (Atomic):**
```typescript
await prisma.publicShare.update({
  where: { id: shareId },
  data: {
    views: { increment: 1 },
    lastAccessedAt: new Date()
  }
});
```

**5. Find Root Shared Document:**
```typescript
// Iterative upward traversal (see research.md for full algorithm)
let currentDocId = startDocId;
let rootDocId = startDocId;

while (true) {
  const doc = await prisma.doc.findUnique({
    where: { id: currentDocId },
    select: { parentId: true }
  });

  if (!doc.parentId) break;

  const parentShare = await prisma.publicShare.findUnique({
    where: { docId: doc.parentId, token, revokedAt: null }
  });

  if (parentShare) {
    rootDocId = doc.parentId;
    currentDocId = doc.parentId;
  } else {
    break;
  }
}

return rootDocId;
```

## Data Volume Estimates

**Assumptions**:
- 10,000 active users
- 20% create public shares (2,000 users)
- Average 3 shares per user
- **Total: ~6,000 public shares**

**Storage**:
- PublicShare record: ~500 bytes
- Total: 6,000 × 500 bytes = 3 MB
- With indexes: ~10 MB
- **Negligible impact on database size**

**Query Performance**:
- Token lookup: O(1) with unique index (<5ms)
- Workspace filtering: O(N) but indexed (<50ms for 6K records)
- View count update: O(1) atomic operation (<5ms)

## Security Considerations

### Token Security

**Entropy**: CUID tokens provide ~132 bits of entropy
- Collision probability: Negligible (<10^-20 for 1 billion tokens)
- Guessing attacks: Infeasible (2^132 possibilities)
- Rate limiting: 100 req/min prevents scanning

**No Hashing**: Tokens stored in plaintext
- Rationale: Tokens are meant to be shared (not credentials)
- Lookup performance: O(1) with index
- Risk mitigation: Expiration + revocation capability

### Access Control

**Permission Layers**:
1. **Database**: Foreign key constraints prevent invalid references
2. **Service**: Permission checks before creation (MANAGE required)
3. **Middleware**: Rate limiting on public endpoints
4. **Application**: Workspace setting validation

**Audit Trail**:
- `authorId`: Who created the share
- `revokedById`: Who revoked the share
- `createdAt`: When share went public
- `revokedAt`: When access was removed
- **Immutable audit records** (soft delete only)

## Future Extensions (Phase 2+)

### Custom URL Slugs

```prisma
urlId   String?   @unique  @db.VarChar(255)
```

- User-friendly URLs: `/s/my-product-docs` instead of `/s/ckl2m3k4j...`
- Validation: Alphanumeric + dashes, 3-50 characters
- Automatic fallback to token if slug taken

### PublicAccessLog (Detailed Analytics)

```prisma
model PublicAccessLog {
  id            String    @id @default(cuid())
  shareId       String
  accessedAt    DateTime  @default(now())
  ipHash        String    @db.VarChar(64)  // HMAC-SHA256(IP + salt)
  userAgent     String?   @db.Text
  referer       String?   @db.Text
  country       String?   @db.VarChar(2)   // ISO country code

  share         PublicShare @relation(fields: [shareId], references: [id], onDelete: Cascade)

  @@index([shareId, accessedAt])
  @@map("PublicAccessLog")
}
```

- GDPR-compliant (hashed IPs, no PII)
- Geographic analytics (country-level only)
- Referer tracking for share effectiveness

### Password Protection

```prisma
passwordHash  String?   @db.VarChar(255)  // bcrypt hash
```

- Optional password for sensitive documents
- Not stored in plaintext
- bcrypt hashing with salt

## Summary

**Schema Complexity**: Low
- 1 new model (`PublicShare`)
- 1 field addition (`Workspace.allowPublicSharing`)
- 0 breaking changes

**Performance Impact**: Minimal
- Indexed queries (<10ms)
- Atomic view count updates
- Cacheable navigation trees

**Constitution Compliance**: ✅ Full
- Database-first with Prisma
- Type safety via generated types
- Migration-based schema changes
- CLS-compatible transaction patterns

**Ready for Implementation**: Yes
- All fields defined and validated
- Migration strategy documented
- Query patterns established
- Security model reviewed
