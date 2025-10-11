# Feature Specification: Public Document Sharing

**Feature Branch**: `001-public-document-sharing`
**Created**: 2025-10-10
**Status**: Draft
**Input**: User description: "Enable users to share documents with anyone on the internet via a public link, without requiring the viewer to have an account or be invited to the workspace"

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Create Public Share Link (Priority: P1)

A document owner or workspace admin needs to share a document with people outside their workspace without requiring them to sign up or be added as collaborators. They enable public sharing, generate a unique link, and copy it to share via email, social media, or other channels.

**Why this priority**: This is the core value proposition of the feature - enabling users to share content beyond workspace boundaries with minimal friction. Without this, the feature has no utility.

**Independent Test**: Can be fully tested by creating a document, enabling public sharing, generating a link, and verifying the link is accessible in an incognito browser window. Delivers immediate value as the link can be shared externally.

**Acceptance Scenarios**:

1. **Given** a user has MANAGE permission on a document and workspace allows public sharing, **When** they toggle "Public sharing" ON in the sharing settings, **Then** the system generates a unique unguessable URL and displays it for copying
2. **Given** a public share link is created, **When** the user clicks "Copy public link", **Then** the URL is copied to clipboard and a success message is shown
3. **Given** a user is creating a public share, **When** they select an expiration time from the dropdown (Never, 1 hour, 1 day, 1 week, 1 month), **Then** the share is configured with the chosen expiration
4. **Given** a workspace has public sharing disabled, **When** a user attempts to create a public share, **Then** they see an error message "Public sharing is disabled for this workspace. Contact workspace admin"
5. **Given** a user lacks MANAGE permission on a document, **When** they view the sharing settings, **Then** the public sharing toggle is disabled with a tooltip explaining "Only document managers can create public links"
6. **Given** a document already has a public share, **When** a user opens the sharing settings, **Then** they see the existing link instead of creating a new one

---

### User Story 2 - Access Public Document (Priority: P1)

An anonymous user receives a public link via email or social media and clicks it to view the document. They should be able to read the full document content without signing up or logging in, with a clean read-only viewing experience.

**Why this priority**: This is the consumer side of the core feature. Without working public access, creating links has no value. This must work alongside User Story 1 for a complete MVP.

**Independent Test**: Can be tested by opening a public link in an incognito browser window and verifying the document displays correctly with read-only access. Delivers value as anonymous users can consume shared content.

**Acceptance Scenarios**:

1. **Given** a valid public link exists and is not expired, **When** an anonymous user clicks the link, **Then** they see the document content in a clean read-only view with Idea Forge branding
2. **Given** an anonymous user is viewing a public document, **When** they interact with the content, **Then** they can scroll, read, and view all content but cannot edit
3. **Given** a public link has expired, **When** a user tries to access it, **Then** they see a "This link has expired" page with the expiration date
4. **Given** a public link has been revoked, **When** a user tries to access it, **Then** they see a "This link has been revoked" page
5. **Given** a public link token doesn't exist, **When** a user tries to access it, **Then** they see a "Document not found" page
6. **Given** each public link access, **When** the document loads successfully, **Then** the view count is incremented and the last accessed timestamp is updated

---

### User Story 3 - Navigate Hierarchical Shared Documents (Priority: P1)

When a parent document is shared publicly, all its child documents become accessible. An anonymous user viewing a shared parent document can navigate to child documents via a sidebar navigation tree.

**Why this priority**: Essential for the MVP to support real-world use cases like sharing documentation trees, knowledge bases, or multi-page guides. Makes public sharing significantly more useful than single-page sharing.

**Independent Test**: Can be tested by creating a parent document with multiple children, sharing the parent publicly, and verifying the navigation tree is visible and all child documents are accessible via nested URLs. Delivers value as users can share complete document hierarchies.

**Acceptance Scenarios**:

