# Simplified Authenticated-Aware Public Share Button

## Date: 2025-10-12

## Participants: Xiaoyao Chen, Claude

## Status: ✅ IMPLEMENTED

---

## Overview

Simplify the differentiated headers feature to just modify the existing button in the PublicSidebar footer. The button will be context-aware based on authentication state and workspace membership.

## Design Decision

**Simplification from original plan**: Instead of creating complex header components with dropdowns, we'll reuse the existing sidebar footer button and make it smart enough to handle all scenarios.

---

## Three Scenarios

### Scenario 1: Unauthenticated User
**Current State**: No authentication token

**Button Display**: "Sign in to edit"

**Behavior**:
1. Click button
2. Navigate to `/login?redirect=/share/:token`
3. After successful login, user returns to share page (handled by existing login redirect logic)

---

### Scenario 2: Authenticated User - Has Workspace Access

Split into two sub-cases:

#### 2a. Same Workspace
**Current State**: User is authenticated AND current workspace ID === document workspace ID

**Button Display**: "Open in Workspace"

**Behavior**:
1. Click button
2. Direct navigate to `/workspace/:workspaceId/doc/:docId`
3. User sees full workspace view with edit capabilities

#### 2b. Different Workspace
**Current State**: User is authenticated AND has access BUT current workspace ID ≠ document workspace ID

**Button Display**: "Switch & Open in Workspace"

**Behavior**:
1. Click button
2. Call `switchWorkspace(docWorkspaceId)` (existing hook)
3. Navigate to `/workspace/:docWorkspaceId/doc/:docId`
4. Full page reload happens (existing behavior)

---

### Scenario 3: Authenticated User - No Access
**Current State**: User is authenticated BUT has no permission to document workspace

**Button Display**: "Request Access"

**Behavior**:
1. Click button
2. Show toast: "Contact workspace administrator to request access"
3. (MVP approach - no actual request flow yet)

---

## Implementation Plan

### Phase 1: Update Contracts (1 file)

**File**: `packages/contracts/src/public-share.ts`

**Changes**:
```typescript
export interface PublicDocumentResponse {
  share: {
    id: string;
    permission: string;
    viewCount: number;
  };
  doc: {
    id: string;
    title: string;
    content: string;
    icon: string | null;
    coverImage?: any;
    workspace: {
      id: string;
      name: string;
      avatar: string | null;
    };
  };
  navigationTree: NavigationTreeNode;

  // NEW FIELDS
  userPermission?: {
    level: PermissionLevel;
    workspaceId: string;
  } | null;
  userWorkspaceAccess?: boolean;
}
```

---

### Phase 2: Backend Changes (1 file)

**File**: `apps/api/src/public-share/public-share.service.ts`

#### Change 1: Modify `getPublicDocument()` method

**Location**: After line 404 (after `trackView()` call)

**Add**:
```typescript
// Check if user is authenticated and resolve their permission
let userPermission = null;
let userWorkspaceAccess = null;

// Check if request has authenticated user
if (request.user?.id) {
  try {
    const doc = {
      id: share.doc.id,
      parentId: share.doc.parentId,
      subspaceId: share.doc.subspaceId,
      workspaceId: share.doc.workspaceId,
    };

    const permissionResult = await this.docPermissionService.resolveUserPermissionForDocument(
      request.user.id,
      doc
    );

    userPermission = {
      level: permissionResult.level,
      workspaceId: share.doc.workspaceId,
    };
    userWorkspaceAccess = true;
  } catch (error) {
    // User has no access to this document
    userWorkspaceAccess = false;
  }
}
```

**Modify return statement** (around line 410-429):
```typescript
return {
  share: {
    id: share.id,
    permission: share.permission,
    viewCount: share.views,
  },
  doc: {
    id: share.doc.id,
    title: share.doc.title,
    content: share.doc.content,
    icon: share.doc.icon,
    coverImage: share.doc.coverImage,
    workspace: {
      id: share.workspace.id,
      name: share.workspace.name,
      avatar: share.workspace.avatar,
    },
  },
  navigationTree,
  // NEW FIELDS
  userPermission,
  userWorkspaceAccess,
};
```

