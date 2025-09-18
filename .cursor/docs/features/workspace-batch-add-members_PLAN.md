# Workspace Batch Add Members Feature Plan

## Overview

Currently, the `add-workspace-member-modal.tsx` adds workspace members one by one in a loop, which is inefficient and provides poor user experience. The `subspace-batch-settings.tsx` component already has a batch API pattern for subspaces. This feature will implement a similar batch add members API for workspace members to improve performance and user experience.

## Current Implementation Analysis

### Current Workspace Member Addition Flow

1. **Frontend**: `add-workspace-member-modal.tsx` loops through selected users and calls `workspaceApi.addWorkspaceMember()` for each user individually
2. **API**: Single endpoint `POST /api/workspaces/:id/members` that adds one member at a time
3. **Backend**: `WorkspaceService.addWorkspaceMember()` handles individual member addition with complex logic including:
   - Workspace validation
   - Duplicate member checking
   - User existence validation
   - Permission assignment
   - Workspace-wide subspace invitation
   - Personal subspace creation

### Existing Batch Pattern (Subspace)

- **API**: `POST /api/subspaces/:id/members/batch` with `BatchAddSubspaceMemberRequest`
- **Contracts**: `BatchAddSubspaceMemberRequestSchema` and `BatchAddSubspaceMemberResponseSchema` in `packages/contracts/src/subspace.ts`
- **Response**: Includes success count, skipped count, and detailed error information

## Technical Implementation Plan

### Phase 1: Data Layer - Contracts and DTOs

#### 1.1 Add Batch Workspace Member Contracts

**File**: `packages/contracts/src/workspace.ts`

Add new schemas following the existing subspace batch pattern:

```typescript
// Batch add workspace members request
export const BatchAddWorkspaceMemberRequestSchema = z.object({
  items: z.array(
    z.object({
      userId: z.string(),
      role: WorkspaceRoleSchema.default(WorkspaceRoleSchema.enum.MEMBER),
    })
  ),
});
export type BatchAddWorkspaceMemberRequest = z.infer<
  typeof BatchAddWorkspaceMemberRequestSchema
>;

// Batch add workspace members response
export const BatchAddWorkspaceMemberResponseSchema = z.object({
  success: z.boolean(),
  addedCount: z.number(),
  skippedCount: z.number(),
  errors: z.array(
    z.object({
      userId: z.string(),
      error: z.string(),
    })
  ),
  skipped: z.array(
    z.object({
      userId: z.string(),
      reason: z.string(),
    })
  ),
});
export type BatchAddWorkspaceMemberResponse = z.infer<
  typeof BatchAddWorkspaceMemberResponseSchema
>;
```

### Phase 2A: Backend API Implementation

#### 2A.1 Add Workspace Member Batch Events to Business Events

**File**: `apps/api/src/_shared/socket/business-event.constant.ts`

Add new workspace member batch events:

```typescript
export enum BusinessEvents {
  // ... existing events ...

  // Workspace events
  WORKSPACE_MEMBER_ADDED = "workspace.member.added",
  WORKSPACE_MEMBERS_BATCH_ADDED = "workspace.members.batch.added",

  // ... rest of events ...
}
```

#### 2A.2 Add Batch Endpoint to Workspace Controller

**File**: `apps/api/src/workspace/workspace.controller.ts`

Add new endpoint after the existing `addWorkspaceMember` method:

```typescript
@Post(":id/members/batch")
// @CheckPolicy(Action.ManageMembers, "Workspace")
async batchAddWorkspaceMembers(
  @Param("id") workspaceId: string,
  @Body() dto: BatchAddWorkspaceMemberRequest,
  @GetUser("id") adminId: string
) {
  return this.workspaceService.batchAddWorkspaceMembers(workspaceId, dto, adminId);
}
```

#### 2A.3 Implement Batch Service Method

**File**: `apps/api/src/workspace/workspace.service.ts`

Add new method `batchAddWorkspaceMembers` that:

1. Validates workspace exists (once)
2. Processes each user in the batch:
   - Validates user exists
   - Checks for duplicate membership
   - Creates workspace membership
   - Assigns permissions
   - Invites to workspace-wide subspaces
   - Creates personal subspace
3. Collects results and errors
4. **Publishes WebSocket events for real-time updates**
5. Returns batch response with success/skip/error counts

**Algorithm**:

```
1. Validate workspace exists
2. Initialize result counters (addedCount, skippedCount, errors, skipped, addedMembers)
3. For each item in batch:
   a. Try to add member using existing addWorkspaceMember logic
   b. If success: increment addedCount, add member to addedMembers array
   c. If user already exists: increment skippedCount, add to skipped array
   d. If other error: add to errors array
4. Publish WebSocket batch event with addedMembers data
5. Return batch response
```

