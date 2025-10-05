import { Test, TestingModule } from "@nestjs/testing";
import { getTestPrisma, clearDatabase, startContainersAndWriteEnv, stopContainers } from "@test/setup/test-container-setup";
import {
  buildDocument,
  buildUser,
  buildWorkspace,
  buildWorkspaceMember,
  buildSubspace,
  buildDocumentPermission,
  buildMemberGroup,
  buildMemberGroupUser,
} from "@test/factories/prisma";
import { PermissionLevel, PermissionInheritanceType } from "@idea/contracts";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { ShareDocumentService } from "@/document/share-document.services";
import { DocPermissionResolveService } from "./document-permission.service";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { vi } from "vitest";

describe("Permission Override Detection (hasParentPermission flag)", () => {
  let shareService: ShareDocumentService;
  let permissionService: DocPermissionResolveService;
  let prisma: any;
  let eventPublisher: EventPublisherService;

  beforeAll(async () => {
    await startContainersAndWriteEnv();
    prisma = getTestPrisma();
  });

  afterAll(async () => {
    await stopContainers();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Mock event publisher
    eventPublisher = {
      publish: vi.fn(),
      publishWebsocketEvent: vi.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareDocumentService,
        DocPermissionResolveService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: EventPublisherService,
          useValue: eventPublisher,
        },
      ],
    }).compile();

    shareService = module.get<ShareDocumentService>(ShareDocumentService);
    permissionService = module.get<DocPermissionResolveService>(DocPermissionResolveService);
  });

  describe("User Override Detection", () => {
    it("should set hasParentPermission=true when user has DIRECT override on child with GROUP permission inherited from parent", async () => {
      // Setup workspace and users
      const workspace = await buildWorkspace();
      const user1 = await buildUser({ email: "user1@test.com" });
      const user2 = await buildUser({ email: "user2@test.com" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: user1.id, role: "MEMBER" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: user2.id, role: "MEMBER" });

      const subspace = await buildSubspace({
        workspaceId: workspace.id,
        type: "PUBLIC",
      });

      // Create group with user1 as member
      const group1 = await buildMemberGroup({
        workspaceId: workspace.id,
        name: "Group1",
      });
      await buildMemberGroupUser({ groupId: group1.id, userId: user1.id });

      // Create parent and child documents
      const parentDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        title: "Parent",
        authorId: user2.id,
      });

      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: parentDoc.id,
        title: "Child",
        authorId: user2.id,
      });

      // Parent: user1 has GROUP permission (EDIT via group1)
      await buildDocumentPermission({
        userId: user1.id,
        docId: parentDoc.id,
        permission: PermissionLevel.EDIT,
        inheritedFromType: PermissionInheritanceType.GROUP,
        priority: 2,
        createdById: user2.id,
        sourceGroupId: group1.id,
      });

      // Child: user1 has DIRECT permission (MANAGE) - this is an override
      await buildDocumentPermission({
        userId: user1.id,
        docId: childDoc.id,
        permission: PermissionLevel.MANAGE,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
        createdById: user2.id,
      });

      // Action: Get document collaborators
      const result = await shareService.getDocumentCollaborators(childDoc.id, user2.id);

      // Assert: user1 should have hasParentPermission=true
      const user1Share = result.find((s: any) => s.id === user1.id);
      expect(user1Share).toBeDefined();
      expect(user1Share).toMatchObject({
        id: user1.id,
        email: "user1@test.com",
        permission: { level: PermissionLevel.MANAGE },
        permissionSource: {
          level: PermissionLevel.MANAGE,
          source: "direct",
          sourceDocId: childDoc.id,
          sourceDocTitle: "Child",
          priority: 1,
        },
        hasParentPermission: true,
        parentPermissionSource: {
          level: PermissionLevel.EDIT,
          source: "inherited",
          sourceDocId: parentDoc.id,
          sourceDocTitle: "Parent",
          priority: 2,
        },
        type: "user",
      });
    });

    it("should set hasParentPermission=true when user has DIRECT override on child with DIRECT permission inherited from parent", async () => {
      // Setup
      const workspace = await buildWorkspace();
      const user1 = await buildUser({ email: "user1@test.com" });
      const user2 = await buildUser({ email: "user2@test.com" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: user1.id, role: "MEMBER" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: user2.id, role: "MEMBER" });

      const subspace = await buildSubspace({ workspaceId: workspace.id, type: "PUBLIC" });

      const parentDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        title: "Parent",
        authorId: user2.id,
      });

      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: parentDoc.id,
        title: "Child",
        authorId: user2.id,
      });

      // Parent: user1 has DIRECT EDIT
      await buildDocumentPermission({
        userId: user1.id,
        docId: parentDoc.id,
        permission: PermissionLevel.EDIT,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
        createdById: user2.id,
      });

      // Child: user1 has DIRECT READ (downgrade override)
      await buildDocumentPermission({
        userId: user1.id,
        docId: childDoc.id,
        permission: PermissionLevel.READ,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
        createdById: user2.id,
      });

      // Action
      const result = await shareService.getDocumentCollaborators(childDoc.id, user2.id);

      // Assert
      const user1Share = result.find((s: any) => s.id === user1.id);
      expect(user1Share).toMatchObject({
        hasParentPermission: true,
        permissionSource: {
          level: PermissionLevel.READ,
          source: "direct",
        },
        parentPermissionSource: {
          level: PermissionLevel.EDIT,
          source: "inherited",
          sourceDocTitle: "Parent",
        },
      });
    });

    it("should NOT set hasParentPermission when user has DIRECT permission only on child (no parent permission)", async () => {
      // Setup
      const workspace = await buildWorkspace();
      const user1 = await buildUser({ email: "user1@test.com" });
      const user2 = await buildUser({ email: "user2@test.com" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: user1.id, role: "MEMBER" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: user2.id, role: "MEMBER" });

      const subspace = await buildSubspace({ workspaceId: workspace.id, type: "PUBLIC" });

      const parentDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        title: "Parent",
        authorId: user2.id,
      });

      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: parentDoc.id,
        title: "Child",
        authorId: user2.id,
      });

      // Parent: user1 has NO permission
      // Child: user1 has DIRECT permission
      await buildDocumentPermission({
        userId: user1.id,
        docId: childDoc.id,
        permission: PermissionLevel.EDIT,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
        createdById: user2.id,
      });

      // Action
      const result = await shareService.getDocumentCollaborators(childDoc.id, user2.id);

      // Assert: hasParentPermission should be false or undefined
      const user1Share = result.find((s: any) => s.id === user1.id);
      expect(user1Share).toBeDefined();
      expect(user1Share.hasParentPermission).toBeFalsy();
      expect(user1Share.parentPermissionSource).toBeUndefined();
    });
  });

  describe("Group Override Detection", () => {
    it("should set hasParentPermission=true when group has updated permission on child", async () => {
      // Setup
      const workspace = await buildWorkspace();
      const user1 = await buildUser({ email: "user1@test.com" });
      const user2 = await buildUser({ email: "user2@test.com" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: user1.id, role: "MEMBER" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: user2.id, role: "MEMBER" });

      const subspace = await buildSubspace({ workspaceId: workspace.id, type: "PUBLIC" });

      const group1 = await buildMemberGroup({
        workspaceId: workspace.id,
        name: "Group1",
      });
      await buildMemberGroupUser({ groupId: group1.id, userId: user1.id });

      const parentDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        title: "Parent",
        authorId: user2.id,
      });

      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: parentDoc.id,
        title: "Child",
        authorId: user2.id,
      });

      // Parent: group1 has READ permission
      await buildDocumentPermission({
        userId: user1.id, // Group members get individual permission records
        docId: parentDoc.id,
        permission: PermissionLevel.READ,
        inheritedFromType: PermissionInheritanceType.GROUP,
        sourceGroupId: group1.id,
        priority: 2,
        createdById: user2.id,
      });

      // Child: group1 has MANAGE permission (override)
      await buildDocumentPermission({
        userId: user1.id,
        docId: childDoc.id,
        permission: PermissionLevel.MANAGE,
        inheritedFromType: PermissionInheritanceType.GROUP,
        sourceGroupId: group1.id,
        priority: 2,
        createdById: user2.id,
      });

      // Action
      const result = await shareService.getDocumentCollaborators(childDoc.id, user2.id);

      // Assert: group1 should show override (check the group share, not user share)
      const group1Share = result.find((s: any) => s.id === group1.id && s.type === "group");
      expect(group1Share).toBeDefined();
      expect(group1Share.hasParentPermission).toBe(true);
      expect(group1Share.parentPermissionSource).toMatchObject({
        level: PermissionLevel.READ,
        source: "inherited",
        sourceDocTitle: "Parent",
      });
    });
  });

  describe("updateSharePermission API", () => {
    it("should update user DIRECT permission and return hasParentPermission=true", async () => {
      // Setup
      const workspace = await buildWorkspace();
      const user1 = await buildUser({ email: "user1@test.com" });
      const user2 = await buildUser({ email: "user2@test.com" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: user1.id, role: "MEMBER" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: user2.id, role: "MEMBER" });

      const subspace = await buildSubspace({ workspaceId: workspace.id, type: "PUBLIC" });

      const group1 = await buildMemberGroup({
        workspaceId: workspace.id,
        name: "Group1",
      });
      await buildMemberGroupUser({ groupId: group1.id, userId: user1.id });

      const parentDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        title: "Parent",
        authorId: user2.id,
      });

      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: parentDoc.id,
        title: "Child",
        authorId: user2.id,
      });

      // Parent: user1 has GROUP EDIT
      await buildDocumentPermission({
        userId: user1.id,
        docId: parentDoc.id,
        permission: PermissionLevel.EDIT,
        inheritedFromType: PermissionInheritanceType.GROUP,
        sourceGroupId: group1.id,
        priority: 2,
        createdById: user2.id,
      });

      // Action: Update child permission to MANAGE (creates DIRECT override)
      const result = await shareService.updateSharePermission(childDoc.id, user2.id, {
        userId: user1.id,
        permission: PermissionLevel.MANAGE,
      });

      // Assert: Response should include hasParentPermission=true
      const user1Share = result.find((s: any) => s.id === user1.id);
      expect(user1Share).toBeDefined();
      expect(user1Share).toMatchObject({
        id: user1.id,
        hasParentPermission: true,
        permissionSource: {
          source: "direct",
          level: PermissionLevel.MANAGE,
        },
        parentPermissionSource: {
          source: "inherited",
          level: PermissionLevel.EDIT,
          sourceDocTitle: "Parent",
        },
      });

      // Verify database has DIRECT permission
      const directPerm = await prisma.documentPermission.findFirst({
        where: {
          userId: user1.id,
          docId: childDoc.id,
          inheritedFromType: PermissionInheritanceType.DIRECT,
        },
      });
      expect(directPerm).toBeDefined();
      expect(directPerm.permission).toBe(PermissionLevel.MANAGE);
    });

    it("should update group permission and return hasParentPermission=true for group", async () => {
      // Setup
      const workspace = await buildWorkspace();
      const user1 = await buildUser({ email: "user1@test.com" });
      const user2 = await buildUser({ email: "user2@test.com" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: user1.id, role: "MEMBER" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: user2.id, role: "MEMBER" });

      const subspace = await buildSubspace({ workspaceId: workspace.id, type: "PUBLIC" });

      const group1 = await buildMemberGroup({
        workspaceId: workspace.id,
        name: "Group1",
      });
      await buildMemberGroupUser({ groupId: group1.id, userId: user1.id });

      const parentDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        title: "Parent",
        authorId: user2.id,
      });

      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: parentDoc.id,
        title: "Child",
        authorId: user2.id,
      });

      // Parent: Share with group1 (READ)
      await shareService.shareDocument(user2.id, parentDoc.id, {
        workspaceId: workspace.id,
        targetGroupIds: [group1.id],
        permission: PermissionLevel.READ,
      });

      // Action: Update group permission on child to EDIT
      const result = await shareService.updateSharePermission(childDoc.id, user2.id, {
        groupId: group1.id,
        permission: PermissionLevel.EDIT,
      });

      // Assert: group1 should have hasParentPermission=true (check group share)
      const group1Share = result.find((s: any) => s.id === group1.id && s.type === "group");
      expect(group1Share).toBeDefined();
      expect(group1Share.hasParentPermission).toBe(true);
      expect(group1Share.permissionSource?.level).toBe(PermissionLevel.EDIT);
      expect(group1Share.parentPermissionSource?.level).toBe(PermissionLevel.READ);
    });
  });

  describe("Restore Inherited Permission (Remove Override)", () => {
    it("should remove hasParentPermission flag when DIRECT override is deleted", async () => {
      // Setup
      const workspace = await buildWorkspace();
      const user1 = await buildUser({ email: "user1@test.com" });
      const user2 = await buildUser({ email: "user2@test.com" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: user1.id, role: "MEMBER" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: user2.id, role: "MEMBER" });

      const subspace = await buildSubspace({ workspaceId: workspace.id, type: "PUBLIC" });

      const parentDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        title: "Parent",
        authorId: user2.id,
      });

      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: parentDoc.id,
        title: "Child",
        authorId: user2.id,
      });

      // Parent: user1 has DIRECT EDIT
      await buildDocumentPermission({
        userId: user1.id,
        docId: parentDoc.id,
        permission: PermissionLevel.EDIT,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
        createdById: user2.id,
      });

      // Child: user1 has DIRECT MANAGE (override)
      await buildDocumentPermission({
        userId: user1.id,
        docId: childDoc.id,
        permission: PermissionLevel.MANAGE,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
        createdById: user2.id,
      });

      // Verify override exists
      let result = await shareService.getDocumentCollaborators(childDoc.id, user2.id);
      let user1Share = result.find((s: any) => s.id === user1.id);
      expect(user1Share?.hasParentPermission).toBe(true);

      // Action: Remove override (restore inherited)
      await shareService.removeShare(childDoc.id, user2.id, { targetUserId: user1.id });

      // Assert: User still appears (inherited), but hasParentPermission should be false
      result = await shareService.getDocumentCollaborators(childDoc.id, user2.id);
      user1Share = result.find((s: any) => s.id === user1.id);
      expect(user1Share).toBeDefined();
      expect(user1Share?.permissionSource?.source).toBe("inherited");
      expect(user1Share?.permissionSource?.level).toBe(PermissionLevel.EDIT);
      expect(user1Share?.hasParentPermission).toBeFalsy(); // No override anymore
    });
  });

  describe("Edge Cases", () => {
    it("should handle user in multiple groups with different parent permissions", async () => {
      // Setup
      const workspace = await buildWorkspace();
      const user1 = await buildUser({ email: "user1@test.com" });
      const user2 = await buildUser({ email: "user2@test.com" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: user1.id, role: "MEMBER" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: user2.id, role: "MEMBER" });

      const subspace = await buildSubspace({ workspaceId: workspace.id, type: "PUBLIC" });

      // Create two groups, user1 is in both
      const group1 = await buildMemberGroup({ workspaceId: workspace.id, name: "Group1" });
      const group2 = await buildMemberGroup({ workspaceId: workspace.id, name: "Group2" });
      await buildMemberGroupUser({ groupId: group1.id, userId: user1.id });
      await buildMemberGroupUser({ groupId: group2.id, userId: user1.id });

      const parentDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        title: "Parent",
        authorId: user2.id,
      });

      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: parentDoc.id,
        title: "Child",
        authorId: user2.id,
      });

      // Parent: user1 has GROUP READ (via group1) and GROUP EDIT (via group2)
      await buildDocumentPermission({
        userId: user1.id,
        docId: parentDoc.id,
        permission: PermissionLevel.READ,
        inheritedFromType: PermissionInheritanceType.GROUP,
        sourceGroupId: group1.id,
        priority: 2,
        createdById: user2.id,
      });
      await buildDocumentPermission({
        userId: user1.id,
        docId: parentDoc.id,
        permission: PermissionLevel.EDIT,
        inheritedFromType: PermissionInheritanceType.GROUP,
        sourceGroupId: group2.id, // Second permission from group2
        priority: 2,
        createdById: user2.id,
      });

      // Child: user1 has DIRECT MANAGE
      await buildDocumentPermission({
        userId: user1.id,
        docId: childDoc.id,
        permission: PermissionLevel.MANAGE,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
        createdById: user2.id,
      });

      // Action
      const result = await shareService.getDocumentCollaborators(childDoc.id, user2.id);

      // Assert: Should show highest parent permission (EDIT)
      const user1Share = result.find((s: any) => s.id === user1.id);
      expect(user1Share?.hasParentPermission).toBe(true);
      expect(user1Share?.parentPermissionSource?.level).toBe(PermissionLevel.EDIT); // Highest from parent
    });
  });
});