1. **Given** a parent document with child documents is publicly shared, **When** an anonymous user accesses the public link, **Then** they see a sidebar navigation tree showing all child documents
2. **Given** a navigation tree is visible, **When** an anonymous user clicks a child document, **Then** they navigate to `/public/:token/doc/:childDocId` and see the child document content
3. **Given** a document references another public document, **When** an anonymous user clicks the internal link, **Then** they navigate to the referenced document
4. **Given** a document references a non-public document, **When** an anonymous user views the reference, **Then** they see the document title but the link is not clickable
5. **Given** a child document in a public hierarchy, **When** it's accessed via the parent's public share, **Then** the system validates the child is a descendant of the shared parent before allowing access

---

### User Story 4 - Revoke Public Share (Priority: P2)

A document owner or workspace admin needs to revoke public access to a document that was previously shared. They toggle public sharing OFF, confirm the action, and the public link immediately stops working.

**Why this priority**: Important for security and control, but not required for initial MVP launch. Users can work around this by deleting the document or changing its content. Can be added after validating P1 stories work.

**Independent Test**: Can be tested by creating a public share, confirming the link works, revoking it, and verifying the link returns a 410 Gone error. Delivers value as users can control document visibility.

**Acceptance Scenarios**:

1. **Given** a document has an active public share, **When** a user toggles "Public sharing" OFF, **Then** they see a confirmation dialog warning "The public link will stop working immediately"
2. **Given** the user confirms revocation, **When** the revocation completes, **Then** the public share's `revokedAt` timestamp is set and a success message is shown
3. **Given** a public share has been revoked, **When** an anonymous user tries to access the link, **Then** they see a 410 Gone error page
4. **Given** a public share is revoked, **When** authenticated collaborators view the document, **Then** they see the public badge is removed
5. **Given** a public share is revoked, **When** the revocation completes, **Then** a WebSocket event notifies all collaborators that the link was revoked

---

### User Story 5 - Regenerate Public Link (Priority: P3)

A document owner needs to invalidate an existing public link and create a new one (e.g., if the link was leaked). They click "Regenerate link", confirm the action, and receive a new unique URL while the old link stops working.

**Why this priority**: Nice-to-have security feature but not critical for MVP. Users can achieve similar outcome by revoking and creating a new share. Good to add after core flows are stable.

**Independent Test**: Can be tested by creating a public share, regenerating the link, and verifying the old link returns 410 Gone while the new link works. Delivers value as users can recover from leaked links.

**Acceptance Scenarios**:

1. **Given** a document has an active public share, **When** a user clicks "Regenerate link", **Then** they see a warning "Anyone with the old link will lose access"
2. **Given** the user confirms regeneration, **When** the operation completes, **Then** a new unique token is generated and the old share's `revokedAt` is set
3. **Given** a link is regenerated, **When** the operation completes, **Then** the new link is displayed and expiration settings are preserved
4. **Given** a link is regenerated, **When** anonymous users try to access the old link, **Then** they see a 410 Gone error
5. **Given** a link is regenerated, **When** the operation completes, **Then** WebSocket events notify collaborators of both revocation and new share creation

---

### User Story 6 - Authenticated User Views Public Link (Priority: P2)

An authenticated workspace member clicks a public link to a document they already have access to. The system detects their authentication and shows a banner with an option to open the document in their workspace view.

**Why this priority**: Improves UX for team members but not critical for external sharing use case. Can be added after core anonymous access works.

**Independent Test**: Can be tested by creating a public share, logging in as a workspace member, accessing the public link, and verifying a banner appears with "Open in workspace" option. Delivers value as team members get seamless navigation.

**Acceptance Scenarios**:

1. **Given** an authenticated user with document permissions clicks a public link, **When** the page loads, **Then** they see the public view with a banner "You have [permission level] access to this document"
2. **Given** a banner is shown to an authenticated user, **When** they click "Open in workspace", **Then** they navigate to `/workspace/:workspaceId/doc/:docId` with full permissions
3. **Given** an authenticated user without document permissions clicks a public link, **When** the page loads, **Then** they see the standard anonymous public view without a banner

---

### Edge Cases

- **What happens when a document is deleted while a public share exists?** The public share record remains with `revokedAt` null, but access checks return 404 "Document not found". If the document is restored, the public link automatically works again.

- **What happens when a document is archived?** The public share remains active but returns 410 Gone when accessed. The share settings preserve the link for potential restoration.

