# Notification Settings Design Document

## Context

The notification system currently sends all notifications to all users without preference controls. The `NotificationSetting` database model exists but is unused in the UI. This feature adds user-facing controls to manage notification preferences.

### Stakeholders
- **Users:** Want to reduce notification noise while keeping important notifications
- **Product:** Want to improve notification engagement by reducing fatigue
- **Engineering:** Want to leverage existing infrastructure without major changes

### Constraints
- Must use existing `NotificationSetting` model (no schema changes)
- Settings must be user-scoped (not workspace-scoped) per existing schema
- Must maintain backward compatibility (no breaking changes)
- Phase 1 focuses on web notifications only (email/chat deferred to Phase 2+)

## Goals / Non-Goals

### Goals
- ✅ Allow users to disable notification categories they don't want
- ✅ Provide category-level controls (not individual event controls)
- ✅ Warn users when disabling action-required categories
- ✅ Apply settings immediately to new notifications
- ✅ Support future notification categories (Mentions, Subscribe)
- ✅ Maintain default opt-out behavior (all enabled by default)

### Non-Goals
- ❌ Workspace-specific settings (would require schema change)
- ❌ Event-level granularity (too complex for Phase 1)
- ❌ Email/chat notification channels (Phase 2+)
- ❌ Quiet hours or notification scheduling
- ❌ Notification batching or grouping
- ❌ Retroactive filtering of existing notifications

## Decisions

### Decision 1: Category-Level Toggles (Not Event-Level)

**Choice:** UI shows 4 category toggles, backend stores multiple event records per category.

**Rationale:**
- Simpler UX: Users understand "Sharing" vs "Permission Request + Permission Grant + Permission Reject"
- Future-proof: New events can be added to categories without UI changes
- Aligns with notification panel's category organization

**Implementation:**
- Toggle "Sharing" → Backend creates/updates 3 records: `PERMISSION_REQUEST`, `PERMISSION_GRANT`, `PERMISSION_REJECT`
- Query settings → Backend groups by category and returns aggregated state
- Category considered "enabled" if ALL events in category are enabled

**Alternatives Considered:**
- Event-level toggles: More granular but complex UI, rejected for Phase 1
- Category stored in DB: Would require schema change, rejected

---

### Decision 2: Warning for Action-Required Categories (Not Forced Enablement)

**Choice:** Users CAN disable action-required categories, but see a warning dialog first.

**Rationale:**
- Respects user autonomy: Some users genuinely don't want certain notifications
- Provides informed consent: Warning explains consequences (missing invitations, etc.)
- Simpler implementation: No special logic for forced-enabled categories

**Implementation:**
- Before disabling SHARING or INBOX, show modal dialog
- Dialog lists consequences: "You may miss workspace invitations and permission requests"
- User must confirm or cancel
- Settings API allows any category to be disabled

**Alternatives Considered:**
- Force enable action-required: Prevents mistakes but removes user control, rejected
- No warning: Risky, users might miss important notifications, rejected

---

### Decision 3: User-Scoped Settings (Not Workspace-Scoped)

**Choice:** Settings apply globally across all workspaces for the user.

**Rationale:**
- Aligns with existing schema: `NotificationSetting` model has no `workspaceId` field
- Avoids migration: No schema change required
- Consistent UX: User maintains preferences regardless of workspace context

**Implementation:**
- Settings stored with `userId` only (no `workspaceId`)
- API endpoints do not require workspace parameter
- Settings UI in General Settings (not Workspace Settings)

**Trade-offs:**
- ✅ Simpler implementation, no migration
- ✅ Consistent behavior across workspaces
- ❌ Cannot have different preferences per workspace (acceptable for Phase 1)

---

### Decision 4: All Categories Functional (No "Coming Soon" Badges)

**Choice:** Show all 4 categories as toggleable, including MENTIONS and SUBSCRIBE.

**Rationale:**
- Future-proof: When events are added, settings already work
- Consistent UX: All categories behave the same way
- No conditional rendering: Simpler code

**Implementation:**
- All 4 categories shown with toggles
- Settings stored for MENTIONS/SUBSCRIBE even though no events exist yet
- When future events added, `getCategoryEventTypes()` updated and settings apply immediately

**Alternatives Considered:**
- "Coming soon" badges: Cluttered UI, inconsistent behavior, rejected
- Hide empty categories: Requires conditional logic, inconsistent with panel, rejected

---

### Decision 5: Optimistic Updates with Rollback

**Choice:** UI updates immediately, rolls back on API failure.

**Rationale:**
- Better UX: Instant feedback, no waiting for API
- Handles failures gracefully: Rollback + error toast on failure

**Implementation:**
```typescript
// Pseudocode
const updateCategorySetting = async (category, enabled) => {
  const previousSettings = notificationSettings; // Snapshot

  // Optimistic update
  setNotificationSettings({
    ...previousSettings,
    [category]: { enabled }
  });

  try {
    await api.updateCategorySettings(category, enabled);
  } catch (error) {
    // Rollback
    setNotificationSettings(previousSettings);
    toast.error("Failed to update settings");
  }
};
```

---

### Decision 6: Settings Check in Notification Creation (Not Filtering)

**Choice:** Check settings BEFORE creating notification, not after.

**Rationale:**
- Avoids database writes: Don't create notifications that will be filtered
- Cleaner data: Notification table only has relevant notifications
- Better performance: No need to filter on read

**Implementation:**
```typescript
// In NotificationService.createNotification()
async createNotification(userId, event, data) {
  // Check user settings first
  const isEnabled = await this.settingService.isNotificationEnabled(userId, event);
  if (!isEnabled) {
    return null; // Skip creation
  }

  // Proceed with creation
  return this.prisma.notification.create({ ... });
}
```

**Alternatives Considered:**
- Filter on read: Wastes database space, slower queries, rejected
- Soft delete disabled notifications: Complex, no benefit, rejected

## Risks / Trade-offs

### Risk 1: Users Disabling Critical Notifications
- **Mitigation:** Warning dialog explaining consequences
- **Impact:** Low - users who disable are making informed choice

### Risk 2: Settings Out of Sync Across Devices
- **Mitigation:** Fetch settings on page load, optimistic updates
- **Impact:** Low - settings sync quickly, infrequent changes

### Risk 3: Performance Impact on Notification Creation
- **Mitigation:** Cache user settings in memory (future optimization)
- **Impact:** Low - single DB query per notification creation, acceptable

### Risk 4: Category-to-Event Mapping Maintenance
- **Mitigation:** Central `getCategoryEventTypes()` function in contracts
- **Impact:** Low - mappings rarely change, centralized logic

### Trade-off: No Workspace-Specific Settings
- **Benefit:** Simpler implementation, no migration
- **Cost:** Less flexibility (cannot have different prefs per workspace)
- **Decision:** Acceptable for Phase 1, can add in Phase 2+ if needed

## Migration Plan

### Phase 1 (This Change)
1. Deploy backend changes (settings service + API endpoints)
2. Deploy frontend changes (settings UI in General Settings)
3. No database migration required (model already exists)
4. Monitor: Check settings usage metrics, notification volume changes

### Phase 2+ (Future)
- Add MENTIONS event types (when mention feature implemented)
- Add SUBSCRIBE event types (when subscription feature implemented)
- Add email/chat channels (multi-channel preferences)
- Consider workspace-scoped settings if high user demand

### Rollback Plan
1. Feature flag: Can disable settings UI via feature flag if issues arise
2. Backend is backward compatible: If settings don't exist, defaults to enabled
3. No data loss: Notifications still created for users without settings

## Open Questions

None - all design decisions finalized based on user approval.
