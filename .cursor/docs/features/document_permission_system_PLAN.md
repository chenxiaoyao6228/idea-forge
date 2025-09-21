# Complete Permission System Technical Plan

## Overview

This plan addresses the completion of the unified permission system to correctly derive document permissions based on the complex inheritance hierarchy. The system must handle edge cases like user removal from subspace with direct shares, subspace permission changes affecting documents, and proper parent-child permission inheritance.

## Current System Analysis

### Existing Components

- **UnifiedPermission Table**: Stores permissions with priority-based resolution (1-7)
- **Permission Service**: Handles basic permission resolution
- **Document API**: Currently uses placeholder permission resolution
- **Frontend**: Uses permission level from API but lacks proper derivation

### Major Gaps Identified

1. **Document API Missing Permission Resolution**: `findOne()` method uses placeholder logic instead of actual permission calculation
2. **Incomplete Subspace Permission Inheritance**: No system to propagate subspace permission changes to documents
3. **No Parent-Child Permission Inheritance**: Document tree permissions not implemented
4. **Missing Subspace Type Permission Handling**: Subspace-level permission settings not applied to documents
5. **Edge Case Handling**: No handling for scenarios like user removal with direct shares
6. **Guest Permission Integration**: Guest permissions not fully integrated into resolution
7. **Batch Permission Performance**: Inefficient individual permission resolution

## Technical Implementation

### Phase 1: Core Permission Resolution Enhancement

#### 1.1 Enhanced Document Permission Resolution Service

**File: `apps/api/src/permission/enhanced-permission.service.ts`**

- Create comprehensive document permission resolver
- Handle all inheritance levels: Direct → Group → Subspace → Workspace → Guest
- Implement batch resolution for performance
- Handle edge cases and conflicts

**Key Methods:**

```typescript
async resolveDocumentPermissionForUser(userId: string, docId: string): Promise<PermissionLevel>
async batchResolveDocumentPermissions(userId: string, docIds: string[]): Promise<Record<string, PermissionLevel>>
async resolveDocumentPermissionWithInheritance(userId: string, doc: DocumentWithContext): Promise<PermissionLevel>
```

#### 1.2 Subspace Permission Integration

**File: `apps/api/src/permission/subspace-permission.service.ts`**

- Apply subspace-level permission settings to document resolution
- Handle subspace type changes and their impact on document permissions
- Implement non-subspace member permission logic

**Key Methods:**

```typescript
async applySubspacePermissionsToDocument(userId: string, doc: DocumentContext): Promise<PermissionLevel>
async propagateSubspacePermissionChanges(subspaceId: string, changes: SubspacePermissionChanges): Promise<void>
async getEffectiveSubspacePermissionForUser(userId: string, subspaceId: string): Promise<PermissionLevel>
```

#### 1.3 Parent-Child Permission Inheritance

**File: `apps/api/src/permission/document-inheritance.service.ts`**

- Implement document tree permission inheritance
- Handle permission cascading from parent to child documents
- Manage permission conflicts in document hierarchies

**Key Methods:**

```typescript
async resolveDocumentTreePermissions(userId: string, rootDocId: string): Promise<Record<string, PermissionLevel>>
async propagateParentPermissionChanges(parentDocId: string, newPermission: PermissionLevel): Promise<void>
async getInheritedPermissionFromParent(userId: string, docId: string): Promise<PermissionLevel>
```

### Phase 2: API Integration and Performance

#### 2.1 Document API Enhancement

**File: `apps/api/src/document/document.service.ts`**

- Replace placeholder permission logic with actual resolution
- Integrate with enhanced permission service
- Add proper permission context to document responses

**Changes:**

- Update `findOne()` method to use real permission resolution
- Add permission context to document list endpoints
- Implement efficient batch permission resolution for document lists

#### 2.2 Permission Context Provider

**File: `apps/api/src/permission/permission-context.service.ts`**

- Provide centralized permission context for any resource
- Cache frequently accessed permissions
- Handle permission invalidation and updates

### Phase 3: Edge Case Handling

#### 3.1 User State Change Handlers

**File: `apps/api/src/permission/permission-event.service.ts`**

- Handle user removal from subspace while maintaining direct shares
- Manage workspace member role changes
- Process subspace member role changes