- **What happens when the workspace is deleted?** All public shares in the workspace are cascade-deleted from the database via foreign key constraint. Public links immediately return 404.

- **What happens when public sharing is disabled at the workspace level?** Existing public shares become inaccessible (return 410 Gone) but are not deleted. If the setting is re-enabled, the shares work again.

- **What happens when two users simultaneously try to create a public share for the same document?** The system uses an upsert operation that returns the existing share to both users. The API responds with a `created: false` flag to indicate the share already existed.

- **How does the system handle bot traffic in view counts?** The system filters bot traffic using the `isbot` library before incrementing view counts, ensuring analytics reflect human visitors.

- **What happens when an expiration time is reached?** The system checks `expiresAt` on each access request. If expired, it returns 410 Gone with the expiration date. No background cleanup job is needed.

- **What happens when a child document is accessed directly without going through the parent?** The system validates that the child is a descendant of the shared parent document. If not, access is denied with 404.

- **How are XSS attacks prevented in public view?** The system uses TipTap editor in read-only mode instead of `dangerouslySetInnerHTML`, and applies DOMPurify sanitization for user-generated content.

- **What rate limits apply to public document access?** Public endpoints enforce 100 requests per minute per IP address to prevent scanning and abuse.

## Requirements _(mandatory)_

### Functional Requirements

#### Public Link Generation

- **FR-001**: System MUST generate unique, unguessable URLs using CUID tokens (25+ characters) for public shares
- **FR-002**: System MUST enforce one active public share per document via unique database constraint on `docId`
- **FR-003**: Users MUST have MANAGE permission on a document to create public shares
- **FR-004**: System MUST validate that workspace-level `allowPublicSharing` setting is enabled before creating shares
- **FR-005**: System MUST provide one-click copy functionality for public URLs with success toast notification
- **FR-006**: System MUST support link regeneration that revokes the old token and creates a new one while preserving expiration settings

#### Permission Levels

- **FR-007**: Public shares MUST default to READ-only permission level for anonymous users
- **FR-008**: Public viewers MUST NOT be able to edit, manage, or modify document content
- **FR-009**: System MUST prepare for future COMMENT permission level in schema but only implement READ in Phase 1

#### Expiration Settings

- **FR-010**: System MUST support five expiration options: Never, 1 hour, 1 day, 1 week, 1 month
- **FR-011**: System MUST calculate expiration time from `createdAt` timestamp plus selected duration
- **FR-012**: System MUST validate expiration on each public access request (not via background job)
- **FR-013**: System MUST return HTTP 410 Gone for expired links with expiration date in response
- **FR-014**: System MUST allow `expiresAt` to be null for "Never expire" option

#### Access Controls

- **FR-015**: System MUST check `revokedAt`, `expiresAt`, and workspace `allowPublicSharing` on every public document access
- **FR-016**: System MUST soft-delete revoked shares by setting `revokedAt` timestamp without removing records
- **FR-017**: System MUST hide/disable public shares when workspace `allowPublicSharing` is disabled without deleting records
- **FR-018**: System MUST display appropriate error pages: 404 for not found, 410 for expired/revoked

#### Hierarchical Sharing

- **FR-019**: System MUST automatically make all child documents accessible when parent is publicly shared
- **FR-020**: System MUST provide navigation tree sidebar showing full document tree from root shared parent using standalone public share logic with shared tree-building algorithms
- **FR-021**: System MUST validate child document access by confirming descendant relationship with shared parent through PublicShareService's isDescendantOf check
- **FR-022**: System MUST use nested URL structure `/public/:token/doc/:documentId` for child documents
- **FR-023**: System MUST make internal references to public documents clickable and accessible
- **FR-024**: System MUST display titles of non-public referenced documents but disable click navigation

#### Analytics

- **FR-025**: System MUST track total view count for each public share via atomic increment operations
- **FR-026**: System MUST record `lastAccessedAt` timestamp on each successful public document access
- **FR-027**: System MUST filter bot traffic using `isbot` library before incrementing view counts
- **FR-028**: System MUST not track or store IP addresses, cookies, or personal data in Phase 1

