# Implementation Tasks

## 1. Backend - Service Layer

- [x] 1.1 Create `NotificationSettingService` in `apps/api/src/notification/notification-setting.service.ts`
  - [x] 1.1.1 Implement `getUserSettings(userId)` - Fetch all user settings with category grouping
  - [x] 1.1.2 Implement `updateCategorySettings(userId, category, enabled)` - Upsert settings for all events in category
  - [x] 1.1.3 Implement `getDefaultSettings()` - Return default settings structure
  - [x] 1.1.4 Implement `isNotificationEnabled(userId, eventType)` - Check if specific event enabled for user
- [x] 1.2 Update `NotificationService` to check settings before creating notifications
  - [x] 1.2.1 Inject `NotificationSettingService` into `NotificationService`
  - [x] 1.2.2 Add settings check in `createNotification()` method
  - [x] 1.2.3 Skip notification creation if user has disabled the event type

## 2. Backend - API Layer

- [x] 2.1 Add settings endpoints to `NotificationController`
  - [x] 2.1.1 `GET /api/notifications/settings` - Get user's notification settings
  - [x] 2.1.2 `PUT /api/notifications/settings/:category` - Update category preferences
- [x] 2.2 Add DTOs and validation schemas
  - [x] 2.2.1 Create `GetNotificationSettingsResponse` schema in contracts
  - [x] 2.2.2 Create `UpdateCategorySettingsRequest` schema in contracts
  - [x] 2.2.3 Create `UpdateCategorySettingsResponse` schema in contracts

## 3. Backend - Contracts

- [x] 3.1 Add notification settings types to `packages/contracts/src/notification.ts`
  - [x] 3.1.1 Add `CategorySettings` interface (category, enabled, events)
  - [x] 3.1.2 Add `GetNotificationSettingsResponse` schema
  - [x] 3.1.3 Add `UpdateCategorySettingsRequest` schema (category, enabled)
  - [x] 3.1.4 Add `UpdateCategorySettingsResponse` schema
- [x] 3.2 Build contracts: `pnpm build:contracts`

## 4. Frontend - API Integration

- [x] 4.1 Add settings API calls to `apps/client/src/apis/notification.ts`
  - [x] 4.1.1 Add `getNotificationSettings()` API call
  - [x] 4.1.2 Add `updateCategorySettings(category, enabled)` API call

## 5. Frontend - State Management

- [x] 5.1 Add settings management to `apps/client/src/stores/notification-store.ts`
  - [x] 5.1.1 Add `notificationSettings` state slice
  - [x] 5.1.2 Add `fetchNotificationSettings()` action
  - [x] 5.1.3 Add `updateCategorySetting(category, enabled)` action with optimistic updates
  - [x] 5.1.4 Create `useNotificationSettings()` hook
  - [x] 5.1.5 Create `useUpdateCategorySetting()` hook

## 6. Frontend - UI Components

- [x] 6.1 Create notification settings section in `apps/client/src/pages/main/settings/general/index.tsx`
  - [x] 6.1.1 Add "Notification Preferences" heading and separator
  - [x] 6.1.2 Add category toggle list with 4 categories
  - [x] 6.1.3 Implement category icons (Bell, Users, Inbox, Bookmark)
  - [x] 6.1.4 Add category descriptions
  - [x] 6.1.5 Connect toggles to settings state
  - [x] 6.1.6 Add loading state during updates
  - [x] 6.1.7 Add error handling with toast notifications
- [x] 6.2 Create warning dialog component for action-required categories
  - [x] 6.2.1 Create `DisableNotificationWarningDialog` component
  - [x] 6.2.2 Show warning when user tries to disable SHARING or INBOX categories
  - [x] 6.2.3 Warn about missing invitations/permission requests
  - [x] 6.2.4 Allow user to confirm or cancel

## 7. Testing

- [ ] 7.1 Backend tests
  - [ ] 7.1.1 Unit tests for `NotificationSettingService`
  - [ ] 7.1.2 Integration tests for settings API endpoints
  - [ ] 7.1.3 Test notification creation respects user settings
  - [ ] 7.1.4 Test category-to-events mapping
- [ ] 7.2 Frontend tests
  - [ ] 7.2.1 Test settings fetch and display
  - [ ] 7.2.2 Test category toggle interactions
  - [ ] 7.2.3 Test warning dialog for action-required categories
  - [ ] 7.2.4 Test optimistic updates and rollback on error

## 8. Integration Testing

- [ ] 8.1 End-to-end testing
  - [ ] 8.1.1 Create user, verify all notifications enabled by default
  - [ ] 8.1.2 Disable SHARING category, verify permission notifications not created
  - [ ] 8.1.3 Re-enable SHARING category, verify notifications resume
  - [ ] 8.1.4 Test warning dialog appears for action-required categories
  - [ ] 8.1.5 Verify settings persist across sessions
  - [ ] 8.1.6 Verify settings apply across all workspaces (user-scoped)

## 9. Documentation

- [ ] 9.1 Update inline code comments
- [ ] 9.2 Add JSDoc comments for new service methods
- [ ] 9.3 Update API documentation (Swagger/OpenAPI)

## 10. Code Quality

- [x] 10.1 Run type checking: `pnpm -F @idea/api typecheck`
- [x] 10.2 Run type checking: `pnpm -F @idea/client typecheck`
- [x] 10.3 Run lint: `pnpm lint`
- [x] 10.4 Run format: `pnpm format`
