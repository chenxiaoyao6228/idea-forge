# Notifications Specification (Delta)

## ADDED Requirements

### Requirement: Notification Creation
The system SHALL create notifications for users when relevant events occur, subject to user notification preferences.

#### Scenario: Create notification for user with default settings
- **WHEN** permission request event occurs for user without explicit notification settings
- **THEN** notification is created (default enabled behavior)
- **AND** notification is stored in database
- **AND** notification appears in user's notification panel

#### Scenario: Create notification for user with enabled category
- **WHEN** workspace invitation event occurs for user
- **AND** user has INBOX category enabled in notification settings
- **THEN** notification is created
- **AND** notification is stored in database

#### Scenario: Skip notification for user with disabled category
- **WHEN** permission grant event occurs for user
- **AND** user has SHARING category disabled in notification settings
- **THEN** notification is NOT created
- **AND** no database record is written
- **AND** no WebSocket event is broadcast

#### Scenario: Settings check by event type
- **WHEN** creating notification of type SUBSPACE_INVITATION
- **THEN** system queries NotificationSetting for userId and eventType SUBSPACE_INVITATION
- **AND** defaults to enabled if no setting record exists
- **AND** proceeds with creation if webEnabled is true

#### Scenario: Multiple recipients with different settings
- **WHEN** creating notifications for multiple users (e.g., bulk workspace invite)
- **THEN** system checks settings individually for each recipient
- **AND** creates notification only for users with category enabled
- **AND** skips creation for users with category disabled