#### Real-time Updates

- **FR-029**: System MUST emit WebSocket events when public shares are created, updated, or revoked
- **FR-030**: System MUST update document UI to show/remove public badge in real-time for all collaborators
- **FR-031**: System MUST use event batching and deduplication to prevent race conditions

#### Security

- **FR-032**: System MUST enforce rate limiting of 100 requests per minute per IP address on public endpoints
- **FR-033**: System MUST render document content using TipTap editor in read-only mode (editable=false) to prevent XSS attacks and ensure rendering consistency with authenticated views
- **FR-034**: System MUST sanitize all user-generated content before public display using DOMPurify
- **FR-035**: System MUST use Content Security Policy (CSP) headers on public document pages
- **FR-036**: System MUST set robots noindex meta tags on all public documents in Phase 1
- **FR-037**: System MUST log all public share creation/revocation actions with user ID and timestamp for audit trail

#### Workspace Controls

- **FR-038**: Workspace admins MUST be able to enable/disable public sharing for entire workspace via `allowPublicSharing` boolean
- **FR-039**: System MUST prevent public share creation when workspace setting is disabled with clear error message
- **FR-040**: System MUST preserve existing public shares when workspace setting is disabled (soft hide)

#### Data Persistence

- **FR-041**: System MUST cascade delete all public shares when workspace is deleted
- **FR-042**: System MUST cascade delete public shares when document is deleted
- **FR-043**: System MUST preserve public share records indefinitely for audit trail (no automatic cleanup)
- **FR-044**: System MUST check document `deletedAt` and `archivedAt` status on every public access

#### Public Viewing Experience

- **FR-056**: System MUST use Shadcn/UI Sidebar components (SidebarProvider, Sidebar, SidebarContent) for consistent UI patterns with authenticated views
- **FR-057**: System MUST provide Table of Contents with hover-triggered expand/collapse UI, using IntersectionObserver for active heading tracking
- **FR-058**: System MUST provide scroll-to-top button that appears after scrolling threshold using existing useScrollTop hook
- **FR-059**: Backend MUST return hierarchical tree structure with recursive children in API responses (not flat lists)
- **FR-060**: System MUST maintain clear separation between public and authenticated permission systems while sharing tree-building algorithms

### Key Entities

- **PublicShare**: Represents a public sharing configuration for a document. Key attributes include:

  - Unique unguessable token (CUID) for anonymous access
  - Optional custom URL slug (Phase 2+)
  - Optional custom domain (Phase 3+)
  - Publication status (published boolean)
  - Permission level (READ or COMMENT)
  - Expiration timestamp (nullable for "never expire")
  - Revocation timestamp (nullable for active shares)
  - View count and last accessed timestamp
  - SEO indexing preference (default false)
  - Relationships to Document, Workspace, and Author (User)

- **Workspace**: Extended with public sharing configuration. New attributes:

  - Allow public sharing boolean (default true)
  - Future: Maximum expiration enforcement, password requirements (Phase 2+)
  - Relationship to all public shares in the workspace

- **Document**: Implicitly related to public shares. Important attributes for public access:

  - Hierarchical parent-child relationships
  - Deletion and archival status timestamps
  - Content (rendered via TipTap in public view)
  - Internal references to other documents

- **PublicAccessLog** (Phase 2): Detailed analytics for public share access. Attributes:
  - Access timestamp
  - Hashed IP address (HMAC-SHA256)
  - User agent and referer headers
  - Geographic country data
  - Relationship to PublicShare

## Success Criteria _(mandatory)_

### Measurable Outcomes

#### Adoption Metrics (30 days post-launch)

- **SC-001**: At least 20% of active users create one or more public shares within 30 days of feature launch
- **SC-002**: At least 5% of active users create 3 or more public shares within 30 days
- **SC-003**: Public document views exceed 10x the number of authenticated document views

#### Performance Metrics

- **SC-004**: 95% of public link requests load in under 2 seconds
- **SC-005**: Public document endpoints maintain 99.9% uptime
- **SC-006**: Error rate on public document requests remains below 1%
- **SC-007**: False 404 rate (valid links returning 404) stays below 0.1%

