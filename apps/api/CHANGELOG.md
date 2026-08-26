# @idea/api

## 0.1.0

### Minor Changes

- 9f4378d: Add comment system with reactions

  Enable rich discussions on documents:

  - Threaded comment conversations with nesting support
  - Rich text comments powered by TipTap
  - Emoji reactions on any comment
  - Resolve/unresolve comment threads
  - Soft delete with restoration capability
  - Track comment authors and timestamps
  - Rate-limited reactions (25/minute) to prevent spam

- 9f4378d: Add document import system

  Enable seamless content migration with background processing:

  - 3-step import workflow (prepare, upload to S3, process)
  - Markdown file import (.md, .markdown)
  - Drag-and-drop file upload
  - Background processing with BullMQ
  - Job status tracking (pending, processing, complete, error)
  - Choose target workspace, subspace, and parent document
  - Temporary import records with auto-cleanup after 24 hours
  - Support for bulk document migration

- 9f4378d: Add member groups and guest collaboration

  Enable efficient team organization and external collaboration:

  - Create and manage user groups within workspaces
  - Assign permissions to entire groups at once
  - Time-limited group memberships with expiration
  - Batch operations for group management
  - Invite external users as guests without workspace membership
  - Time-limited guest access with automatic expiration
  - Track guest activity and status
  - Upgrade guests to full workspace members

- 9f4378d: Add smart notification system

  Implement comprehensive notification system with intelligent filtering:

  - Real-time delivery via WebSocket
  - Multiple notification categories (mentions, comments, subscriptions, permission requests, join requests, invitations)
  - Action-required special notifications with approval workflows
  - Workspace and category-based filtering
  - Batch operations (mark all as read, bulk view)
  - Auto-mark as viewed after 2s in viewport
  - Per-category notification preferences
  - Per-workspace unread counters
  - Notification cancellation to prevent duplicates

- 9f4378d: Add advanced 7-level permission hierarchy

  Implement sophisticated permission system with cascading inheritance:

  - 7-level hierarchy (direct → group → subspace admin → subspace member → workspace admin → workspace member → guest)
  - 5 permission levels (none, read, comment, edit, manage)
  - Cascading inheritance from parent documents
  - Per-document permission overrides
  - Time-limited access for guests and group memberships
  - Permission request and approval workflow

- 9f4378d: Add public document sharing

  Enable sharing documents publicly with analytics:

  - Generate unique shareable links with token-based access
  - Custom URL slugs (optional)
  - Set permission levels (READ or COMMENT)
  - Optional expiration dates for time-sensitive sharing
  - View count tracking with bot filtering
  - Revoke access anytime
  - SEO indexing control (disabled by default)
  - Last accessed timestamps
  - Access child documents through public share
  - Workspace-level public sharing toggle

- 9f4378d: Add document subscription system

  Allow users to follow documents and subspaces for updates:

  - Subscribe to specific documents or entire subspaces
  - Get notified when subscribed documents are published
  - View all active subscriptions in one place
  - Unsubscribe with soft delete
  - Smart duplicate prevention (don't notify if user already viewed)
  - Only notify on document publish, not every edit
  - Respect user notification preferences

- 9f4378d: Add multi-workspace and subspace system

  Implement comprehensive workspace management with 5 subspace types (workspace-wide, public, invite-only, private, personal). Features include:

  - Multi-workspace support with custom ordering
  - Subspace hierarchy with flexible visibility controls
  - Last-viewed document tracking per workspace
  - Workspace-level settings and permissions
  - Navigation trees for document organization

### Patch Changes

- Updated dependencies [9f4378d]
- Updated dependencies [9f4378d]
- Updated dependencies [9f4378d]
- Updated dependencies [9f4378d]
- Updated dependencies [9f4378d]
- Updated dependencies [9f4378d]
- Updated dependencies [9f4378d]
- Updated dependencies [9f4378d]
  - @idea/contracts@1.1.0
