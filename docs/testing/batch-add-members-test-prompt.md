# Batch Add Members Feature Test Prompt

## Overview

This prompt provides a complete testing workflow for the batch add workspace members feature, including database queries and API calls.

## Prerequisites

- PostgreSQL MCP connection: `postgresql://postgres:123456@localhost:5432/ideaforge?schema=public`
- API server running on `http://localhost:5000`
- Valid authentication cookies (accessToken and refreshToken)
- Target workspace ID: `cmfnpx9bf0002c60bau4s7ogc` (York team3)

## Test Workflow

### Step 1: Get Users Not in Workspace

```sql
SELECT u.id, u.email, u."displayName"
FROM "User" u
WHERE u.id NOT IN (
    SELECT wm."userId"
    FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = 'cmfnpx9bf0002c60bau4s7ogc'
)
AND u.email LIKE '%@test.com'
LIMIT 2;
```

### Step 2: Add Users via Batch API

```bash
curl 'http://localhost:5000/api/workspaces/cmfnpx9bf0002c60bau4s7ogc/members/batch' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Accept-Language: zh-CN,zh;q=0.9' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -b 'accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NzUwNDA0ZC00ZTc5LTQ0OWUtOTk1MC1jZDY5NmIyY2RiNmUiLCJpYXQiOjE3NTgxNzk0NTIsImV4cCI6MTc1ODI2NTg1Mn0.kvLfE0TiO3SWwZATaqbYmGu3spGMpR7pZHX7Zozw3lE; refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NzUwNDA0ZC00ZTc5LTQ0OWUtOTk1MC1jZDY5NmIyY2RiNmUiLCJpYXQiOjE3NTgxNzk0NTIsImV4cCI6MTc1ODc4NDI1Mn0.Pu5yzLHxN1j-tQzAT4zZ1lU3-_xUkWOc2Dya71oXUZE' \
  -H 'Origin: http://localhost:5000' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-origin' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' \
  -H 'sec-ch-ua: "Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'x-request-id: 2e7e9af2-0c79-4f50-a8d1-5f9da229b752' \
  --data-raw '{"items":[{"userId":"USER_ID_1","role":"MEMBER"},{"userId":"USER_ID_2","role":"MEMBER"}]}'
```

**Note:** Replace `USER_ID_1` and `USER_ID_2` with the actual user IDs from Step 1.

### Step 3: Verify Database Changes

```sql
SELECT wm."userId", u.email, u."displayName", wm.role
FROM "WorkspaceMember" wm
JOIN "User" u ON wm."userId" = u.id
WHERE wm."workspaceId" = 'cmfnpx9bf0002c60bau4s7ogc'
ORDER BY wm."createdAt" DESC
LIMIT 5;
```

## Expected Results

### API Response

```json
{
  "statusCode": 0,
  "message": "成功",
  "data": {
    "success": true,
    "addedCount": 2,
    "skippedCount": 0,
    "errors": [],
    "skipped": []
  }
}
```

### UI Behavior

- **Automatic Refresh**: Member list should update automatically within 500ms
- **Console Logs**: Look for these debug messages:
  - `[websocket]: Received event workspace.members.batch.added: ...`
  - `[websocket]: Refreshing workspace members for workspace ...`
  - `[workspace-store]: Refreshing members for workspace ...`
  - `[member-management]: Fetching members for workspace ...`

### Database Verification

- New users should appear in the `WorkspaceMember` table
- Users should have `role: "MEMBER"`
- `createdAt` timestamp should be recent

## Troubleshooting

### If UI Doesn't Refresh(listen to user feedback)

1. Check browser console for WebSocket connection errors
2. Verify WebSocket events are being received
3. Check if the global store is being updated
4. Ensure the MemberManagementPanel is using the global store selectors

### If API Fails

1. Check authentication token expiration
2. Verify workspace ID exists
3. Ensure user IDs are valid
4. Check API server logs for errors

## Test History

- **Batch 1**: `rachael@test.com`, `laurel@test.com`
- **Batch 2**: `henri@test.com`, `alexandrea@test.com`
- **Batch 3**: `minnie@test.com`, `constance@test.com`

## Quick Test Command

To run a complete test cycle:

1. Execute Step 1 SQL query
2. Copy the user IDs to the curl command
3. Execute the curl command
4. Execute Step 3 SQL query
5. Check UI for automatic refresh

## Notes

- This test validates the complete batch add members feature including:
  - API endpoint functionality
  - Database persistence
  - WebSocket real-time updates
  - Global store integration
  - UI automatic refresh
- The feature should work without manual page refresh
- Performance should be fast (< 1 second) due to commented out permission assignment