#### 2A.4 Add WebSocket Event Handler

**File**: `apps/api/src/_shared/queues/processors/websocket-event.processor.ts`

Add new event handler for workspace member batch addition:

```typescript
// Add to the switch statement in process() method
case BusinessEvents.WORKSPACE_MEMBERS_BATCH_ADDED:
  await this.handleWorkspaceMembersBatchAddedEvent(event, server);
  break;

// Add new handler method
private async handleWorkspaceMembersBatchAddedEvent(event: WebsocketEvent<any>, server: any) {
  const { data, workspaceId } = event;
  const { addedMembers, totalAdded } = data;

  // Notify each added user individually about their workspace addition
  for (const memberInfo of addedMembers) {
    server.to(`user:${memberInfo.userId}`).emit(BusinessEvents.WORKSPACE_MEMBER_ADDED, {
      workspaceId,
      member: memberInfo.member,
      memberAdded: true,
    });

    // Tell the added user to join the workspace room
    server.to(`user:${memberInfo.userId}`).emit(BusinessEvents.JOIN, {
      event: BusinessEvents.WORKSPACE_MEMBERS_BATCH_ADDED,
      workspaceId,
    });
  }

  // Send single batch notification to workspace members to avoid multiple refreshes
  server.to(`workspace:${workspaceId}`).emit(BusinessEvents.WORKSPACE_MEMBERS_BATCH_ADDED, {
    workspaceId,
    totalAdded,
    membersBatchAdded: true,
  });
}
```

### Phase 2B: Frontend API Client

#### 2B.1 Add Batch API Method

**File**: `apps/client/src/apis/workspace.ts`

Add new method to `workspaceApi`:

```typescript
batchAddWorkspaceMembers: async (workspaceId: string, data: BatchAddWorkspaceMemberRequest) =>
  request.post<BatchAddWorkspaceMemberRequest, BatchAddWorkspaceMemberResponse>(`/api/workspaces/${workspaceId}/members/batch`, data),
```

#### 2B.2 Update Workspace Store

**File**: `apps/client/src/stores/workspace.ts`

Add new method to handle batch member addition:

```typescript
batchAddWorkspaceMembers: async (workspaceId: string, members: Array<{userId: string, role: WorkspaceRole}>) => Promise<BatchAddWorkspaceMemberResponse>
```

### Phase 2C: Frontend WebSocket Integration

#### 2C.1 Add Workspace Member Events to WebSocket Service

**File**: `apps/client/src/lib/websocket.ts`

Add new workspace member events to the `SocketEvents` enum:

```typescript
enum SocketEvents {
  // ... existing events ...

  // Workspace events
  WORKSPACE_MEMBER_ADDED = "workspace.member.added",
  WORKSPACE_MEMBERS_BATCH_ADDED = "workspace.members.batch.added",

  // ... rest of events ...
}
```

Add event handlers in the `setupBusinessEvents()` method:

```typescript
// Handle workspace member added events
this.socket.on(
  SocketEvents.WORKSPACE_MEMBER_ADDED,
  (message: GatewayMessage) => {
    console.log(
      `[websocket]: Received event ${SocketEvents.WORKSPACE_MEMBER_ADDED}:`,
      message
    );
    const { workspaceId, member, memberAdded } = message;
    if (!workspaceId) return;

    const workspaceStore = useWorkspaceStore.getState();
    const userInfo = useUserStore.getState().userInfo;

    // If the current user was added to the workspace
    if (member?.userId === userInfo?.id) {
      // Refresh user's workspace list to include the new workspace
      workspaceStore.fetchList();

      // Join the workspace room for real-time updates
      if (this.socket) {
        this.joinRoom(`workspace:${workspaceId}`);
      }

      // Show notification
      toast.success(`You've been added to a workspace`);
    } else {
      // Another user was added, refresh workspace member list
      this.debouncedRefreshWorkspaceMembers(workspaceId);
    }
  }
);