#### Quality Metrics

- **SC-008**: Zero critical security vulnerabilities discovered in penetration testing
- **SC-009**: 100% of CRUD operations covered by automated tests (unit, integration, E2E)
- **SC-010**: Less than 5% of users attempt to access expired links (indicates clear expiration communication)

#### User Satisfaction

- **SC-011**: Net Promoter Score (NPS) for public sharing feature exceeds 40
- **SC-012**: 90% of users successfully complete public share creation on first attempt
- **SC-013**: Less than 1% of public shares are revoked within first hour (indicates user confidence)

#### Business Value

- **SC-014**: Public viewers who convert to workspace members reaches at least 2% of total public viewers
- **SC-015**: Support tickets related to external sharing decrease by 50% compared to pre-launch baseline

## Clarifications

### Session 2025-10-10

- Q: How should public documents be rendered? → A: TipTap editor in read-only mode
- Q: When authenticated users with permissions visit `/public/:token`, what should happen? → A: Stay in public view with banner showing "You have [permission] access - Open in workspace"
- Q: Should we add a published field for preview workflow? → A: Keep immediate public access. Subscriber notifications deferred to Phase 4
- Q: Should we implement upward traversal for navigation sidebar? → A: Yes, traverse up to find root shared parent, show full tree from root
- Q: Component architecture approach? → A: Hybrid - reuse editor/content components but separate layout/navigation

### Session 2025-10-11

- Q: Should public share use separate tree logic or integrate with permission system? → A: **Keep standalone permission system**. The unified permission system is too tightly coupled with user authorization. Maintain clear separation between public and authenticated flows.
- Q: Should we reuse existing navigation tree components? → A: **Share algorithms, not components**. Extract tree-building algorithms (like buildDocumentTree, isDescendantOf) but create specialized public components (PublicLink, PublicTableOfContent) adapted from existing ones.
- Q: How should UI components be structured? → A: Use Shadcn/UI Sidebar components for consistency. Create PublicTableOfContent adapted from existing table-of-content.tsx. Use existing useScrollTop hook for scroll-to-top button.
- Q: What about anonymous collaboration? → A: **Clear boundary**: Anonymous users must sign up to become guests/members before accessing collaborative features (comments, editing). Public view is strictly read-only.

## Open Questions & Design Decisions

### Architecture Questions (from architecture-gaps-session.md)

The following design questions have been identified from analyzing competitor implementations. These need to be resolved before implementation:

#### P0 (Critical - Must Answer Before Implementation)

- **Q1**: ✅ RESOLVED - Hybrid approach: reuse editor/content components but keep separate layout/navigation

- **Q2**: ✅ RESOLVED - Keep immediate public access (no preview stage). Subscriber notifications in Phase 4

- **Q4**: ✅ RESOLVED - Show banner with "Open in workspace" option for authenticated users with permissions

- **Q6**: ✅ RESOLVED - Implement upward traversal to find root, show full document tree

- **Q10**: ✅ RESOLVED - Using TipTap editor in read-only mode for security and consistency

#### P1 (Important - Answer During Implementation)

- **Q3**: Should `includeChildDocuments` be user-configurable toggle or always true? [PRD says always true, but some competitors give users choice]

- **Q5**: If showing banner to authenticated users, what should the UX be (persistent, dismissible, or modal)? [NEEDS DECISION]

- **Q7**: How should child navigation work - show all siblings, only children, or parent + siblings + children? [NEEDS DECISION]

- **Q15**: Should subspaces have their own `allowPublicSharing` toggle, or keep workspace-level only? [NEEDS DECISION]

#### P2 (Nice to Have)

- **Q8**: Should we change URL pattern to `/s/:token` (shorter) or keep `/public/:token`? [NEEDS DECISION: PRD uses /public/:token]

- **Q13**: Should we add feature toggles via URL params (embed, print, sidebar)? [NEEDS DECISION]

- **Q14**: Should we add "Copy to Workspace" feature for authenticated users? [NEEDS DECISION]

### Implementation Clarity Needed

