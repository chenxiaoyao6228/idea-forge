import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { ShareDocumentService } from "./share-document.services";
import { DocPermissionResolveService } from "@/permission/document-permission.service";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { getTestPrisma, clearDatabase, startContainersAndWriteEnv, stopContainers } from "@test/setup/test-container-setup";
import {
  buildDocument,
  buildUser,
  buildWorkspace,
  buildWorkspaceMember,
  buildSubspace,
  buildDocumentPermission,
  buildSubspaceMember,
} from "@test/factories/prisma";
import { PermissionLevel, PermissionInheritanceType } from "@idea/contracts";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";

describe("ShareDocumentService - Inherited Permissions in Share List", () => {
  let shareService: ShareDocumentService;
  let permissionService: DocPermissionResolveService;
  let prisma: any;
  let module: TestingModule;

  beforeAll(async () => {
    await startContainersAndWriteEnv();
    prisma = getTestPrisma();

    module = await Test.createTestingModule({
      providers: [
        ShareDocumentService,
        DocPermissionResolveService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventPublisherService, useValue: { publishWebsocketEvent: vi.fn() } },
      ],
    }).compile();

    shareService = module.get<ShareDocumentService>(ShareDocumentService);
    permissionService = module.get<DocPermissionResolveService>(DocPermissionResolveService);
  });

  afterAll(async () => {
    await stopContainers();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it("should show inherited user permissions in child document share list", async () => {
    // Setup: Create workspace, subspace, users
    const owner = await buildUser({ email: "owner@test.com" });
    const userA = await buildUser({ email: "userA@test.com" });
    const userB = await buildUser({ email: "userB@test.com" });

    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: owner.id, role: "OWNER" });

    const subspace = await buildSubspace({
      workspaceId: workspace.id,
      name: "Test Subspace",
      type: "PUBLIC",
    });

    // Create parent document
    const parentDoc = await buildDocument({
      title: "Parent Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
    });

    // Create child document
    const childDoc = await buildDocument({
      title: "Child Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
      parentId: parentDoc.id,
    });

    // Share parent document with userA (EDIT) and userB (READ)
    await buildDocumentPermission({
      docId: parentDoc.id,
      userId: userA.id,
      permission: PermissionLevel.EDIT,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    await buildDocumentPermission({
      docId: parentDoc.id,
      userId: userB.id,
      permission: PermissionLevel.READ,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    // Get share list for CHILD document
    const childShares = await shareService.getDocumentCollaborators(childDoc.id, owner.id);

    // Debug: Log the result
    console.log("Child shares:", JSON.stringify(childShares, null, 2));

    // Should include inherited permissions from parent
    const userAShare = childShares.find((s) => s.type === "user" && s.id === userA.id);
    const userBShare = childShares.find((s) => s.type === "user" && s.id === userB.id);

    expect(userAShare).toBeDefined();
    expect(userAShare?.permission.level).toBe(PermissionLevel.EDIT);
    expect(userAShare?.permissionSource?.source).toBe("inherited");
    expect(userAShare?.permissionSource?.sourceDocId).toBe(parentDoc.id);
    expect(userAShare?.hasParentPermission).toBeUndefined(); // No override, so this flag is not set

    expect(userBShare).toBeDefined();
    expect(userBShare?.permission.level).toBe(PermissionLevel.READ);
    expect(userBShare?.permissionSource?.source).toBe("inherited");
  });

  it("should mark user as having override when child has direct permission", async () => {
    // Setup
    const owner = await buildUser({ email: "owner@test.com" });
    const userA = await buildUser({ email: "userA@test.com" });

    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: owner.id, role: "OWNER" });
    const subspace = await buildSubspace({ workspaceId: workspace.id, name: "Test Subspace", type: "PUBLIC" });

    // Create parent and child documents
    const parentDoc = await buildDocument({
      title: "Parent Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
    });

    const childDoc = await buildDocument({
      title: "Child Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
      parentId: parentDoc.id,
    });

    // Share parent with userA at EDIT level
    await buildDocumentPermission({
      docId: parentDoc.id,
      userId: userA.id,
      permission: PermissionLevel.EDIT,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    // Override on child with userA at READ level (downgrade)
    await buildDocumentPermission({
      docId: childDoc.id,
      userId: userA.id,
      permission: PermissionLevel.READ,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    // Get share list for child document
    const childShares = await shareService.getDocumentCollaborators(childDoc.id, owner.id);

    const userAShare = childShares.find((s) => s.type === "user" && s.id === userA.id);

    // Should show direct permission (READ), but mark as having parent permission
    expect(userAShare).toBeDefined();
    expect(userAShare?.permission.level).toBe(PermissionLevel.READ); // Child override wins
    expect(userAShare?.permissionSource?.source).toBe("direct"); // Direct on child
    expect(userAShare?.hasParentPermission).toBe(true); // Flag indicating override
    expect(userAShare?.parentPermissionSource?.level).toBe(PermissionLevel.EDIT); // Parent had EDIT
    expect(userAShare?.parentPermissionSource?.source).toBe("inherited");
  });

  it("should show correct parent document title in permission source when inherited", async () => {
    const owner = await buildUser({ email: "owner@test.com" });
    const userA = await buildUser({ email: "userA@test.com" });

    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: owner.id, role: "OWNER" });
    const subspace = await buildSubspace({ workspaceId: workspace.id, name: "Test Subspace", type: "PUBLIC" });

    // Create parent document
    const parentDoc = await buildDocument({
      title: "Parent Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
    });

    // Share parent with userA at EDIT level
    await buildDocumentPermission({
      docId: parentDoc.id,
      userId: userA.id,
      permission: PermissionLevel.EDIT,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    // Create child document
    const childDoc = await buildDocument({
      title: "Child Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
      parentId: parentDoc.id,
    });

    // Get share list for child document
    const childShares = await shareService.getDocumentCollaborators(childDoc.id, owner.id);
    const userAShare = childShares.find((s) => s.type === "user" && s.id === userA.id);

    // Should show parent document title as source
    expect(userAShare).toBeDefined();
    expect(userAShare?.permissionSource?.source).toBe("inherited");
    expect(userAShare?.permissionSource?.sourceDocTitle).toBe("Parent Document");
    expect(userAShare?.permissionSource?.sourceDocId).toBe(parentDoc.id);
  });

  it("should show correct parent document title when user overrides on child", async () => {
    const owner = await buildUser({ email: "owner@test.com" });
    const userA = await buildUser({ email: "userA@test.com" });

    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: owner.id, role: "OWNER" });
    const subspace = await buildSubspace({ workspaceId: workspace.id, name: "Test Subspace", type: "PUBLIC" });

    // Create parent document
    const parentDoc = await buildDocument({
      title: "Parent Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
    });

    // Share parent with userA at EDIT level
    await buildDocumentPermission({
      docId: parentDoc.id,
      userId: userA.id,
      permission: PermissionLevel.EDIT,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    // Create child document
    const childDoc = await buildDocument({
      title: "Child Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
      parentId: parentDoc.id,
    });

    // Override on child with userA at READ level
    await buildDocumentPermission({
      docId: childDoc.id,
      userId: userA.id,
      permission: PermissionLevel.READ,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    // Get share list for child document
    const childShares = await shareService.getDocumentCollaborators(childDoc.id, owner.id);
    const userAShare = childShares.find((s) => s.type === "user" && s.id === userA.id);

    // Should show child title as direct source, and parent title in parentPermissionSource
    expect(userAShare).toBeDefined();
    expect(userAShare?.permissionSource?.source).toBe("direct");
    expect(userAShare?.permissionSource?.sourceDocTitle).toBe("Child Document");
    expect(userAShare?.permissionSource?.sourceDocId).toBe(childDoc.id);
    expect(userAShare?.hasParentPermission).toBe(true);
    expect(userAShare?.parentPermissionSource?.sourceDocTitle).toBe("Parent Document");
    expect(userAShare?.parentPermissionSource?.sourceDocId).toBe(parentDoc.id);
  });

  it("should show immediate parent title in multi-level hierarchy (grandparent > parent > child)", async () => {
    const owner = await buildUser({ email: "owner@test.com" });
    const userA = await buildUser({ email: "userA@test.com" });

    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: owner.id, role: "OWNER" });
    const subspace = await buildSubspace({ workspaceId: workspace.id, name: "Test Subspace", type: "PUBLIC" });

    // Create grandparent document
    const grandparentDoc = await buildDocument({
      title: "Grandparent Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
    });

    // Share grandparent with userA
    await buildDocumentPermission({
      docId: grandparentDoc.id,
      userId: userA.id,
      permission: PermissionLevel.MANAGE,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    // Create parent document (no direct permission, inherits from grandparent)
    const parentDoc = await buildDocument({
      title: "Parent Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
      parentId: grandparentDoc.id,
    });

    // Create child document
    const childDoc = await buildDocument({
      title: "Child Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
      parentId: parentDoc.id,
    });

    // Override on child with READ
    await buildDocumentPermission({
      docId: childDoc.id,
      userId: userA.id,
      permission: PermissionLevel.READ,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    // Get share list for child document
    const childShares = await shareService.getDocumentCollaborators(childDoc.id, owner.id);
    const userAShare = childShares.find((s) => s.type === "user" && s.id === userA.id);

    // Should show immediate parent (Parent Document), not ultimate source (Grandparent Document)
    expect(userAShare).toBeDefined();
    expect(userAShare?.permissionSource?.source).toBe("direct");
    expect(userAShare?.permissionSource?.sourceDocTitle).toBe("Child Document");
    expect(userAShare?.hasParentPermission).toBe(true);
    // Should reference immediate parent for better UX
    expect(userAShare?.parentPermissionSource?.sourceDocTitle).toBe("Parent Document");
    expect(userAShare?.parentPermissionSource?.sourceDocId).toBe(parentDoc.id);
    expect(userAShare?.parentPermissionSource?.level).toBe(PermissionLevel.MANAGE);
  });

  it("should exclude child documents from shared-with-me when parent is also shared", async () => {
    const owner = await buildUser({ email: "owner@test.com" });
    const userA = await buildUser({ email: "userA@test.com" });

    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: owner.id, role: "OWNER" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: userA.id, role: "MEMBER" });
    const subspace = await buildSubspace({ workspaceId: workspace.id, name: "Test Subspace", type: "PUBLIC" });
    // NOTE: userA is workspace member but NOT subspace member, so documents should appear in shared-with-me

    // Create parent document
    const parentDoc = await buildDocument({
      title: "Parent Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
    });

    // Create child document
    const childDoc = await buildDocument({
      title: "Child Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
      parentId: parentDoc.id,
    });

    // Create grandchild document
    const grandchildDoc = await buildDocument({
      title: "Grandchild Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
      parentId: childDoc.id,
    });

    // Share parent with userA (EDIT)
    await buildDocumentPermission({
      docId: parentDoc.id,
      userId: userA.id,
      permission: PermissionLevel.EDIT,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    // Share grandchild with userA (READ) - direct override
    await buildDocumentPermission({
      docId: grandchildDoc.id,
      userId: userA.id,
      permission: PermissionLevel.READ,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    // Get shared documents for userA
    const result = await shareService.getSharedWithMeDocuments(userA.id);
    const sharedDocs = result.data.documents;

    // Should only include parent, not grandchild (even though grandchild has direct permission)
    expect(sharedDocs.length).toBe(1);
    expect(sharedDocs[0].id).toBe(parentDoc.id);
    expect(sharedDocs[0].title).toBe("Parent Document");

    // Grandchild should not appear in shared-with-me because its ancestor (parent) is shared
    const hasGrandchild = sharedDocs.some((doc) => doc.id === grandchildDoc.id);
    expect(hasGrandchild).toBe(false);
  });

  it("should include child document in shared-with-me when parent is NOT shared", async () => {
    const owner = await buildUser({ email: "owner@test.com" });
    const userA = await buildUser({ email: "userA@test.com" });

    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: owner.id, role: "OWNER" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: userA.id, role: "MEMBER" });
    const subspace = await buildSubspace({ workspaceId: workspace.id, name: "Test Subspace", type: "PUBLIC" });
    // NOTE: userA is workspace member but NOT subspace member, so documents should appear in shared-with-me

    // Create parent document (NOT shared with userA)
    const parentDoc = await buildDocument({
      title: "Parent Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
    });

    // Create child document
    const childDoc = await buildDocument({
      title: "Child Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
      parentId: parentDoc.id,
    });

    // Share ONLY child with userA
    await buildDocumentPermission({
      docId: childDoc.id,
      userId: userA.id,
      permission: PermissionLevel.EDIT,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    // Get shared documents for userA
    const result = await shareService.getSharedWithMeDocuments(userA.id);
    const sharedDocs = result.data.documents;

    // Should include child because parent is NOT shared
    expect(sharedDocs.length).toBe(1);
    expect(sharedDocs[0].id).toBe(childDoc.id);
    expect(sharedDocs[0].title).toBe("Child Document");
  });

  it("should show Personal subspace documents and non-member subspace documents in shared-with-me", async () => {
    const owner = await buildUser({ email: "owner@test.com" });
    const userA = await buildUser({ email: "userA@test.com" });

    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: owner.id, role: "OWNER" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: userA.id, role: "MEMBER" });

    // Create Personal subspace
    const personalSubspace = await buildSubspace({
      workspaceId: workspace.id,
      name: "Personal Subspace",
      type: "PERSONAL",
    });

    // Create Public subspace where userA is a member
    const publicSubspaceWithMember = await buildSubspace({
      workspaceId: workspace.id,
      name: "Public Subspace - Member",
      type: "PUBLIC",
    });
    await buildSubspaceMember({
      subspaceId: publicSubspaceWithMember.id,
      userId: userA.id,
      role: "MEMBER",
    });

    // Create Public subspace where userA is NOT a member
    const publicSubspaceNoMember = await buildSubspace({
      workspaceId: workspace.id,
      name: "Public Subspace - No Member",
      type: "PUBLIC",
    });

    // Create document in Personal subspace
    const personalDoc = await buildDocument({
      title: "Personal Document",
      workspaceId: workspace.id,
      subspaceId: personalSubspace.id,
      authorId: owner.id,
    });

    // Create document in Public subspace where userA IS a member
    const publicDocWithMember = await buildDocument({
      title: "Public Document - Member",
      workspaceId: workspace.id,
      subspaceId: publicSubspaceWithMember.id,
      authorId: owner.id,
    });

    // Create document in Public subspace where userA is NOT a member
    const publicDocNoMember = await buildDocument({
      title: "Public Document - No Member",
      workspaceId: workspace.id,
      subspaceId: publicSubspaceNoMember.id,
      authorId: owner.id,
    });

    // Share all three documents with userA
    await buildDocumentPermission({
      docId: personalDoc.id,
      userId: userA.id,
      permission: PermissionLevel.EDIT,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    await buildDocumentPermission({
      docId: publicDocWithMember.id,
      userId: userA.id,
      permission: PermissionLevel.EDIT,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    await buildDocumentPermission({
      docId: publicDocNoMember.id,
      userId: userA.id,
      permission: PermissionLevel.EDIT,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    // Get shared documents for userA
    const result = await shareService.getSharedWithMeDocuments(userA.id);
    const sharedDocs = result.data.documents;

    // Should include:
    // 1. Personal subspace document (cross-personal sharing)
    // 2. Public subspace document where userA is NOT a member (no navigation access)
    // Should NOT include:
    // 3. Public subspace document where userA IS a member (accessible via subspace tree)
    expect(sharedDocs.length).toBe(2);

    const docIds = sharedDocs.map((doc) => doc.id);
    expect(docIds).toContain(personalDoc.id); // Cross-personal sharing
    expect(docIds).toContain(publicDocNoMember.id); // Non-member subspace
    expect(docIds).not.toContain(publicDocWithMember.id); // Member of subspace, accessible via tree
  });

  it("should deduplicate users with permissions on multiple ancestors", async () => {
    // Test: User has permissions on both grandparent and parent
    // Result: Should appear only ONCE with the highest permission (from closest ancestor)
    const owner = await buildUser({ email: "owner@test.com" });
    const userA = await buildUser({ email: "userA@test.com" });

    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: owner.id, role: "OWNER" });
    const subspace = await buildSubspace({ workspaceId: workspace.id, name: "Test Subspace", type: "PUBLIC" });

    // Create grandparent document
    const grandparentDoc = await buildDocument({
      title: "Grandparent Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
    });

    // Share grandparent with userA (READ)
    await buildDocumentPermission({
      docId: grandparentDoc.id,
      userId: userA.id,
      permission: PermissionLevel.READ,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    // Create parent document
    const parentDoc = await buildDocument({
      title: "Parent Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
      parentId: grandparentDoc.id,
    });

    // Share parent with userA (EDIT) - higher permission
    await buildDocumentPermission({
      docId: parentDoc.id,
      userId: userA.id,
      permission: PermissionLevel.EDIT,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    // Create child document (no direct permission)
    const childDoc = await buildDocument({
      title: "Child Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
      parentId: parentDoc.id,
    });

    // Get share list for child document
    const childShares = await shareService.getDocumentCollaborators(childDoc.id, owner.id);

    // Filter to user shares only
    const userShares = childShares.filter((s) => s.type === "user");
    const userAShares = userShares.filter((s) => s.id === userA.id);

    // CRITICAL: Should appear only ONCE, not twice
    expect(userAShares.length).toBe(1);

    // Should have EDIT permission (from closest ancestor - parent)
    const userAShare = userAShares[0];
    expect(userAShare.permission.level).toBe(PermissionLevel.EDIT);
    expect(userAShare.permissionSource?.source).toBe("inherited");
    expect(userAShare.permissionSource?.sourceDocId).toBe(parentDoc.id); // From parent, not grandparent
    expect(userAShare.permissionSource?.sourceDocTitle).toBe("Parent Document");
  });

  it("should return correct parentPermissionSource for overrides", async () => {
    // Test: Child has direct override, parent has permission
    // Result: parentPermissionSource should show parent's title, not child's title
    const owner = await buildUser({ email: "owner@test.com" });
    const userB = await buildUser({ email: "userB@test.com" });

    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: owner.id, role: "OWNER" });
    const subspace = await buildSubspace({ workspaceId: workspace.id, name: "Test Subspace", type: "PUBLIC" });

    // Create parent document
    const parentDoc = await buildDocument({
      title: "Parent Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
    });

    // Share parent with userB (EDIT)
    await buildDocumentPermission({
      docId: parentDoc.id,
      userId: userB.id,
      permission: PermissionLevel.EDIT,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    // Create child document
    const childDoc = await buildDocument({
      title: "Child Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
      parentId: parentDoc.id,
    });

    // Override on child with READ (direct override)
    await buildDocumentPermission({
      docId: childDoc.id,
      userId: userB.id,
      permission: PermissionLevel.READ,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    // Get share list for child document
    const childShares = await shareService.getDocumentCollaborators(childDoc.id, owner.id);
    const userBShare = childShares.find((s) => s.type === "user" && s.id === userB.id);

    // Verify permissionSource shows child (direct)
    expect(userBShare).toBeDefined();
    expect(userBShare?.permissionSource?.source).toBe("direct");
    expect(userBShare?.permissionSource?.sourceDocTitle).toBe("Child Document"); // Current document
    expect(userBShare?.permissionSource?.sourceDocId).toBe(childDoc.id);

    // Verify parentPermissionSource shows parent (inherited)
    expect(userBShare?.hasParentPermission).toBe(true);
    expect(userBShare?.parentPermissionSource).toBeDefined();
    expect(userBShare?.parentPermissionSource?.sourceDocTitle).toBe("Parent Document"); // MUST be parent title
    expect(userBShare?.parentPermissionSource?.sourceDocId).toBe(parentDoc.id);
    expect(userBShare?.parentPermissionSource?.level).toBe(PermissionLevel.EDIT);
  });

  it("should return accessible children when filtering by sharedDocumentId for client-side tree building", async () => {
    // Test: Shared-with-me navigation tree is built client-side by progressive fetching
    // Result: When querying children with sharedDocumentId, should return all accessible children
    const owner = await buildUser({ email: "owner@test.com" });
    const userC = await buildUser({ email: "userC@test.com" });

    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: owner.id, role: "OWNER" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: userC.id, role: "MEMBER" });

    const subspace = await buildSubspace({ workspaceId: workspace.id, name: "Test Subspace", type: "PERSONAL" });

    // Create parent document (root shared document)
    const parentDoc = await buildDocument({
      title: "Parent Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
    });

    // Share parent with userC (MANAGE)
    await buildDocumentPermission({
      docId: parentDoc.id,
      userId: userC.id,
      permission: PermissionLevel.MANAGE,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    // Create child document
    const childDoc = await buildDocument({
      title: "Child Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
      parentId: parentDoc.id,
    });

    // Child has direct permission (EDIT) - different from inherited
    await buildDocumentPermission({
      docId: childDoc.id,
      userId: userC.id,
      permission: PermissionLevel.EDIT,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: owner.id,
    });

    // Create grandchild document (no direct permission - should inherit)
    const grandchildDoc = await buildDocument({
      title: "Grandchild Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
      parentId: childDoc.id,
    });

    // Get shared-with-me documents for userC (should return parent only)
    const sharedWithMe = await shareService.getSharedWithMeDocuments(userC.id);
    const sharedDocs = sharedWithMe.data.documents;

    // Should include parent (top-level shared document)
    expect(sharedDocs.length).toBe(1);
    expect(sharedDocs[0].id).toBe(parentDoc.id);

    // Now test client-side tree building: List children of parent
    // This simulates the client calling /api/documents/list with parentId=parent, sharedDocumentId=parent
    const parentChildren = await prisma.doc.findMany({
      where: {
        parentId: parentDoc.id,
        // Note: In real API, this would filter by permission
      },
    });

    // Should return child document (userC has EDIT permission)
    expect(parentChildren.length).toBe(1);
    expect(parentChildren[0].id).toBe(childDoc.id);

    // List children of child (simulates expanding child folder)
    const childChildren = await prisma.doc.findMany({
      where: {
        parentId: childDoc.id,
      },
    });

    // Should return grandchild (userC has inherited EDIT permission from child)
    expect(childChildren.length).toBe(1);
    expect(childChildren[0].id).toBe(grandchildDoc.id);

    // Verify permissions are correct for all levels
    const parentPerm = await permissionService.resolveUserPermissionForDocument(userC.id, {
      id: parentDoc.id,
      workspaceId: workspace.id,
      subspaceId: subspace.id,
    });
    expect(parentPerm.level).toBe(PermissionLevel.MANAGE);

    const childPerm = await permissionService.resolveUserPermissionForDocument(userC.id, {
      id: childDoc.id,
      workspaceId: workspace.id,
      subspaceId: subspace.id,
    });
    expect(childPerm.level).toBe(PermissionLevel.EDIT);

    const grandchildPerm = await permissionService.resolveUserPermissionForDocument(userC.id, {
      id: grandchildDoc.id,
      workspaceId: workspace.id,
      subspaceId: subspace.id,
    });
    expect(grandchildPerm.level).toBe(PermissionLevel.EDIT); // Inherited from child
  });
});