#### Change 2: Modify `getPublicNestedDocument()` method

**Location**: After line 488 (after `trackView()` call)

**Add the same user permission check logic** and modify the return statement similarly.

---

### Phase 3: Frontend Changes (2 files)

#### File 1: `apps/client/src/pages/public-document/index.tsx`

**Import additions**:
```typescript
import useUserStore from "@/stores/user-store";
import { useCurrentWorkspace } from "@/stores/workspace-store";
```

**After line 128** (after `const { doc, navigationTree, share } = data;`):
```typescript
// Get current user and workspace for context-aware button
const userInfo = useUserStore((state) => state.userInfo);
const currentWorkspace = useCurrentWorkspace();
```

**Update PublicSidebar component call** (around line 134):
```typescript
<PublicSidebar
  navigationTree={navigationTree}
  token={token!}
  activeDocId={docId || navigationTree.id}
  workspaceName={doc.workspace.name}
  // NEW PROPS
  currentUser={userInfo}
  docWorkspaceId={doc.workspace.id}
  docId={doc.id}
  userWorkspaceAccess={data.userWorkspaceAccess}
  currentWorkspaceId={currentWorkspace?.id}
/>
```

#### File 2: `apps/client/src/pages/public-document/components/public-sidebar.tsx`

**Update interface** (line 11):
```typescript
interface PublicSidebarProps {
  navigationTree: NavigationTreeNode;
  token: string;
  activeDocId?: string;
  workspaceName: string;
  // NEW PROPS
  currentUser?: any;
  docWorkspaceId: string;
  docId: string;
  userWorkspaceAccess?: boolean;
  currentWorkspaceId?: string;
}
```

**Import additions**:
```typescript
import { useNavigate } from "react-router-dom";
import { useSwitchWorkspace } from "@/stores/workspace-store";
import { toast } from "sonner";
```

**Update component function**:
```typescript
export function PublicSidebar({
  navigationTree,
  token,
  activeDocId,
  workspaceName,
  // NEW PARAMS
  currentUser,
  docWorkspaceId,
  docId,
  userWorkspaceAccess,
  currentWorkspaceId,
}: PublicSidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { run: switchWorkspace } = useSwitchWorkspace();

  // Determine current state
  const isAuthenticated = !!currentUser;
  const isSameWorkspace = currentWorkspaceId === docWorkspaceId;

  // Smart button click handler
  const handleButtonClick = async () => {
    // Scenario 1: Unauthenticated
    if (!isAuthenticated) {
      navigate(`/login?redirect=/share/${token}`);
      return;
    }

    // Scenario 3: Authenticated but no access
    if (!userWorkspaceAccess) {
      toast.info(t("Contact workspace administrator to request access"));
      return;
    }

    // Scenario 2: Authenticated with access
    if (isSameWorkspace) {
      // 2a: Same workspace - direct navigate
      navigate(`/workspace/${docWorkspaceId}/doc/${docId}`);
    } else {
      // 2b: Different workspace - switch then navigate
      try {
        await switchWorkspace(docWorkspaceId);
        navigate(`/workspace/${docWorkspaceId}/doc/${docId}`);
      } catch (error) {
        toast.error(t("Failed to switch workspace"));
      }
    }
  };

  // Smart button text
  const getButtonText = () => {
    if (!isAuthenticated) return t("Sign in to edit");
    if (!userWorkspaceAccess) return t("Request Access");
    if (isSameWorkspace) return t("Open in Workspace");
    return t("Switch & Open in Workspace");
  };

  return (
    <Sidebar collapsible="offcanvas" className="border-r">
      {/* Header */}
      <SidebarHeader className="p-2 justify-center h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Logo />
      </SidebarHeader>

      {/* Navigation Tree */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <PublicLink node={navigationTree} token={token} activeDocId={activeDocId} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer - Smart button */}
      <SidebarFooter className="p-0 gap-0">
        {/* Show alert only for unauthenticated users */}
        {!isAuthenticated && (
          <div className="p-4">
            <Alert>
              <AlertDescription className="text-sm">
                {t(
                  "You are viewing a publicly shared document. To edit this document or access the full workspace, please sign in and request access from the workspace administrator.",
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="p-4 border-t">
          <Button size="sm" className="w-full" onClick={handleButtonClick}>
            {getButtonText()}
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
```

