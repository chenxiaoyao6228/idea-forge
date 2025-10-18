# Add Notification Settings - Change Proposal

## Status: ✅ Ready for Review & Implementation

This proposal has been validated with OpenSpec and is ready for your review and approval.

## Quick Summary

**What:** Add notification preference controls to General Settings, allowing users to enable/disable notification categories (Mentions, Sharing, Inbox, Subscribe).

**Why:** Users need control over notification noise; infrastructure exists but lacks UI.

**Impact:** No breaking changes, no schema migration, backward compatible.

## Files Created

### Core Proposal Documents
- ✅ `proposal.md` - Why, what changes, impact analysis
- ✅ `tasks.md` - 20 implementation tasks organized by area
- ✅ `design.md` - Technical decisions and rationale
- ✅ `notification-setting-plan.md` - Original planning document with your decisions

### Specification Deltas
- ✅ `specs/notification-settings/spec.md` - NEW capability with 8 requirements, 24 scenarios
- ✅ `specs/notifications/spec.md` - MODIFIED existing notification creation behavior

## Validation Results

```bash
$ openspec validate add-notification-settings --strict
✅ Change 'add-notification-settings' is valid
```

## Key Design Decisions (Based on Your Approval)

1. **Settings Scope:** User-scoped (global across workspaces) ✅
2. **Granularity:** Category-level toggles (4 categories) ✅
3. **Multi-Channel:** Web-only for Phase 1 ✅
4. **Defaults:** All notifications enabled by default (opt-out) ✅
5. **Future Categories:** All 4 categories shown and functional ✅
6. **Action-Required:** Allow disabling with warning dialog ✅

## Implementation Scope

### Backend (10 tasks)
- Create `NotificationSettingService` for preference management
- Add 2 API endpoints: GET/PUT notification settings
- Integrate settings check into notification creation
- Add contracts and validation schemas

### Frontend (7 tasks)
- Add "Notification Preferences" section to General Settings
- Create 4 category toggles with icons and descriptions
- Implement warning dialog for action-required categories
- Add state management hooks and API integration

### Testing (3 tasks)
- Backend unit and integration tests
- Frontend component tests
- End-to-end integration tests

## What's Next?

### Option 1: Proceed with Implementation
If you approve the proposal, I can start implementing immediately by following the task checklist in `tasks.md`.

**Command to start:**
```bash
# I'll use TodoWrite to track progress through all 20 tasks
```

### Option 2: Request Changes
If you'd like to modify any design decisions or add requirements, let me know and I'll update the proposal.

### Option 3: Archive for Later
If you want to defer this feature, we can archive the proposal for future consideration.

## Requirements Summary

The proposal defines:
- **8 new requirements** for notification-settings capability
- **1 modified requirement** for notifications capability
- **24 total scenarios** covering all use cases
- **0 breaking changes**
- **0 database migrations** required

## Related Resources

- Notification panel: `apps/client/src/components/notification/notification-panel.tsx`
- Existing notification service: `apps/api/src/notification/notification.service.ts`
- Database model: `apps/api/prisma/schema.prisma` (NotificationSetting)
- Contracts: `packages/contracts/src/notification.ts`

---

**Ready to proceed?** Let me know if you'd like me to:
1. ✅ **Start implementation** (I'll follow tasks.md and track progress)
2. 🔄 **Revise the proposal** (if you have feedback)
3. 📋 **Explain any part in detail** (if you have questions)
