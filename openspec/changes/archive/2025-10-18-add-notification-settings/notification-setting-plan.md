# Notification Settings Feature Plan

## Overview

This document outlines the plan for implementing notification preference settings in the General Settings page, allowing users to control which notification types they want to receive.

## Current State Analysis

### Notification Categories (4 Types)

Based on the notification panel (`notification-panel.tsx`), the system has 4 notification categories:

1. **MENTIONS** - Notifications when users are mentioned in documents (Phase 2+)
2. **SHARING** - Permission requests, grants, and rejections
3. **INBOX** - Workspace invitations, subspace invitations, removal notifications
4. **SUBSCRIBE** - Document subscription notifications (Phase 2+)

### Current Event Types

From `packages/contracts/src/notification.ts`:

- **SHARING Category:**

  - `PERMISSION_REQUEST` - User requests access (action-required)
  - `PERMISSION_GRANT` - Permission approved (informational)
  - `PERMISSION_REJECT` - Permission rejected (informational)

- **INBOX Category:**

  - `WORKSPACE_INVITATION` - Invited to workspace (action-required)
  - `SUBSPACE_INVITATION` - Invited to subspace (action-required)
  - `WORKSPACE_REMOVED` - Removed from workspace (informational)

- **MENTIONS & SUBSCRIBE:** Currently empty (Phase 2+)

### Existing Database Model

The `NotificationSetting` model already exists in `schema.prisma`:

```prisma
model NotificationSetting {
  id        String @id @default(cuid())
  userId    String
  eventType String // NotificationEventType (validated at application layer)

  // Phase 2: Multi-channel preferences
  webEnabled Boolean @default(true) // Always true in Phase 1
  // emailEnabled Boolean @default(true)  // Phase 2
  // chatEnabled  Boolean @default(false) // Phase 2

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, eventType])
}
```

**Key Observations:**

- Settings are **user-scoped** (per userId), NOT workspace-scoped
- Uses `eventType` (specific events) rather than category (grouped events)
- Supports multi-channel (web, email, chat) - currently only web is used
- Default is `webEnabled: true` (opt-out model)

## Proposed UI Design

### Location

`apps/client/src/pages/main/settings/general/index.tsx` (General Settings tab)

### Layout Structure

The UI will display 4 toggleable notification categories matching the notification panel:

