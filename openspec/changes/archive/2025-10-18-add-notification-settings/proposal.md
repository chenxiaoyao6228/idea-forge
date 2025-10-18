# Notification Settings Proposal

## Why

Users currently have no control over which notifications they receive. All notification types are enabled by default with no way to customize preferences. This can lead to notification fatigue and decreased engagement with truly important notifications.

The notification system already has infrastructure in place (`NotificationSetting` model), but lacks the user-facing interface to manage preferences.

## What Changes

Add a "Notification Preferences" section to the General Settings page that allows users to control which notification categories they want to receive:

- **UI Changes:**
  - Add notification preferences section to `apps/client/src/pages/main/settings/general/index.tsx`
  - Display 4 category toggles: Mentions, Sharing, Inbox, Subscribe
  - Show warning dialog when disabling action-required categories (Sharing, Inbox)
  - All categories functional (including Mentions/Subscribe for future use)

- **Backend Changes:**
  - Create `NotificationSettingService` for managing user preferences
  - Add API endpoints: `GET /notification-settings`, `PUT /notification-settings/:category`
  - Integrate settings check into notification creation flow
  - Category toggles map to multiple event types in database

- **Behavior:**
  - Settings are user-scoped (apply across all workspaces)
  - Category-level control (toggle affects all events in that category)
  - Web notifications only (email/chat for Phase 2+)
  - Opt-out model: All categories enabled by default
  - Respects user choice even for action-required notifications (with warning)

## Impact

### Affected Specs
- `notification-settings` (NEW) - User notification preference management
- `notifications` (MODIFIED) - Notification creation now checks user settings

### Affected Code
- **Backend:**
  - `apps/api/src/notification/notification.service.ts` - Add settings check before creating notifications
  - `apps/api/src/notification/notification-setting.service.ts` (NEW) - Preference management service
  - `apps/api/src/notification/notification.controller.ts` - Add settings endpoints
  - `packages/contracts/src/notification.ts` - Add settings request/response schemas

- **Frontend:**
  - `apps/client/src/pages/main/settings/general/index.tsx` - Add notification preferences UI
  - `apps/client/src/stores/notification-store.ts` - Add settings management hooks
  - `apps/client/src/apis/notification.ts` - Add settings API calls

### Database
- Uses existing `NotificationSetting` model (no schema changes required)
- Records created on-demand when user changes preferences

### User Experience
- ✅ Users can reduce notification noise
- ✅ Better notification engagement
- ✅ Preserved choice for critical notifications
- ⚠️ Users might miss important notifications if they disable categories (mitigated by warning)

### Backward Compatibility
- ✅ No breaking changes
- ✅ Existing users: All notifications enabled (current behavior)
- ✅ New users: All notifications enabled by default
- ✅ No database migration required