---

## Technical Advantages

### 1. **Minimal Changes**
- Only 3 files substantially changed
- Reuses existing infrastructure
- No new API endpoints
- No complex UI components

### 2. **Reuses Existing Logic**
- `docPermissionService.resolveUserPermissionForDocument()` - already handles all permission scenarios
- `useSwitchWorkspace()` - already handles workspace switching
- Login redirect logic - already handles return URL
- Authentication middleware - already populates `request.user`

### 3. **Type Safety**
- TypeScript interfaces ensure contract between backend and frontend
- Existing PermissionLevel enum used
- No new types needed

### 4. **Graceful Degradation**
- If backend doesn't return new fields, button falls back to "Sign in to edit"
- If user data not available, treated as unauthenticated
- If workspace switch fails, shows error toast

### 5. **Testable**
- Clear scenarios to test
- Each scenario has distinct button text
- Easy to write E2E tests

---

## Trade-offs and MVP Decisions

### 1. **Request Access** (Scenario 3)
**Current**: Just shows toast message
**Future Enhancement**: Could implement:
- Send email to workspace admins
- Create notification in-app
- Store access request in database
- Admin approval flow

**Decision**: MVP with toast is sufficient for launch

### 2. **Workspace Switching** (Scenario 2b)
**Current**: Full page reload after switch (existing behavior)
**Future Enhancement**: Could optimize to:
- Switch context without reload
- Refresh only necessary components
- Smoother transition

**Decision**: Existing behavior is acceptable for now

### 3. **Permission Checking** (Backend)
**Current**: Checks permission on every page load
**Future Enhancement**: Could optimize with:
- Client-side caching
- Redis caching on backend
- Optimistic UI updates

**Decision**: Performance is acceptable for MVP, optimize if needed

### 4. **Alert Message** (Footer)
**Current**: Only shows for unauthenticated users
**Alternative**: Could show different messages for each scenario
**Decision**: Cleaner UI to only show for unauthenticated

---

## Testing Plan

### Manual Testing Scenarios

#### Test 1: Unauthenticated User
1. Open `/share/:token` in incognito
2. Verify button shows "Sign in to edit"
3. Click button
4. Verify redirected to `/login?redirect=/share/:token`
5. Login successfully
6. Verify redirected back to share page
7. Verify button text changed

#### Test 2a: Same Workspace Access
1. Login as workspace member
2. Open `/share/:token` for document in current workspace
3. Verify button shows "Open in Workspace"
4. Click button
5. Verify navigated to `/workspace/:id/doc/:docId`
6. Verify can edit document

#### Test 2b: Different Workspace Access
1. Login as user with multiple workspaces
2. Open `/share/:token` for document in different workspace
3. Verify button shows "Switch & Open in Workspace"
4. Click button
5. Verify workspace switched
6. Verify navigated to document
7. Verify can edit document

#### Test 3: No Access
1. Login as user with no access to document workspace
2. Open `/share/:token`
3. Verify button shows "Request Access"
4. Click button
5. Verify toast shows "Contact workspace administrator..."
6. Verify stays on share page

### Edge Cases
- User's workspace deleted while viewing share
- Permission revoked while viewing share
- Token expires while viewing share
- Network error during workspace switch

---

## Security Considerations

1. **Permission Check**: Always on backend, never trust client
2. **Token Validation**: Existing validation remains unchanged
3. **User Authentication**: Uses existing JWT validation
4. **Workspace Isolation**: Uses existing workspace switching security
5. **No New Attack Surface**: Only extends existing endpoints

---

## Performance Considerations

1. **Additional DB Query**: One extra permission check per page load
2. **Impact**: Minimal - permission resolver already optimized
3. **Caching Opportunity**: Can be added later if needed
4. **No Impact on Unauthenticated**: No extra queries for anonymous users

---