```
┌─────────────────────────────────────────────────────────────┐
│ Notification Preferences                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 🔔 Mentions                                        [Toggle] │
│    Receive notifications when you are mentioned              │
│                                                              │
│ 🤝 Sharing                                         [Toggle] │
│    Permission requests, grants, and rejections               │
│                                                              │
│ 📬 Inbox                                           [Toggle] │
│    Workspace and subspace invitations                        │
│                                                              │
│ 🔖 Subscribe                                       [Toggle] │
│    Updates on documents you're following                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Design Questions for Review

### 🔴 CRITICAL: Settings Scope

**Question 1: Where should notification settings be stored?**

The current `NotificationSetting` model is **user-scoped** (linked to `userId`), meaning:

- ✅ Settings apply globally across all workspaces
- ✅ User maintains preferences when switching workspaces
- ❌ Cannot have different preferences per workspace

**Options:**

- **A) Keep user-scoped (current schema)** - Simpler, consistent across workspaces
- **B) Make workspace-scoped** - Requires schema change, adds `workspaceId` field
- **C) Hybrid approach** - User defaults + optional workspace overrides (complex)

**My Recommendation:** Keep user-scoped (Option A) for Phase 1, align with existing schema design.

> Update: Option A please

---

### 🟡 Settings Granularity

**Question 2: Should we use category-level or event-level toggles?**

The database model uses `eventType` (specific events), but the UI shows categories (groups of events).

**Current mapping:**

- SHARING → `PERMISSION_REQUEST`, `PERMISSION_GRANT`, `PERMISSION_REJECT`
- INBOX → `WORKSPACE_INVITATION`, `SUBSPACE_INVITATION`, `WORKSPACE_REMOVED`

**Options:**

- **A) Category-level toggles (simpler UI)**

  - Toggle affects all events in that category
  - Example: Disable "Sharing" → disables all 3 permission events
  - Store one setting per category OR multiple event records with same value

- **B) Event-level toggles (more control)**
  - Separate toggle for each event type
  - Example: Enable `PERMISSION_REQUEST` but disable `PERMISSION_GRANT`
  - More granular but complex UI

**My Recommendation:** Category-level (Option A) for better UX. Backend creates/updates multiple event records when category toggle changes.

> Update: Category-level

---

### 🟡 Multi-Channel Support

**Question 3: Should we implement multi-channel preferences now or later?**

Schema supports `webEnabled`, `emailEnabled`, `chatEnabled`.

**Options:**

- **A) Web-only (Phase 1)** - Single toggle per category for web notifications
- **B) Multi-channel now** - Show channel options (Web, Email, Chat) for each category

**My Recommendation:** Web-only (Option A) for Phase 1. Email/Chat can be added later without UI redesign.

> Update: Option A

---

### 🟢 Default Behavior

**Question 4: What should be the default behavior for new users?**

**Options:**

- **A) Opt-out (all enabled by default)** - Aligns with `webEnabled: true` default
- **B) Opt-in (all disabled by default)** - User explicitly enables
- **C) Smart defaults** - Action-required enabled, informational disabled

**My Recommendation:** Opt-out (Option A) - Better user experience, users won't miss important notifications.

> Update: all enabled by default

---

### 🟢 Settings for Unimplemented Categories

**Question 5: Should MENTIONS and SUBSCRIBE settings be shown now (Phase 2+)?**

These categories have no events yet but will be added in Phase 2+.

**Options:**

- **A) Show all 4 categories** - Greyed out with "Coming soon" badge
- **B) Show only active categories** - Only SHARING and INBOX for now
- **C) Show all, allow toggling** - Store settings now, effective when events added

**My Recommendation:** Show all with "Coming soon" badge (Option A) for consistency with notification panel.

> Show all, allow toggling, effective when events added

---

### 🟢 Action-Required Notifications

**Question 6: Should action-required notifications be forcibly enabled?**

Events like `WORKSPACE_INVITATION`, `PERMISSION_REQUEST` require user action.

**Options:**

- **A) Always enabled (cannot disable)** - Prevents missing critical actions
- **B) User can disable** - Full control, user responsibility
- **C) Show warning on disable** - Allow but warn about consequences

**My Recommendation:** Allow disabling with warning (Option C) - Respects user autonomy while informing risks.

> Update: Option C

---

## Proposed Implementation Approach

Based on recommendations above:

### Backend Changes

1. **API Endpoints** (in `apps/api/src/notification/`)

   - `GET /notification-settings` - Fetch user's notification preferences
   - `PUT /notification-settings/:category` - Update category preferences
   - `GET /notification-settings/defaults` - Get default settings

2. **Service Layer**

   - `NotificationSettingService.getUserSettings(userId)` - Get or create defaults
   - `NotificationSettingService.updateCategorySettings(userId, category, enabled)` - Toggle category
   - Backend maps category → event types and creates/updates multiple records

3. **Filtering Logic**
   - Update `NotificationService.createNotification()` to check user settings
   - Skip notification creation if user has disabled that event type

### Frontend Changes

1. **Settings UI** (`apps/client/src/pages/main/settings/general/index.tsx`)

   - Add "Notification Preferences" section
   - 4 category toggles with icons and descriptions
   - "Coming soon" badges for MENTIONS and SUBSCRIBE

2. **State Management**

   - Add `useNotificationSettings` hook in stores
   - Fetch settings on settings page load
   - Optimistic updates with rollback on error

3. **Components**
   - Create `NotificationCategoryToggle` component
   - Reusable toggle with category info and status

### Database Operations

- **On category toggle:**

  1. Get event types for category: `getCategoryEventTypes(category)`
  2. For each event type, upsert `NotificationSetting` record
  3. Set `webEnabled` to toggle value

- **On settings fetch:**
  1. Query all user's `NotificationSetting` records
  2. Group by category
  3. Return category-level enabled/disabled state

## Open Questions for User

Please answer these questions so I can finalize the implementation plan:

1. **Settings Scope:** Should notification preferences be global (user-level) or per-workspace? _(Recommendation: Global/user-level)_

2. **Granularity:** Should users toggle entire categories (Sharing, Inbox) or individual events (Permission Request, Workspace Invitation)? _(Recommendation: Category-level)_

3. **Multi-channel:** Implement web-only now, or add email/chat toggles too? _(Recommendation: Web-only for Phase 1)_

4. **Defaults:** Should all notifications be enabled by default (opt-out)? _(Recommendation: Yes, opt-out model)_

5. **Future Categories:** Show MENTIONS/SUBSCRIBE settings now with "Coming soon" badge? _(Recommendation: Yes, for UI consistency)_

6. **Action-required:** Should critical notifications (invitations, permission requests) be forcibly enabled? _(Recommendation: Allow disabling with warning)_

7. **Additional preferences:** Any other notification settings you'd like? Examples:
   - Quiet hours (no notifications during certain times)
   - Notification batching (group similar notifications)
   - Sound/desktop notification preferences

## Next Steps

After you review and answer the questions:

1. I'll create the formal OpenSpec proposal with spec deltas
2. We'll validate the proposal with `openspec validate --strict`
3. Upon approval, I'll implement the feature following the tasks checklist
4. We'll test the integration with existing notification system

---

**Note:** This plan document serves as a pre-proposal discussion. Once we align on the design decisions, I'll create the formal OpenSpec proposal structure with `proposal.md`, `tasks.md`, and spec deltas.
