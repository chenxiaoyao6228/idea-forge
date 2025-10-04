import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { DocumentService } from "./document.service";
import { DocPermissionResolveService } from "@/permission/document-permission.service";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { AbilityService } from "@/_shared/casl/casl.service";
import { getTestPrisma, clearDatabase, startContainersAndWriteEnv, stopContainers } from "@test/setup/test-container-setup";
import {
  buildDocument,
  buildUser,
  buildWorkspace,
  buildWorkspaceMember,
  buildSubspace,
  buildDocumentPermission,
} from "@test/factories/prisma";
import { PermissionLevel, PermissionInheritanceType } from "@idea/contracts";

describe("DocumentService - Permission Creation on Document Create", () => {
  let documentService: DocumentService;
  let permissionService: DocPermissionResolveService;
  let prisma: any;
  let module: TestingModule;

  beforeAll(async () => {
    await startContainersAndWriteEnv();
    prisma = getTestPrisma();

    module = await Test.createTestingModule({
      providers: [
        DocumentService,
        DocPermissionResolveService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventPublisherService, useValue: { publishWebsocketEvent: vi.fn() } },
        { provide: AbilityService, useValue: {} },
      ],
    }).compile();

    documentService = module.get<DocumentService>(DocumentService);
    permissionService = module.get<DocPermissionResolveService>(DocPermissionResolveService);
  });

  afterAll(async () => {
    await stopContainers();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it("should create DIRECT permission for author when creating root document (no parent)", async () => {
    // Setup: Create workspace, subspace, and user
    const author = await buildUser({ email: "author@test.com" });
    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: author.id, role: "OWNER" });
    const subspace = await buildSubspace({
      workspaceId: workspace.id,
      name: "Test Subspace",
      type: "PUBLIC",
    });

    // Create root document (no parent)
    const rootDoc = await documentService.create(author.id, {
      title: "Root Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
    });

    // Verify: Should create DIRECT permission for author
    const permissions = await prisma.documentPermission.findMany({
      where: {
        docId: rootDoc.id,
        userId: author.id,
      },
    });

    expect(permissions.length).toBe(1);
    expect(permissions[0].permission).toBe(PermissionLevel.MANAGE);
    expect(permissions[0].inheritedFromType).toBe(PermissionInheritanceType.DIRECT);
  });

  it("should NOT create redundant permission when creating child document where author has MANAGE on parent", async () => {
    // Setup: Create workspace, subspace, and user
    const author = await buildUser({ email: "author@test.com" });
    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: author.id, role: "OWNER" });
    const subspace = await buildSubspace({
      workspaceId: workspace.id,
      name: "Test Subspace",
      type: "PUBLIC",
    });

    // Create parent document with DIRECT permission for author
    const parentDoc = await buildDocument({
      title: "Parent Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: author.id,
    });

    await buildDocumentPermission({
      docId: parentDoc.id,
      userId: author.id,
      permission: PermissionLevel.MANAGE,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: author.id,
    });

    // Create child document
    const childDoc = await documentService.create(author.id, {
      title: "Child Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      parentId: parentDoc.id,
    });

    // Verify: Should NOT create permission on child (will inherit from parent)
    const childPermissions = await prisma.documentPermission.findMany({
      where: {
        docId: childDoc.id,
        userId: author.id,
      },
    });

    expect(childPermissions.length).toBe(0); // No direct permission on child

    // Verify: Author still has MANAGE on child through inheritance
    const resolvedPermission = await permissionService.resolveUserPermissionForDocument(author.id, {
      id: childDoc.id,
      workspaceId: workspace.id,
      subspaceId: subspace.id,
    });

    expect(resolvedPermission.level).toBe(PermissionLevel.MANAGE);
    expect(resolvedPermission.source).toBe("inherited");
    expect(resolvedPermission.sourceDocId).toBe(parentDoc.id);
  });

  it("should NOT create redundant permission for grandchild when author has MANAGE on grandparent", async () => {
    // Setup
    const author = await buildUser({ email: "author@test.com" });
    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: author.id, role: "OWNER" });
    const subspace = await buildSubspace({
      workspaceId: workspace.id,
      name: "Test Subspace",
      type: "PUBLIC",
    });

    // Create grandparent with DIRECT permission
    const grandparentDoc = await buildDocument({
      title: "Grandparent Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: author.id,
    });

    await buildDocumentPermission({
      docId: grandparentDoc.id,
      userId: author.id,
      permission: PermissionLevel.MANAGE,
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: author.id,
    });

    // Create parent (should not create permission)
    const parentDoc = await documentService.create(author.id, {
      title: "Parent Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      parentId: grandparentDoc.id,
    });

    // Create grandchild (should not create permission)
    const grandchildDoc = await documentService.create(author.id, {
      title: "Grandchild Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      parentId: parentDoc.id,
    });

    // Verify: No permissions on parent or grandchild
    const parentPermissions = await prisma.documentPermission.findMany({
      where: { docId: parentDoc.id, userId: author.id },
    });
    const grandchildPermissions = await prisma.documentPermission.findMany({
      where: { docId: grandchildDoc.id, userId: author.id },
    });

    expect(parentPermissions.length).toBe(0);
    expect(grandchildPermissions.length).toBe(0);

    // Verify: Author has MANAGE on all through inheritance
    const grandparentPerm = await permissionService.resolveUserPermissionForDocument(author.id, {
      id: grandparentDoc.id,
      workspaceId: workspace.id,
      subspaceId: subspace.id,
    });
    const parentPerm = await permissionService.resolveUserPermissionForDocument(author.id, {
      id: parentDoc.id,
      workspaceId: workspace.id,
      subspaceId: subspace.id,
    });
    const grandchildPerm = await permissionService.resolveUserPermissionForDocument(author.id, {
      id: grandchildDoc.id,
      workspaceId: workspace.id,
      subspaceId: subspace.id,
    });

    expect(grandparentPerm.level).toBe(PermissionLevel.MANAGE);
    expect(grandparentPerm.source).toBe("direct");

    expect(parentPerm.level).toBe(PermissionLevel.MANAGE);
    expect(parentPerm.source).toBe("inherited");
    expect(parentPerm.sourceDocId).toBe(grandparentDoc.id);

    expect(grandchildPerm.level).toBe(PermissionLevel.MANAGE);
    expect(grandchildPerm.source).toBe("inherited");
    // Should inherit from grandparent (closest ancestor with permission)
    expect(grandchildPerm.sourceDocId).toBe(grandparentDoc.id);
  });

  it("should create DIRECT permission when creating child where author does NOT have MANAGE on parent", async () => {
    // Setup
    const author = await buildUser({ email: "author@test.com" });
    const otherUser = await buildUser({ email: "other@test.com" });
    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: author.id, role: "MEMBER" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: otherUser.id, role: "OWNER" });

    const subspace = await buildSubspace({
      workspaceId: workspace.id,
      name: "Test Subspace",
      type: "PUBLIC",
    });

    // Create parent owned by otherUser with READ permission for author
    const parentDoc = await buildDocument({
      title: "Parent Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: otherUser.id,
    });

    await buildDocumentPermission({
      docId: parentDoc.id,
      userId: author.id,
      permission: PermissionLevel.READ, // Author has READ, not MANAGE
      inheritedFromType: PermissionInheritanceType.DIRECT,
      priority: 1,
      createdById: otherUser.id,
    });

    // Create child authored by author
    const childDoc = await documentService.create(author.id, {
      title: "Child Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      parentId: parentDoc.id,
    });

    // Verify: Should create DIRECT permission because author doesn't have MANAGE on parent
    const childPermissions = await prisma.documentPermission.findMany({
      where: {
        docId: childDoc.id,
        userId: author.id,
      },
    });

    expect(childPermissions.length).toBe(1);
    expect(childPermissions[0].permission).toBe(PermissionLevel.MANAGE);
    expect(childPermissions[0].inheritedFromType).toBe(PermissionInheritanceType.DIRECT);

    // Verify: Author has MANAGE on child (direct), READ on parent (inherited)
    const childPerm = await permissionService.resolveUserPermissionForDocument(author.id, {
      id: childDoc.id,
      workspaceId: workspace.id,
      subspaceId: subspace.id,
    });
    const parentPerm = await permissionService.resolveUserPermissionForDocument(author.id, {
      id: parentDoc.id,
      workspaceId: workspace.id,
      subspaceId: subspace.id,
    });

    expect(childPerm.level).toBe(PermissionLevel.MANAGE);
    expect(childPerm.source).toBe("direct");

    expect(parentPerm.level).toBe(PermissionLevel.READ);
    expect(parentPerm.source).toBe("direct");
  });

  it("should create DIRECT permission when creating child where author has NO permission on parent", async () => {
    // Setup
    const author = await buildUser({ email: "author@test.com" });
    const otherUser = await buildUser({ email: "other@test.com" });
    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: author.id, role: "MEMBER" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: otherUser.id, role: "OWNER" });

    const subspace = await buildSubspace({
      workspaceId: workspace.id,
      name: "Test Subspace",
      type: "PUBLIC",
    });

    // Create parent owned by otherUser (no permission for author)
    const parentDoc = await buildDocument({
      title: "Parent Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: otherUser.id,
    });

    // Create child authored by author (parent has no permission for author)
    const childDoc = await documentService.create(author.id, {
      title: "Child Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      parentId: parentDoc.id,
    });

    // Verify: Should create DIRECT permission because author has no permission on parent
    const childPermissions = await prisma.documentPermission.findMany({
      where: {
        docId: childDoc.id,
        userId: author.id,
      },
    });

    expect(childPermissions.length).toBe(1);
    expect(childPermissions[0].permission).toBe(PermissionLevel.MANAGE);
    expect(childPermissions[0].inheritedFromType).toBe(PermissionInheritanceType.DIRECT);

    // Verify: Author has MANAGE on child (direct)
    const childPerm = await permissionService.resolveUserPermissionForDocument(author.id, {
      id: childDoc.id,
      workspaceId: workspace.id,
      subspaceId: subspace.id,
    });

    expect(childPerm.level).toBe(PermissionLevel.MANAGE);
    expect(childPerm.source).toBe("direct");
  });
});