**Event Handlers:**

```typescript
async handleUserRemovedFromSubspace(userId: string, subspaceId: string): Promise<void>
async handleWorkspaceRoleChange(userId: string, workspaceId: string, oldRole: WorkspaceRole, newRole: WorkspaceRole): Promise<void>
async handleSubspaceTypeChange(subspaceId: string, oldType: SubspaceType, newType: SubspaceType): Promise<void>
```

#### 3.2 Permission Conflict Resolution

**File: `apps/api/src/permission/permission-conflict.service.ts`**

- Resolve conflicts between different permission sources
- Handle edge cases where permissions might conflict
- Ensure consistent permission behavior

### Phase 4: WebSocket Permission Broadcasting

#### 4.1 Permission Change Event System

**File: `apps/api/src/permission/permission-websocket.service.ts`**

- Broadcast permission changes to affected users in real-time
- Handle collaborative editing permission updates
- Manage user access revocation during active sessions

**Key Methods:**

```typescript
async broadcastPermissionChange(docId: string, userId: string, newPermission: PermissionLevel): Promise<void>
async revokeUserAccess(docId: string, userId: string): Promise<void>
async notifyPermissionUpdate(affectedUsers: string[], permissionUpdate: PermissionUpdateEvent): Promise<void>
```

#### 4.2 Collaboration Service Enhancement

**File: `apps/api/src/collaboration/collaboration.service.ts`**

- Integrate permission checks with Yjs collaboration
- Handle permission-based collaboration restrictions
- Manage user disconnection on permission revocation

**Key Features:**

- Real-time permission validation for collaborative operations
- Graceful handling of permission changes during active collaboration
- User notification system for permission updates

#### 4.3 WebSocket Permission Events

**Event Types:**

```typescript
interface PermissionUpdateEvent {
  type:
    | "PERMISSION_CHANGED"
    | "ACCESS_REVOKED"
    | "DOCUMENT_SHARED"
    | "SUBSPACE_PERMISSION_UPDATED";
  resourceId: string;
  resourceType: "DOCUMENT" | "SUBSPACE" | "WORKSPACE";
  userId: string;
  newPermission?: PermissionLevel;
  message?: string;
}
```

### Phase 5: Frontend Integration

#### 5.1 Enhanced Permission Hooks

**File: `apps/client/src/hooks/use-document-permission.ts`**

- Create specialized hook for document permission checking
- Integrate with existing ability system
- Provide real-time permission updates via WebSocket

#### 5.2 Permission Cache Management

**File: `apps/client/src/stores/permission-store.ts`**

- Cache resolved permissions to avoid repeated API calls
- Handle permission invalidation on user/subspace changes
- Provide optimistic permission updates
- Listen to WebSocket permission events for real-time updates

#### 5.3 Real-time Permission Updates

**File: `apps/client/src/hooks/use-permission-websocket.ts`**

- Listen for permission change events
- Update local permission state in real-time
- Handle access revocation notifications
- Redirect users when access is revoked

### Implementation Details

#### Enhanced Permission Resolution Algorithm

1. **Direct Document Permissions** (Priority 1-2)

   - Check DIRECT permissions on document
   - Check GROUP permissions on document

2. **Subspace-Based Permissions** (Priority 3-4)

   - Apply subspace role permissions (ADMIN/MEMBER)
   - Apply subspace-type-based permissions for non-members
   - Consider subspace permission settings (subspaceAdminPermission, subspaceMemberPermission, nonSubspaceMemberPermission)

3. **Workspace-Based Permissions** (Priority 5-6)

   - Apply workspace role permissions (OWNER/ADMIN/MEMBER)
   - Consider workspace-wide subspace implications

4. **Guest Permissions** (Priority 7)

   - Check guest collaborator permissions
   - Handle guest permission expiration

5. **Parent Document Inheritance**
   - If no direct permissions found, check parent document permissions
   - Apply inheritance rules based on parent permission level

#### Subspace Permission Settings Integration

```typescript
// New field handling in document permission resolution
interface SubspacePermissionContext {
  subspaceAdminPermission: PermissionLevel;
  subspaceMemberPermission: PermissionLevel;
  nonSubspaceMemberPermission: PermissionLevel;
  userSubspaceRole: SubspaceRole | null;
  isWorkspaceMember: boolean;
}
```

