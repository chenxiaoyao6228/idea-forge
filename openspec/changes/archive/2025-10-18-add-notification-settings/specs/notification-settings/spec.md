# Notification Settings Specification

## ADDED Requirements

### Requirement: Notification Category Preferences
The system SHALL allow users to enable or disable notification categories (MENTIONS, SHARING, INBOX, SUBSCRIBE) to control which types of notifications they receive.

#### Scenario: User fetches notification settings
- **WHEN** user opens General Settings page
- **THEN** system displays current notification preferences for all 4 categories
- **AND** each category shows enabled/disabled state

#### Scenario: User enables notification category
- **WHEN** user toggles a disabled category to enabled
- **THEN** system updates all event settings for that category to enabled
- **AND** user receives notifications for that category going forward
- **AND** UI updates immediately (optimistic update)

#### Scenario: User disables notification category
- **WHEN** user toggles an enabled category to disabled
- **THEN** system updates all event settings for that category to disabled
- **AND** user does not receive notifications for that category going forward
- **AND** UI updates immediately (optimistic update)

### Requirement: Action-Required Category Warning
The system SHALL warn users when attempting to disable categories containing action-required notifications (SHARING, INBOX).

#### Scenario: User disables action-required category
- **WHEN** user toggles SHARING or INBOX category to disabled
- **THEN** system displays warning dialog explaining consequences
- **AND** dialog lists what notifications will be missed
- **AND** user must confirm or cancel the action

#### Scenario: User confirms disable action-required category
- **WHEN** user confirms disabling action-required category in warning dialog
- **THEN** system disables the category as requested
- **AND** warning dialog closes

#### Scenario: User cancels disable action-required category
- **WHEN** user cancels disabling action-required category in warning dialog
- **THEN** system keeps the category enabled
- **AND** toggle remains in enabled position
- **AND** warning dialog closes

### Requirement: Default Notification Settings
The system SHALL enable all notification categories by default for new users and existing users without explicit settings.

#### Scenario: New user default settings
- **WHEN** new user is created
- **THEN** all notification categories are implicitly enabled
- **AND** no database records exist until user changes preferences

#### Scenario: Existing user without settings
- **WHEN** existing user opens notification settings for first time
- **THEN** all categories display as enabled (default behavior)
- **AND** no database records exist until user changes preferences

### Requirement: User-Scoped Settings
The system SHALL store notification preferences at the user level, applying settings globally across all workspaces.

#### Scenario: Settings apply across workspaces
- **WHEN** user disables SHARING category
- **THEN** setting applies to all workspaces user is member of
- **AND** user does not receive SHARING notifications in any workspace

#### Scenario: Settings persist across sessions
- **WHEN** user changes notification preferences and logs out
- **THEN** settings are preserved in database
- **AND** settings are restored when user logs back in

### Requirement: Category-to-Event Mapping
The system SHALL map notification categories to their constituent event types and manage individual event settings accordingly.

#### Scenario: Disable category updates all events
- **WHEN** user disables SHARING category
- **THEN** system creates/updates NotificationSetting records for PERMISSION_REQUEST, PERMISSION_GRANT, and PERMISSION_REJECT
- **AND** all records have webEnabled set to false

#### Scenario: Enable category updates all events
- **WHEN** user enables INBOX category
- **THEN** system creates/updates NotificationSetting records for WORKSPACE_INVITATION, SUBSPACE_INVITATION, and WORKSPACE_REMOVED
- **AND** all records have webEnabled set to true

#### Scenario: Empty category settings stored for future use
- **WHEN** user disables MENTIONS category (which has no events yet)
- **THEN** system stores the preference
- **AND** setting will apply when MENTIONS events are added in future

### Requirement: Optimistic UI Updates
The system SHALL update the UI immediately when user toggles settings, with rollback on failure.

#### Scenario: Successful settings update
- **WHEN** user toggles category and API call succeeds
- **THEN** UI remains in updated state
- **AND** success feedback is shown (implicit, no toast)

#### Scenario: Failed settings update
- **WHEN** user toggles category and API call fails
- **THEN** UI reverts to previous state
- **AND** error toast notification is displayed
- **AND** user can retry the action

### Requirement: Settings Enforcement in Notification Creation
The system SHALL check user notification settings before creating notifications and skip creation if category is disabled.

#### Scenario: Create notification for enabled category
- **WHEN** system attempts to create PERMISSION_REQUEST notification
- **AND** user has SHARING category enabled
- **THEN** notification is created and stored in database
- **AND** notification appears in user's notification panel

#### Scenario: Skip notification for disabled category
- **WHEN** system attempts to create WORKSPACE_INVITATION notification
- **AND** user has INBOX category disabled
- **THEN** notification is NOT created
- **AND** no database record is written
- **AND** no notification appears in user's panel

#### Scenario: Settings check uses event type
- **WHEN** checking if notification should be created
- **THEN** system queries NotificationSetting by userId and specific eventType
- **AND** defaults to enabled if no setting exists (opt-out model)

### Requirement: Web-Only Notification Channel
The system SHALL support web notification preferences only in Phase 1, with email and chat channels deferred to Phase 2+.

#### Scenario: Settings UI shows web toggle only
- **WHEN** user views notification settings
- **THEN** each category has single toggle for web notifications
- **AND** no email or chat toggles are shown

#### Scenario: Settings API manages webEnabled field
- **WHEN** system updates notification settings
- **THEN** only webEnabled field is modified
- **AND** emailEnabled and chatEnabled fields are not used (Phase 2+)
