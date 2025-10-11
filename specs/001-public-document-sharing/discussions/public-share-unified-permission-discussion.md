# Public Share Unified permission: Architectural Decisions

**Date**: 2025-10-11 (Updated)
**Authors**: AI Assistant & Development Team
**Status**: ✅ DECISIONS MADE
**Purpose**: Document architectural decisions for public document sharing

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Final Architectural Decisions](#final-architectural-decisions)
3. [Analysis: Current Implementation](#analysis-current-implementation)
4. [Analysis: Unified Permission Approach](#analysis-unified-permission-approach)
5. [Component Reuse Analysis](#component-reuse-analysis)
6. [Algorithm Sharing Strategy](#algorithm-sharing-strategy)
7. [Implementation Plan](#implementation-plan)
8. [Future Considerations](#future-considerations)

---

## Executive Summary

After thorough analysis of both the standalone and unified permission approaches, the following architectural decisions have been made:

1. **Standalone Permission System** - Public share functionality will remain completely separate from the authenticated permission system to avoid tight coupling with user authorization
2. **Algorithm Sharing Over Component Reuse** - Tree navigation algorithms will be extracted and shared, but UI components will remain specialized for public vs authenticated experiences
3. **Clear Security Boundaries** - Anonymous public viewers cannot collaborate directly; they must sign up and become authenticated users (guests or members) to access collaborative features

These decisions prioritize **simplicity, security, and maintainability** while avoiding unnecessary complexity in the permission system.

---

## Final Architectural Decisions

### Decision 1: Standalone Permission System ✅

**We will keep the current standalone implementation** for public document sharing, separate from the unified permission system.

**Rationale:**

- The unified permission system requires user authorization (userId) which doesn't exist for anonymous viewers
- Mixing anonymous and authenticated permission logic increases security risks
- Standalone system is simpler to understand, test, and maintain
- Performance is better with direct token lookup vs permission resolution chain

**Implementation:**

- Keep `PublicShareService` with its own permission logic
- Maintain separate API endpoints (`/api/public/*`)
- Continue using direct token validation
- No `DocumentPermission` records for public shares

### Decision 2: Share Algorithms, Not Components ✅

**We will extract and share tree-building algorithms** while keeping UI components separate for public and authenticated experiences.

**Rationale:**

- Authenticated components (Sidebar, DocumentLink) are tightly coupled to user stores and WebSocket connections
- Public UX needs are fundamentally different (no workspace context, no collaboration)
- Sharing algorithms provides consistency without coupling
- Allows for optimized, purpose-built UI for each use case

**Implementation:**

- Extract tree traversal utilities from `SharedWithMe` component
- Create shared functions: `buildDocumentTree()`, `isDescendantOf()`, `expandTreeToNode()`
- Build new `PublicDocumentTree` component using these utilities
- Keep `ReadOnlyEditor` for public document viewing

### Decision 3: Clear Security Boundaries ✅

**Anonymous users must sign up to become authenticated users** before accessing any collaborative features.

**Rationale:**

- Prevents complexity of managing anonymous collaboration
- Maintains clear security boundaries in the system
- Avoids permission system complications
- Follows established pattern: anonymous → sign up → guest/member

**Implementation:**

- No comments or editing for anonymous viewers
- Future `allowComments`/`allowEdit` features will require sign-up
- Clear CTAs to encourage sign-up for collaboration
- No WebSocket connections for public viewers

---

## Analysis: Current Implementation

> **Note**: This section documents our analysis of the current implementation to understand its strengths and weaknesses.

### What We Have Now

```
PublicShare Table → Direct API Calls → Custom Public Page → ReadOnlyEditor
```

**Structure:**

- `PublicShare` table with all metadata (token, expiration, views)
- `PublicShareService` with standalone logic
- Custom public document page (`/pages/public-document/index.tsx`)
- `ReadOnlyEditor` component (TipTap in read-only mode)
- Flat children list (not tree navigation)

### Strengths ✅

- **Isolation**: Public access completely separate from authenticated system
- **Simplicity**: Easy to understand, test, and debug
- **Performance**: Direct token lookup, no permission resolution overhead
- **Custom UX**: Tailored public experience with minimal UI

### Weaknesses ❌

- **Code Duplication**: Separate `getPublicChildren()`, `isDescendantOf()` methods
- **No Tree Navigation**: Flat list instead of hierarchical navigation
- **Limited Extensibility**: Hard to add COMMENT/EDIT permissions
- **Inconsistent Patterns**: Different from Guest Collaborators

---

## Analysis: Unified Permission Approach

> **⚠️ Note**: This approach was thoroughly analyzed but ultimately **REJECTED** in favor of keeping the standalone system. This analysis is preserved to document why we made this decision.

### Proposed Architecture

```
PublicShare Table (metadata) + DocumentPermission Records → Unified Resolution → Reused Components
```

**Key Changes:**

1. Keep `PublicShare` for metadata (token, views, expiration)
2. Create `DocumentPermission` records with `inheritedFromType: PUBLIC_SHARE`
3. Reuse permission resolution for inheritance
4. Potentially reuse UI components

### Strengths ✅

- **Consistency**: Same patterns as Guest Collaborators
- **Automatic Inheritance**: Child documents "just work"
- **Tree Navigation**: Can reuse existing navigation components
- **Future-Proof**: Easy to add COMMENT/EDIT permissions
- **Code Reuse**: Less duplication, single source of truth

### Weaknesses ❌

- **Complexity**: More moving parts, harder to debug
- **Performance**: Permission resolution overhead for anonymous users
- **Risk**: Touching core permission system
- **UX Coupling**: Public UX tied to authenticated patterns

---

## Component Reuse Analysis

### 1. Sidebar/Navigation Reuse

#### Current Sidebar Structure (`/pages/main/sidebar/index.tsx`)

```typescript
<SidebarContainer>
  <WorkspaceSwitcher /> // ❌ Not needed for public
  <QuickActions /> // ❌ Not needed for public
  <StarsArea /> // ❌ Not needed for public
  <SubspacesArea /> // ❌ Not needed for public
  <SharedWithMe /> // ✅ Similar pattern!
  <MyDocsArea /> // ❌ Not needed for public
</SidebarContainer>
```

**Guest Collaborator Simplified View:**

```typescript
if (isGuestCollaborator) {
  return (
    <>
      <SharedWithMe /> // Primary navigation
      <MyDocsArea /> // Their personal docs
    </>
  );
}
```

**Potential Public Share View:**

```typescript
if (isPublicViewer) {
  return (
    <>
      <PublicDocumentTree /> // Single tree from shared root // No workspace
      switcher // No quick actions // No personal areas
    </>
  );
}
```

#### SharedWithMe Component Analysis (`/sidebar/shared-with-me.tsx`)

- ✅ **Collapsible tree structure** - Good for navigation
- ✅ **Lazy loading** - Load children on expand
- ✅ **Clean UI** - Minimal, focused on documents
- ❌ **Authentication required** - Uses userInfo, stores
- ❌ **Multiple roots** - Shows all shared docs, not single tree

**Verdict**: Could create `PublicDocumentTree` component inspired by `SharedWithMe` but simpler

### 2. Document Page Reuse (`/pages/doc/index.tsx`)

#### Current Doc Page Structure

```typescript
function Doc() {
  // Authentication checks
  const collabToken = useUserStore((s) => s.userInfo?.collabToken);

  // Permission checks (CASL abilities)
  const { can: canReadDoc } = useAbilityCan("Doc", Action.Read);
  const { can: canUpdateDoc } = useAbilityCan("Doc", Action.Update);

  // Components
  <DocumentHeader />        // Workspace-aware header
  <Cover />                // Editable cover
  <Toolbar />              // Edit tools
  <TiptapEditor            // Collaborative editor
    editable={canUpdateDoc}
    collabToken={collabToken}
    collabWsUrl={...}
  />
  <TableOfContent />       // Document outline
}
```

**Problems with Direct Reuse:**

- 🔴 **Authentication Required**: Uses `collabToken`, user stores
- 🔴 **Permission System**: CASL abilities need authenticated user
- 🔴 **Collaborative Features**: WebSocket, real-time sync
- 🔴 **Edit UI**: Toolbar, cover editing, etc.

**Verdict**: Too tightly coupled to authenticated experience. Better to keep separate.

### 3. Editor Component Analysis

#### Current Setup

- **Authenticated**: `TiptapEditor` with collaboration (`/editor/index.tsx`)
- **Public**: `ReadOnlyEditor` without collaboration (`/editor/read-only-editor.tsx`)

```typescript
// ReadOnlyEditor - What we have
<ReadOnlyEditor
  content={doc.content}
  className="prose"
/>

// TiptapEditor - Full featured
<TiptapEditor
  id={documentId}
  editable={canUpdateDoc}     // Could be false for read-only
  collabToken={collabToken}   // Required for Yjs sync
  collabWsUrl={wsUrl}         // WebSocket connection
/>
```

**Analysis:**

- ✅ `ReadOnlyEditor` is **perfect for public viewing** - lightweight, secure
- ❌ `TiptapEditor` with `editable=false` still requires auth/collab infrastructure
- ❓ Future: If we add public COMMENT/EDIT, need different approach

**Verdict**: Keep using `ReadOnlyEditor` for public documents

---

## Guest Collaborator vs Public Share Comparison

### Architectural Patterns

| Aspect                 | Guest Collaborator                      | Public Share (Current) | Public Share (Proposed)      |
| ---------------------- | --------------------------------------- | ---------------------- | ---------------------------- |
| **Metadata Storage**   | `GuestCollaborator` table               | `PublicShare` table    | `PublicShare` table          |
| **Permission Storage** | `DocumentPermission` records            | None                   | `DocumentPermission` records |
| **Permission Type**    | `DIRECT` (linked) or `GUEST` (unlinked) | N/A                    | `PUBLIC_SHARE`               |
| **Inheritance**        | ✅ Yes (linked guests)                  | ❌ No                  | ✅ Yes                       |
| **Navigation**         | "Shared with me" tree                   | Flat children list     | Tree navigation              |
| **UI Components**      | Reuses authenticated UI                 | Custom public page     | Hybrid approach              |
| **Authentication**     | Optional (unlinked → linked)            | Never                  | Never                        |

### Key Insights from Guest Pattern

1. **Separation of Concerns**: Metadata in one table, permissions in another
2. **Progressive Enhancement**: Unlinked → Linked (no inheritance → inheritance)
3. **UI Flexibility**: Different UI for guests vs members
4. **Permission Reuse**: Same resolution system, different priority

### Critical Differences

**Guest Collaborators:**

- Can become authenticated users
- Have email/identity
- Can be promoted to members
- Use "Shared with me" navigation

**Public Share:**

- Always anonymous
- No identity/email
- Cannot be promoted
- Need custom navigation UI
- Single entry point (one shared root)

---

## Critical Questions & Decisions

### 1. 🎯 Component Abstraction Strategy

**Question**: Should we create new abstract components or specialized public components?

**Options:**
a) Abstract components with props like `isPublic`, `isGuest`, `isAuthenticated`
b) Specialized components like `PublicDocumentTree`, `PublicDocumentPage`
c) Hybrid: Abstract where possible, specialized where needed

**✅ DECISION: Option C - Hybrid Approach**

- Share algorithms (tree building, traversal logic)
- Keep UI components specialized for each use case
- Prevents over-abstraction and maintains clarity

### 2. 🔑 Permission Resolution Implementation

**Question**: How should PUBLIC_SHARE permissions be resolved?

**Options:**
a) Create DocumentPermission records (like linked guests)
b) Dynamic resolution without database records

**✅ DECISION: Keep Standalone System (Neither Option)**

- Don't integrate with unified permission system at all
- Keep separate `PublicShareService` with its own logic
- Avoids complexity of mixing anonymous and authenticated permissions
- Simpler to understand and maintain

### 3. 🎨 UI/UX Architecture

**Question**: How much UI should we share between authenticated and public experiences?

**✅ DECISION: Keep UX Separate, Share Logic Only**

- Public pages get their own specialized components
- Share underlying algorithms (tree building, navigation)
- No workspace context for public viewers
- Maintain distinct, optimized experiences for each user type

### 4. 🚀 Implementation Phases

**Question**: How should we phase the implementation?

**✅ DECISION: Incremental Approach**

- Phase 1: Extract algorithms, build tree navigation
- Phase 2: Optimize performance and UX
- Phase 3: Add future features (comments/edit) when needed
- Lower risk, easier to validate each step

### 5. 🔧 Editor Mode for Future Features

**Question**: How will `allowComments` and `allowEdit` work with the editor?

**✅ DECISION: Require Sign-up for Collaboration**

- Keep using `ReadOnlyEditor` for anonymous viewers
- allowComments: Users must sign up to comment
- allowEdit: Fork to workspace model after sign-up
- Maintains clear boundary between anonymous and authenticated
- Deferred until user demand is clear

### 6. 📁 Navigation Tree Building

**Question**: Server-side or client-side tree building for public documents?

**✅ DECISION: Client-side with Shared Algorithms**

- Server sends hierarchical data structure
- Client builds tree using shared algorithms from SharedWithMe
- Progressive loading for large trees
- Consistent with authenticated navigation patterns

### 7. 🔒 Security Boundaries

**Question**: How do we maintain security boundaries?

**✅ DECISION: Complete Separation**

- Standalone permission system eliminates mixing concerns
- Separate API routes (`/api/public/*`)
- No WebSocket connections for public viewers
- Token validation in PublicShareService only
- Clear boundary: anonymous users cannot access authenticated features

---

## Algorithm Sharing Strategy

> **Decision**: Share tree-building algorithms between authenticated and public views while keeping UI components separate.

### Algorithms to Extract

#### 1. Tree Building and Traversal

```typescript
// utils/document-tree.ts
export function buildDocumentTree(docs: Doc[]): TreeNode[] {
  // Build hierarchical structure from flat list
  // Used by both SharedWithMe and PublicDocumentTree
}

export function expandTreeToNode(
  tree: TreeNode[],
  nodeId: string
): Set<string> {
  // Returns set of node IDs that need to be expanded to show target
  // Used for auto-expanding to current document
}

export function findNodeInTree(
  tree: TreeNode[],
  nodeId: string
): TreeNode | null {
  // Recursive search for node in tree
  // Used for highlighting active document
}
```

#### 2. Document Hierarchy

```typescript
// utils/document-hierarchy.ts
export async function isDescendantOf(
  childId: string,
  parentId: string
): Promise<boolean> {
  // Check if document is descendant of another
  // Shared between permission checks and navigation
}

export function getDocumentPath(docId: string, docs: Doc[]): Doc[] {
  // Get path from root to document
  // Used for breadcrumbs and navigation
}
```

#### 3. Permission Inheritance (Read-Only Version)

```typescript
// utils/public-permissions.ts
export function canAccessDocument(
  docId: string,
  shareRootId: string,
  docs: Doc[]
): boolean {
  // Check if document is accessible based on share root
  // Simplified version of permission inheritance
  return docId === shareRootId || isDescendantOf(docId, shareRootId);
}
```

### Component Architecture

#### Authenticated: SharedWithMe

- Uses `buildDocumentTree()` for structure
- Connects to user stores and WebSocket
- Supports editing operations
- Multiple root documents

#### Public: PublicDocumentTree

- Uses same `buildDocumentTree()` for consistency
- No authentication dependencies
- Read-only navigation
- Single root document

### Benefits of This Approach

1. **Consistency**: Same tree structure logic across the app
2. **Maintainability**: Bug fixes apply to both implementations
3. **Testing**: Shared utilities can be unit tested once
4. **Performance**: Optimized algorithms benefit all uses
5. **Flexibility**: Components remain specialized for their use cases

---

## Questions You Haven't Considered

### 🌍 SEO and Discoverability

**Question**: Should public documents be indexable by search engines?

Currently: `allowIndexing: false` (hardcoded)

**Considerations:**

- Public documentation should be discoverable
- Need meta tags, sitemap, structured data
- Server-side rendering for SEO?

**Impact**: Might need SSR/SSG for public pages

> update: keep is simple for now

### 📊 Analytics and Tracking

**Question**: What analytics do we need for public shares?

Currently: Basic view count

**Potential Metrics:**

- Unique visitors vs total views
- Time on page
- Navigation patterns
- Geographic distribution
- Referrer tracking

**Impact**: Might need analytics service integration

> update: keep is simple for now

### 🔗 Deep Linking and Permalinks

**Question**: How do we handle section-level links?

Currently: Document-level only

**Considerations:**

- Link to specific headings
- Scroll to position
- Highlight referenced content

**Impact**: Need anchor/hash navigation support

### 🤝 Collaboration Features for Public

**Question**: Should anonymous users see who else is viewing?

**Ideas:**

- "X people viewing now"
- Anonymous cursors/presence
- Public comments/reactions

**Impact**: Anonymous collaboration infrastructure

> update: no need for this

---

## Implementation Plan

### Chosen Approach: **Standalone with Algorithm Sharing**

Based on our architectural decisions, here's the implementation plan:

#### Phase 1: Foundation (Current Sprint)

1. **Keep current standalone permission system**
2. **Extract tree-building algorithms** from SharedWithMe
3. **Build PublicDocumentTree component** using shared algorithms
4. **Improve navigation API** for hierarchical document access

#### Phase 2: Enhancement (Next Sprint)

1. **Optimize tree performance** for large document hierarchies
2. **Improve mobile experience** for public viewers
3. **Add breadcrumb navigation** using shared path utilities
4. **Implement auto-expand** to current document

#### Phase 3: Future Features (When Needed)

1. **allowComments Switch**: Users must sign up to comment
2. **allowEdit Switch**: Fork to workspace model after sign-up
3. **Analytics improvements**: Track navigation patterns
4. **Deep linking**: Support section-level permalinks

### Key Implementation Guidelines

✅ **DO:**

- Keep standalone permission system separate
- Extract and share tree algorithms
- Use ReadOnlyEditor for all public viewing
- Maintain clear security boundaries
- Build specialized public components

❌ **DON'T:**

- Mix public share logic with unified permissions
- Try to reuse authenticated components directly
- Allow anonymous collaboration
- Create DocumentPermission records for public shares
- Connect WebSocket for public viewers

### Technical Implementation Details

#### Backend Tasks

1. **Modify Existing Public API**

   - Update `/api/public/:token` and `/api/public/:token/doc/:docId` endpoints
   - Return document structure similar to `/api/documents/shared-with-me` response format
   - Keep helper methods (`isDescendantOf`, `getPublicChildren`) in `public-share.service.ts` for now
   - Include children as hierarchical tree structure (not flat list like current implementation)
   - Response structure should include:
     ```typescript
     {
       doc: {
         id: string,
         title: string,
         icon?: string,
         createdAt: Date,
         updatedAt: Date,
         parentId: string | null,
         // Include other fields from CommonDocument
         children?: Array<{
           id: string,
           title: string,
           icon?: string,
           parentId: string,
           children?: Array<...> // Recursive structure
         }>
       },
       workspace: { /* existing workspace info */ },
       share: { /* existing share metadata */ }
     }
     ```
   - Build tree recursively on backend (similar to current `getPublicChildren` but return nested structure)

2. **No Extraction Yet**
   - Keep all tree-building logic in `PublicShareService`
   - Only extract to shared utilities when authenticated components need them
   - Avoid premature abstraction

#### Frontend Tasks

1. **Update Router Configuration**

   - Ensure routes properly catch `/public/:token` and `/public/:token/doc/:docId`
   - Current routes should already handle this, but verify:
     ```tsx
     // In router configuration
     <Route path="/public/:token" element={<PublicDocument />} />
     <Route path="/public/:token/doc/:docId" element={<PublicDocument />} />
     ```

2. **Create/Adapt Hooks**

   - Decide whether to create `usePublicDocument` hook or adapt `useCurrentDocument`
   - Recommendation: Create separate `usePublicDocument` hook to avoid mixing concerns
     ```tsx
     // hooks/use-public-document.ts
     export function usePublicDocument(token: string, docId?: string) {
       // Fetch logic for public documents
       // No authentication required
     }
     ```

3. **Use Shadcn/UI Sidebar Component**

   - Follow the pattern from `apps/client/src/pages/main/sidebar/index.tsx`
   - Use `SidebarProvider` to wrap the entire layout
   - Leverage `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarInset` components
   - Simplified structure for public documents (no drag-and-drop context needed):

     ```tsx
     import {
       Sidebar,
       SidebarContent,
       SidebarGroup,
       SidebarGroupContent,
       SidebarGroupLabel,
       SidebarInset,
       SidebarProvider,
     } from "@/components/ui/sidebar";

     <SidebarProvider defaultOpen={true}>
       <Sidebar collapsible="offcanvas">
         <SidebarHeader className="p-0 gap-0">
           {/* Public header - workspace name, sign in button */}
         </SidebarHeader>

         <SidebarContent className="custom-scrollbar">
           <SidebarGroup>
             <SidebarGroupLabel>Pages</SidebarGroupLabel>
             <SidebarGroupContent>
               {doc.children?.map((child) => (
                 <PublicLink
                   key={child.id}
                   document={child}
                   token={token}
                   activeDocId={docId}
                   depth={0}
                 />
               ))}
             </SidebarGroupContent>
           </SidebarGroup>
         </SidebarContent>
       </Sidebar>

       <SidebarInset>{/* Main content with ReadOnlyEditor */}</SidebarInset>
     </SidebarProvider>;
     ```

   - Note: No DndContext wrapper needed (public documents are read-only)
   - No footer needed (unlike authenticated view with trash/templates)

4. **Create PublicLink Component**

   - New component: `/pages/public-document/components/public-link.tsx`
   - Use `SidebarMenuItem` and `SidebarMenuButton` from shadcn/ui
   - Recursively render document tree
   - Features to implement:
     - Expand/collapse with `Collapsible` from shadcn/ui
     - Navigation to `/public/:token/doc/:docId`
     - Active state using `data-active` attribute
     - Icon and title display

5. **Add Table of Contents (TOC)**

   - **Adapt existing TOC component**: `apps/client/src/pages/doc/components/table-of-content.tsx`
   - Current implementation features:

     - IntersectionObserver for active heading tracking
     - Hover-triggered collapsed/expanded UI
     - Hash-based navigation with smooth scrolling
     - Uses `scroll-into-view-if-needed` library
     - Styled with hierarchical indentation

   - **Create PublicTableOfContent component** by adapting the existing one:

     ```tsx
     // pages/public-document/components/public-table-of-content.tsx
     import { memo, useEffect, useState } from "react";
     import scrollIntoView from "scroll-into-view-if-needed";

     interface Props {
       items: TableOfContentDataItem[];
       editor: Editor; // ReadOnly editor instance
     }

     export const PublicTableOfContent = memo(({ items, editor }: Props) => {
       const [isHovered, setIsHovered] = useState(false);
       const [activeId, setActiveId] = useState<string>("");

       // Same IntersectionObserver logic
       // Same navigation logic but without editor.view.focus() (read-only)
       // Same UI structure

       const handleNavigation = (id: string) => {
         if (!editor) return;

         const element = editor.view.dom.querySelector(`[data-toc-id="${id}"]`);
         if (!element) return;

         // Update URL hash
         if (history.pushState) {
           history.pushState(null, "", `#${id}`);
         }

         // Smooth scroll
         scrollIntoView(element, {
           scrollMode: "if-needed",
           block: "center",
           behavior: "smooth",
         });

         setActiveId(id);
       };

       // ... rest of the component (same as existing)
     });
     ```

   - **Key differences from authenticated version**:
     - Remove editor selection/focus logic (read-only)
     - Remove `useEditorStore` dependency (pass props instead)
     - Remove `useEditorMount` hook dependency
     - Keep IntersectionObserver for active tracking
     - Keep same UI/UX for consistency

6. **Add "Go Back to Top" Button**

   - Reuse existing `useScrollTop` hook (`apps/client/src/hooks/use-scroll-top.tsx`)
   - Show button when scrolled past threshold (e.g., 200px)
   - Implementation:

     ```tsx
     import { useScrollTop } from "@/hooks/use-scroll-top";

     const scrolled = useScrollTop(200); // Show after 200px scroll

     {
       scrolled && (
         <Button
           onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
           className="fixed bottom-8 right-8 z-50"
           size="icon"
           variant="outline"
         >
           <ArrowUp className="h-4 w-4" />
         </Button>
       );
     }
     ```

7. **Update Public Document Page Layout**

   - Use SidebarProvider pattern from authenticated layout
   - Layout structure following `apps/client/src/pages/main/sidebar/index.tsx`:

     ```tsx
     function PublicDocument() {
       const { token, docId } = useParams();
       const [tocItems, setTocItems] = useState([]);
       const [editorInstance, setEditorInstance] = useState<Editor | null>(
         null
       );
       const scrolled = useScrollTop(200);

       return (
         <SidebarProvider defaultOpen={true}>
           {/* Left Sidebar - Document tree navigation */}
           <Sidebar collapsible="offcanvas">
             <SidebarHeader>
               {/* Workspace name, sign in button */}
             </SidebarHeader>
             <SidebarContent className="custom-scrollbar">
               <SidebarGroup>
                 <SidebarGroupLabel>Pages</SidebarGroupLabel>
                 <SidebarGroupContent>
                   {doc.children?.map((child) => (
                     <PublicLink
                       key={child.id}
                       document={child}
                       token={token}
                       activeDocId={docId}
                       depth={0}
                     />
                   ))}
                 </SidebarGroupContent>
               </SidebarGroup>
             </SidebarContent>
           </Sidebar>

           {/* Main content area */}
           <SidebarInset
             id="PUBLIC_DOC_SCROLL_CONTAINER"
             className="h-full w-full relative overflow-auto"
           >
             {/* Document content */}
             <div className="container max-w-7xl mx-auto p-8">
               {/* Cover, icon, title */}
               <article className="max-w-3xl mx-auto">
                 <ReadOnlyEditor
                   content={doc.content}
                   onTocUpdate={setTocItems}
                   onEditorReady={setEditorInstance}
                 />
               </article>
             </div>

             {/* Table of Contents - Fixed position, hover-triggered */}
             {editorInstance && tocItems.length > 0 && (
               <PublicTableOfContent items={tocItems} editor={editorInstance} />
             )}

             {/* Scroll to top button */}
             {scrolled && (
               <Button
                 onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                 className="fixed bottom-8 right-8 z-50"
                 size="icon"
                 variant="outline"
               >
                 <ArrowUp className="h-4 w-4" />
               </Button>
             )}
           </SidebarInset>
         </SidebarProvider>
       );
     }
     ```

   - **TOC Positioning**: Fixed on the right side (like authenticated view), hover to expand
   - Responsive behavior:
     - Sidebar: Collapsible with "offcanvas" mode for mobile
     - TOC: Same fixed position with hover trigger (works on all screen sizes)
     - Content: Centered with max-width for readability

8. **Modify ReadOnlyEditor for TOC Support**

   - Update `apps/client/src/editor/read-only-editor.tsx` to:
     - Accept optional `onTocUpdate` callback prop
     - Accept optional `onEditorReady` callback to pass editor instance
     - Add TableOfContents extension to extensions array
     - Configure with public scroll container ID
     - Return TOC items and editor instance via callbacks
   - Example modification:

     ```tsx
     interface ReadOnlyEditorProps {
       content: string | object;
       className?: string;
       onTocUpdate?: (items: TableOfContentDataItem[]) => void;
       onEditorReady?: (editor: Editor) => void; // Pass editor instance for TOC
     }

     export default function ReadOnlyEditor({
       content,
       className,
       onTocUpdate,
       onEditorReady,
     }: ReadOnlyEditorProps) {
       // ... existing code

       const editor = useEditor({
         // ... existing config
         extensions: [
           ...existingExtensions,
           TableOfContents.configure({
             scrollParent: () =>
               document?.getElementById("PUBLIC_DOC_SCROLL_CONTAINER") ||
               window,
             getIndex: getHierarchicalIndexes,
             onUpdate(content) {
               onTocUpdate?.(content);
             },
           }),
         ],
       });

       // Pass editor instance when ready
       useEffect(() => {
         if (editor) {
           onEditorReady?.(editor);
         }
       }, [editor, onEditorReady]);

       // ... rest of component
     }
     ```

   - Then use in PublicDocument page:

     ```tsx
     const [tocItems, setTocItems] = useState([]);
     const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

     <ReadOnlyEditor
       content={doc.content}
       onTocUpdate={setTocItems}
       onEditorReady={setEditorInstance}
     />;

     {
       /* In the TOC section */
     }
     {
       editorInstance && tocItems.length > 0 && (
         <PublicTableOfContent items={tocItems} editor={editorInstance} />
       );
     }
     ```

9. **Component Reuse Summary**

   **Direct Reuse (no changes needed)**:

   - `useScrollTop` hook - works as-is
   - Shadcn/UI components - `Sidebar`, `SidebarProvider`, `SidebarContent`, etc.
   - TipTap extensions - `TableOfContents`, `UniqueID`, all editor extensions
   - `scroll-into-view-if-needed` library

   **Adapt from existing (create new component)**:

   - `PublicTableOfContent` - adapted from `table-of-content.tsx`
     - Remove: editor store, editor selection/focus, `useEditorMount` hook
     - Keep: IntersectionObserver, hover UI, navigation logic
   - `PublicLink` - simplified version of `DocumentLink`
     - Remove: drag-drop, rename, create, delete, context menus
     - Keep: expand/collapse, navigation, active state

   **New components to create**:

   - `usePublicDocument` hook - fetch logic for public documents

10. **Key Implementation Notes**

- Hash-based navigation for TOC (same pattern as authenticated editor)
- Ensure smooth reading experience with TOC and scroll-to-top
- Keep responsive design in mind
- No authentication dependencies
- Maintain clear separation from authenticated components
- Same visual design for consistency with authenticated experience

---

## Future Considerations

### When to Add allowComments/allowEdit

These features should be implemented only when there's clear user demand:

1. **allowComments**: Requires users to sign up first

   - Add comment UI that prompts sign-up
   - After sign-up, user becomes a guest with COMMENT permission
   - Comments stored in main system, not separate

2. **allowEdit**: Fork to workspace model
   - "Save to my workspace" button
   - Creates copy in user's workspace
   - Original remains read-only

### Security Considerations

- **Token rotation**: Consider adding token refresh mechanism
- **Rate limiting**: Implement for public endpoints
- **View tracking**: Privacy-compliant analytics
- **Abuse prevention**: Monitor for excessive API usage

### Performance Optimizations

- **Tree caching**: Cache built trees in Redis
- **Progressive loading**: Load children on-demand for large trees
- **CDN integration**: Serve public documents via CDN
- **Database indexes**: Optimize parent-child queries

---

## Conclusion

By choosing to maintain a **standalone permission system** while **sharing tree-building algorithms**, we achieve the best balance of:

- **Simplicity**: Clear separation of concerns
- **Security**: No mixing of anonymous and authenticated flows
- **Maintainability**: Shared algorithms reduce duplication
- **Flexibility**: Each system optimized for its use case

This architecture allows us to deliver a robust public sharing feature while preserving the option to enhance it in the future without major refactoring.