#### Edge Case Handling

1. **User Removed from Subspace with Direct Share**

   - Maintain direct document permissions
   - Remove subspace-based permissions
   - Ensure direct share permissions take precedence

2. **Subspace Admin Changes Permission Settings**

   - Trigger permission recalculation for all subspace documents
   - Update cached permissions
   - Notify affected users of permission changes

3. **Document Moved Between Subspaces**
   - Recalculate permissions based on new subspace context
   - Handle permission conflicts
   - Maintain direct permissions where possible

#### Performance Optimizations

1. **Batch Permission Resolution**

   - Resolve multiple document permissions in single database query
   - Cache common permission patterns
   - Use database indexes for efficient permission lookup

2. **Permission Caching Strategy**

   - Cache resolved permissions with TTL
   - Invalidate cache on permission changes
   - Use Redis for distributed permission caching

3. **Database Query Optimization**

   - Optimize UnifiedPermission queries with proper indexes
   - Use JOIN queries for batch resolution
   - Implement permission materialized views for complex cases

4. **WebSocket Performance**
   - Efficient user room management for targeted broadcasts
   - Debounced permission updates to avoid spam
   - Connection pooling for permission broadcasts

#### WebSocket Integration Details

1. **Real-time Permission Broadcasting**

   - When permissions change, notify all affected users immediately
   - Handle collaborative editing scenarios where users lose access mid-session
   - Provide graceful degradation when WebSocket connection fails

2. **Collaboration Permission Checks**

   - Validate permissions before allowing Yjs operations
   - Handle permission changes during active collaboration sessions
   - Maintain consistent collaborative state across permission changes

3. **User Experience Considerations**
   - Show notification when permissions change
   - Gracefully handle access revocation (save work, redirect)
   - Provide clear feedback on permission restrictions

**WebSocket Event Flow:**

```typescript
// Admin shares document with user
1. Admin calls shareDocument API
2. Permission created in database
3. WebSocket broadcast to target user: DOCUMENT_SHARED
4. User receives real-time notification
5. User's permission cache updated automatically

// Admin revokes access during collaboration
1. Admin removes user permission
2. Permission deleted from database
3. WebSocket broadcast to affected user: ACCESS_REVOKED
4. User's collaborative session gracefully terminated
5. User redirected with notification
```

### Files to Create

1. `apps/api/src/permission/enhanced-permission.service.ts`
2. `apps/api/src/permission/subspace-permission.service.ts`
3. `apps/api/src/permission/document-inheritance.service.ts`
4. `apps/api/src/permission/permission-context.service.ts`
5. `apps/api/src/permission/permission-event.service.ts`
6. `apps/api/src/permission/permission-conflict.service.ts`
7. `apps/api/src/permission/permission-websocket.service.ts`
8. `apps/client/src/hooks/use-document-permission.ts`
9. `apps/client/src/hooks/use-permission-websocket.ts`
10. `apps/client/src/stores/permission-store.ts`

### Files to Modify

1. `apps/api/src/permission/permission.service.ts` - Enhance existing methods
2. `apps/api/src/document/document.service.ts` - Replace placeholder logic
3. `apps/api/src/subspace/subspace.service.ts` - Add permission propagation
4. `apps/api/src/collaboration/collaboration.service.ts` - Add permission-based collaboration controls
5. `apps/client/src/pages/doc/index.tsx` - Use enhanced permission resolution
6. `apps/client/src/hooks/use-current-document.ts` - Integrate permission context
7. `apps/api/src/document/document.controller.ts` - Add permission middleware
8. `apps/client/src/editor/hooks/useCollaborationProvider.ts` - Integrate WebSocket permission updates

### Database Migrations Required

1. Add indexes for performance optimization on UnifiedPermission table
2. Add permission inheritance tracking fields if needed
3. Add permission cache invalidation triggers

### Testing Requirements

1. Unit tests for all permission resolution scenarios
2. Integration tests for edge cases
3. Performance tests for batch permission resolution
4. End-to-end tests for permission UI updates

This implementation ensures complete permission resolution with proper inheritance, edge case handling, and performance optimization while maintaining the existing unified permission architecture.