// Handle workspace members batch added events
this.socket.on(
  SocketEvents.WORKSPACE_MEMBERS_BATCH_ADDED,
  (message: GatewayMessage) => {
    console.log(
      `[websocket]: Received event ${SocketEvents.WORKSPACE_MEMBERS_BATCH_ADDED}:`,
      message
    );
    const { workspaceId, totalAdded, membersBatchAdded } = message;
    if (!workspaceId) return;

    // Single refresh for batch operation instead of multiple individual refreshes
    if (membersBatchAdded) {
      // Refresh workspace member list once for the entire batch
      this.debouncedRefreshWorkspaceMembers(workspaceId);

      // Show single notification for batch operation
      // toast.success(`${totalAdded} members added to workspace`);
    }
  }
);
```

Add debounced refresh method for workspace members:

```typescript
private debouncedRefreshWorkspaceMembers = debounce((workspaceId: string) => {
  const workspaceStore = useWorkspaceStore.getState();
  workspaceStore.fetchWorkspaceMembers(workspaceId);
}, 500);
```

#### 2C.2 Update Add Workspace Member Modal

**File**: `apps/client/src/pages/main/settings/members/member-management/add-workspace-member-modal.tsx`

Replace the current loop-based implementation with batch API call:

**Current Implementation** (lines 96-149):

- Loops through `selectedUsers`
- Calls `workspaceApi.addWorkspaceMember()` for each user
- Manually tracks success/error counts
- Shows individual error messages

**New Implementation**:

- Convert `selectedUsers` to batch request format
- Call `workspaceApi.batchAddWorkspaceMembers()` once
- Handle batch response with success/skip/error counts
- Show appropriate success/error messages based on batch results
- **Remove manual refresh logic** - WebSocket events will handle real-time updates

**Key Changes**:

1. Replace the `useRequest` implementation to use batch API
2. Convert selected users to batch format: `{userId: string, role: WorkspaceRole}[]`
3. Handle batch response structure
4. Update success/error messaging to reflect batch results
5. **Remove `refreshMembers()` call** - WebSocket will handle member list updates

#### 2C.3 Update Member Management Page

**File**: `apps/client/src/pages/main/settings/members/member-management/index.tsx`

**Remove manual refresh logic** since WebSocket events will handle real-time updates:

```typescript
// Remove this manual refresh call
if (result?.success) {
  // refreshMembers(); // ❌ Remove this - WebSocket will handle updates
}
```

The page will automatically update when WebSocket events are received.

## Implementation Details

### Error Handling Strategy

- **Individual Errors**: Collect and report specific errors for each failed user
- **Partial Success**: Show success count and error details separately
- **Validation Errors**: Handle workspace not found, user not found, etc.
- **Duplicate Members**: Skip existing members and report in skipped array

### Performance Benefits

- **Single API Call**: Reduces network overhead from N calls to 1 call
- **Atomic Operation**: Better transaction handling on backend
- **Improved UX**: Faster response time and better progress indication
- **Consistent Pattern**: Aligns with existing subspace batch operations

### Backward Compatibility

- Keep existing single member addition API intact
- New batch API is additive, doesn't break existing functionality
- Frontend can gradually migrate to batch API

## Files to Modify

### New Files

- None (all changes are additions to existing files)

### Modified Files

1. `packages/contracts/src/workspace.ts` - Add batch request/response schemas
2. `apps/api/src/_shared/socket/business-event.constant.ts` - Add workspace member batch events
3. `apps/api/src/workspace/workspace.controller.ts` - Add batch endpoint
4. `apps/api/src/workspace/workspace.service.ts` - Add batch service method with WebSocket events
5. `apps/api/src/_shared/queues/processors/websocket-event.processor.ts` - Add WebSocket event handler
6. `apps/client/src/apis/workspace.ts` - Add batch API client method
7. `apps/client/src/stores/workspace.ts` - Add batch store method
8. `apps/client/src/lib/websocket.ts` - Add workspace member WebSocket event handlers
9. `apps/client/src/pages/main/settings/members/member-management/add-workspace-member-modal.tsx` - Replace loop with batch call
10. `apps/client/src/pages/main/settings/members/member-management/index.tsx` - Remove manual refresh logic

## Testing Considerations

### Backend Testing

- Test batch addition with valid users
- Test with duplicate users (should skip)
- Test with non-existent users (should error)
- Test with mixed valid/invalid users
- Test workspace validation
- Test permission assignment for all added members
- **Test WebSocket event publishing** - verify events are sent to correct rooms
- **Test WebSocket event handler** - verify event processing and room joining

### Frontend Testing

- Test batch addition UI flow
- Test error handling and messaging
- Test success feedback
- **Test WebSocket event handling** - verify member list updates automatically
- **Test real-time updates** - verify other users see new members immediately
- **Test room joining** - verify added users join workspace rooms
- Test with various user selection scenarios
- **Test debounced refresh** - verify multiple rapid events don't cause excessive API calls

## Success Criteria

1. **Performance**: Single API call instead of multiple sequential calls
2. **User Experience**: Faster member addition with clear feedback
3. **Error Handling**: Detailed error reporting for failed additions
4. **Consistency**: Aligns with existing subspace batch operations pattern
5. **Reliability**: Proper transaction handling and rollback on failures
6. **Real-time Updates**: WebSocket events provide immediate UI updates across all connected clients
7. **Room Management**: Added users automatically join workspace rooms for real-time collaboration
8. **Efficient Refresh**: Debounced WebSocket events prevent excessive API calls