- **FR-046**: ✅ RESOLVED - System MUST detect authenticated users and show banner with "You have [permission] access - Open in workspace" option

- **FR-047**: ✅ RESOLVED - System MUST traverse up to find root shared document and display full tree in sidebar

- **FR-048**: ✅ RESOLVED - System renders content using TipTap editor in read-only mode

- **FR-049**: ✅ RESOLVED - System MUST use hybrid component architecture (shared TipTap editor and content components, separate layout/navigation)

- **FR-050**: ✅ RESOLVED - System uses immediate public access (no preview stage)

## Notes & References

### Related Documents

- Full PRD: `.cursor/docs/features/public-share-prd.md` (2649 lines with complete technical architecture)
- Architecture Gaps Analysis: `.cursor/docs/features/public-share-architecture-gaps-session.md` (22 critical questions from competitor analysis)
- Constitution: `.specify/memory/constitution.md` (Project architectural principles)

### Competitor Analysis Insights

Observed patterns from industry-standard document sharing platforms:

- Component reuse pattern (same components for public and private views)
- Permission-based features with granular control (allowShowSidebar, allowSelectionCopy, allowEdit, allowComment)
- Sidebar root discovery via upward traversal
- Auto-redirect for authenticated users who have direct permissions
- Two-stage sharing: `published: boolean` field for team preview before going public
- Hierarchical sharing with user choice: `includeChildDocuments: boolean`
- Share discovery API returning both direct and parent shares
- URL canonicalization with automatic redirects (UUID → custom slug)

### Phase 1 MVP Scope (2-3 weeks)

**Must Have:**

- Public link generation with CUID tokens
- Read-only permission level
- All 5 expiration options (never, 1h, 1d, 1w, 1m)
- Hierarchical sharing (parent → all children)
- Basic analytics (view count, last accessed)
- Link revocation
- WebSocket real-time updates
- Rate limiting on public endpoints
- Public share badge in document UI

**Deferred to Phase 2+:**

- Custom URL slugs (urlId field exists but no UI)
- SEO indexing toggle (allowIndexing field exists, hardcoded to false)
- Comment permission UI (permission field supports COMMENT but Phase 1 only shows READ)
- Password protection
- Advanced analytics with PublicAccessLog table
- Custom domains

**Deferred to Phase 4:**

- Subscriber notification system (similar to competitor notification features)

### Security Considerations

**Access Control:**

- Require MANAGE permission to create public shares
- Workspace-level setting to disable public sharing entirely
- Audit log of all public share creations (who, when, what document)
- Clear UI indicators showing document is publicly accessible

**Token Security:**

- Use CUID (25+ character unguessable tokens)
- Rate limit public document requests (100 req/min per IP)
- Monitor for scanning patterns (sequential token access)

**Content Security:**

- Sanitize all document content before public display
- Use DOMPurify for HTML sanitization
- Strip script tags and event handlers
- Content Security Policy (CSP) headers

**Privacy:**

- No IP address logging in Phase 1
- No cookies or tracking for public viewers
- Bot filtering for view counts
- Phase 2: Optional detailed analytics with hashed IPs (GDPR-friendly)

### Database Schema Design Decisions

**Finalized decisions (from PRD Design Questions):**

- Q1.1: Dedicated `PublicShare` table (remove old DocShare code)
- Q1.2: One public share per document (`docId @unique`)
- Q1.3: Workspace-level scoping (explicit `workspaceId` foreign key)
- Q2.1: Always include children (no toggle needed)
- Q2.2: Nested URLs `/public/:token/doc/:documentId`
- Q3.1: Token + optional custom slug (`token` + `urlId?`)
- Q3.2: URL format `/public/:tokenOrSlug`
- Q3.3: Add `domain` field now (nullable for Phase 3)
- Q4.2: Permission field with default READ
- Q5.1: Public shares bypass DocVisibility (independent system)
- Q7.2: Soft delete only (keep records forever for audit trail)
- Q9.2: Hard delete with CASCADE on workspace/document deletion
- Q10.2: Future-proof schema (all Phase 1-3 fields included, many nullable)