## Files Modified Summary

### Backend
1. `apps/api/src/public-share/public-share.service.ts` (2 methods modified)

### Frontend
1. `apps/client/src/pages/public-document/index.tsx` (add props)
2. `apps/client/src/pages/public-document/components/public-sidebar.tsx` (smart button logic)

### Contracts
1. `packages/contracts/src/public-share.ts` (interface update)

**Total: 4 files**

---

## Estimated Implementation Time

- Contracts: 10 minutes
- Backend: 30 minutes
- Frontend: 45 minutes
- Testing: 30 minutes
- **Total: ~2 hours**

---

## Questions for Review

1. **Request Access MVP**: Is toast message sufficient or should we implement actual request flow now?
2. **Button Text**: Are the proposed button texts clear and action-oriented?
3. **Alert Message**: Should we show different alerts for authenticated users with/without access?
4. **Error Handling**: Should we show inline errors or continue with toasts?
5. **Loading States**: Should button show loading state during workspace switch?

---

## Implementation Summary (2025-10-12)

### Ultra-Simplified Approach
After review, we simplified even further to just 2 scenarios instead of the original complex plan.

### Files Modified

#### Frontend (2 files)
1. **`apps/client/src/pages/public-document/components/public-sidebar.tsx`** (~30 lines changed)
   - Added `docId` prop and `useUserStore` import
   - Uses `useUserStore` to check auth state: `const isAuthenticated = !!userInfo`
   - Smart button: "Login to Edit" vs "Go to Edit"
   - Navigates to `/:docId` directly
   - Alert only shows for unauthenticated users

2. **`apps/client/src/pages/public-document/index.tsx`** (~15 lines changed)
   - Passed `docId={doc.id}` prop to PublicSidebar
   - Added useEffect to hydrate userStore from `window._userInfo`
   - Enables auth detection on public pages

#### Backend (1 file)
3. **`apps/api/src/_shared/middlewares/fallback.middleware.ts`** (~20 lines changed)
   - Modified to inject `window._userInfo` on ALL pages if user has auth cookies (not just auth-required pages)
   - Added `shouldRedirectOnFailure` parameter to `getUserInfo()` method
   - Prevents redirect on public pages while still validating JWT
   - Enables client-side auth detection without exposing httpOnly cookies

### Total Changes
- **Files modified**: 3 (2 frontend, 1 backend)
- **Lines changed**: ~65
- **Backend changes**: 1 (middleware only, no API changes)
- **Contract changes**: 0
- **Time taken**: ~45 minutes (including httpOnly fix)
- **Type errors**: 0

### How It Works

#### Server-Side (SSR)
1. User visits `/share/:token`
2. Fallback middleware checks for auth cookies (`accessToken`/`refreshToken`)
3. If cookies exist, validates JWT and injects `window._userInfo` into HTML
4. Serves SPA with user data (if authenticated) or without (if not)

#### Client-Side
1. Public document page hydrates `useUserStore` from `window._userInfo`
2. Sidebar component checks `useUserStore` for auth state
3. Button shows different text/behavior:
   - **No userInfo**: "Login to Edit" → `/login?redirect=/:docId`
   - **Has userInfo**: "Go to Edit" → `/:docId`
4. Existing middleware lets authenticated users through to document
5. Existing `WithAuth` HOC validates JWT
6. Existing `Main` component handles all permissions/workspace logic

#### Why httpOnly Cookies Work
- JavaScript **cannot** read httpOnly cookies (security feature)
- But server **can** validate them and inject user data via SSR
- Client reads `window._userInfo` (not the cookie)
- Best of both worlds: secure cookies + client-side auth detection

### Next Steps
1. ✅ Review plan
2. ✅ Simplify to ultra-minimal approach
3. ✅ Implement frontend changes
4. ✅ Run typecheck verification
5. ⏳ Manual testing
6. ⏳ Update tasks.md with progress

---

## Notes

- This approach significantly simplifies the original differentiated headers plan
- Focuses on MVP functionality with clear upgrade path
- Maintains consistency with existing codebase patterns
- Low risk - mostly additive changes to existing code
