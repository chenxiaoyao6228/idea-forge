import { Test, TestingModule } from "@nestjs/testing";
import { DocPermissionResolveService } from "./document-permission.service";
import { getTestPrisma, clearDatabase, startContainersAndWriteEnv, stopContainers } from "@test/setup/test-container-setup";
import { buildDocument, buildUser, buildWorkspace, buildWorkspaceMember, buildSubspace, buildDocumentPermission } from "@test/factories/prisma";
import { PermissionLevel, PermissionInheritanceType } from "@idea/contracts";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";

describe("Parent-Child Document Permission Inheritance", () => {
  let service: DocPermissionResolveService;
  let prisma: any;

  beforeAll(async () => {
    await startContainersAndWriteEnv();
    prisma = getTestPrisma();
  });

  afterAll(async () => {
    await stopContainers();
  });

  beforeEach(async () => {
    await clearDatabase();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocPermissionResolveService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<DocPermissionResolveService>(DocPermissionResolveService);
  });

  describe("Basic Parent-Child Permission Inheritance in Public/Workspace-Wide Subspace", () => {
    it("should inherit parent permissions to child when parent is shared with user A, B, C", async () => {
      const workspace = await buildWorkspace();

      // Create users A, B, C
      const userA = await buildUser({ email: "userA@test.com" });
      const userB = await buildUser({ email: "userB@test.com" });
      const userC = await buildUser({ email: "userC@test.com" });

      // Create public/workspace-wide subspace
      const subspace = await buildSubspace({
        workspaceId: workspace.id,
        type: "PUBLIC",
        subspaceAdminPermission: PermissionLevel.MANAGE,
        subspaceMemberPermission: PermissionLevel.EDIT,
        nonSubspaceMemberPermission: PermissionLevel.READ,
      });

      // Make users workspace members
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: userA.id, role: "MEMBER" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: userB.id, role: "MEMBER" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: userC.id, role: "MEMBER" });

      // Create parent document
      const parentDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        title: "Parent Document",
      });

      // Share parent with users A, B, C (DIRECT permissions)
      await buildDocumentPermission({
        userId: userA.id,
        docId: parentDoc.id,
        permission: PermissionLevel.EDIT,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
      });

      await buildDocumentPermission({
        userId: userB.id,
        docId: parentDoc.id,
        permission: PermissionLevel.READ,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
      });

      await buildDocumentPermission({
        userId: userC.id,
        docId: parentDoc.id,
        permission: PermissionLevel.COMMENT,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
      });

      // Create child document
      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: parentDoc.id,
        title: "Child Document",
      });

      // Verify inheritance: Child should inherit parent permissions
      const resultA = await service.resolveUserPermissionForDocument(userA.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(resultA.level).toBe(PermissionLevel.EDIT);
      expect(resultA.source).toBe("inherited");
      expect(resultA.sourceDocId).toBe(parentDoc.id);

      const resultB = await service.resolveUserPermissionForDocument(userB.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(resultB.level).toBe(PermissionLevel.READ);
      expect(resultB.source).toBe("inherited");

      const resultC = await service.resolveUserPermissionForDocument(userC.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(resultC.level).toBe(PermissionLevel.COMMENT);
      expect(resultC.source).toBe("inherited");
    });

    it("should handle group permissions on parent and inherit to child", async () => {
      const workspace = await buildWorkspace();

      // Create users B and C who are in groupA
      const userB = await buildUser({ email: "userB@test.com" });
      const userC = await buildUser({ email: "userC@test.com" });

      // Create public subspace
      const subspace = await buildSubspace({
        workspaceId: workspace.id,
        type: "PUBLIC",
        subspaceAdminPermission: PermissionLevel.MANAGE,
        subspaceMemberPermission: PermissionLevel.EDIT,
        nonSubspaceMemberPermission: PermissionLevel.READ,
      });

      // Make users workspace members
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: userB.id, role: "MEMBER" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: userC.id, role: "MEMBER" });

      // Create group A with users B and C
      const groupA = await prisma.memberGroup.create({
        data: {
          name: "Group A",
          workspaceId: workspace.id,
        },
      });

      await prisma.memberGroupUser.create({
        data: {
          groupId: groupA.id,
          userId: userB.id,
        },
      });

      await prisma.memberGroupUser.create({
        data: {
          groupId: groupA.id,
          userId: userC.id,
        },
      });

      // Create parent document
      const parentDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        title: "Parent Document",
      });

      // Grant group permission to groupA on parent (GROUP permission)
      await buildDocumentPermission({
        userId: userB.id,
        docId: parentDoc.id,
        permission: PermissionLevel.EDIT,
        inheritedFromType: PermissionInheritanceType.GROUP,
        priority: 2,
      });

      await buildDocumentPermission({
        userId: userC.id,
        docId: parentDoc.id,
        permission: PermissionLevel.EDIT,
        inheritedFromType: PermissionInheritanceType.GROUP,
        priority: 2,
      });

      // Create child document
      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: parentDoc.id,
        title: "Child Document",
      });

      // Verify inheritance: Child should inherit group permissions from parent
      const resultB = await service.resolveUserPermissionForDocument(userB.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(resultB.level).toBe(PermissionLevel.EDIT);

      const resultC = await service.resolveUserPermissionForDocument(userC.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(resultC.level).toBe(PermissionLevel.EDIT);
    });

    it("should combine direct and group permissions correctly - user C has both", async () => {
      const workspace = await buildWorkspace();

      // Create users
      const userA = await buildUser({ email: "userA@test.com" });
      const userB = await buildUser({ email: "userB@test.com" });
      const userC = await buildUser({ email: "userC@test.com" });

      // Create public subspace
      const subspace = await buildSubspace({
        workspaceId: workspace.id,
        type: "PUBLIC",
      });

      // Make users workspace members
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: userA.id, role: "MEMBER" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: userB.id, role: "MEMBER" });
      await buildWorkspaceMember({ workspaceId: workspace.id, userId: userC.id, role: "MEMBER" });

      // Create group A with users B and C
      const groupA = await prisma.memberGroup.create({
        data: {
          name: "Group A",
          workspaceId: workspace.id,
        },
      });

      await prisma.memberGroupUser.createMany({
        data: [
          { groupId: groupA.id, userId: userB.id },
          { groupId: groupA.id, userId: userC.id },
        ],
      });

      // Create parent document
      const parentDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        title: "Parent Document",
      });

      // User A: Direct permission (READ)
      await buildDocumentPermission({
        userId: userA.id,
        docId: parentDoc.id,
        permission: PermissionLevel.READ,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
      });

      // User B: Group permission (EDIT)
      await buildDocumentPermission({
        userId: userB.id,
        docId: parentDoc.id,
        permission: PermissionLevel.EDIT,
        inheritedFromType: PermissionInheritanceType.GROUP,
        priority: 2,
      });

      // User C: Both group permission (EDIT) and direct permission (MANAGE)
      // Direct should win due to higher priority (priority 1 > priority 2)
      await buildDocumentPermission({
        userId: userC.id,
        docId: parentDoc.id,
        permission: PermissionLevel.EDIT,
        inheritedFromType: PermissionInheritanceType.GROUP,
        priority: 2,
      });

      await buildDocumentPermission({
        userId: userC.id,
        docId: parentDoc.id,
        permission: PermissionLevel.MANAGE,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
      });

      // Create child document
      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: parentDoc.id,
        title: "Child Document",
      });

      // Verify parent permissions first
      const parentA = await service.resolveUserPermissionForDocument(userA.id, {
        id: parentDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(parentA.level).toBe(PermissionLevel.READ);

      const parentB = await service.resolveUserPermissionForDocument(userB.id, {
        id: parentDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(parentB.level).toBe(PermissionLevel.EDIT);

      const parentC = await service.resolveUserPermissionForDocument(userC.id, {
        id: parentDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(parentC.level).toBe(PermissionLevel.MANAGE); // Direct wins over Group

      // Verify inheritance: Child should inherit from parent
      const childA = await service.resolveUserPermissionForDocument(userA.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(childA.level).toBe(PermissionLevel.READ);

      const childB = await service.resolveUserPermissionForDocument(userB.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(childB.level).toBe(PermissionLevel.EDIT);

      const childC = await service.resolveUserPermissionForDocument(userC.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(childC.level).toBe(PermissionLevel.MANAGE);
    });
  });

  describe("Inherited Permission Override on Child Documents", () => {
    it("should allow child to override inherited permission with direct permission", async () => {
      const workspace = await buildWorkspace();
      const userA = await buildUser({ email: "userA@test.com" });

      const subspace = await buildSubspace({
        workspaceId: workspace.id,
        type: "PUBLIC",
      });

      await buildWorkspaceMember({ workspaceId: workspace.id, userId: userA.id, role: "MEMBER" });

      // Create parent with READ permission for user A
      const parentDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        title: "Parent Document",
      });

      await buildDocumentPermission({
        userId: userA.id,
        docId: parentDoc.id,
        permission: PermissionLevel.READ,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
      });

      // Create child document
      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: parentDoc.id,
        title: "Child Document",
      });

      // Verify child inherits READ from parent
      const inheritedPermission = await service.resolveUserPermissionForDocument(userA.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(inheritedPermission.level).toBe(PermissionLevel.READ);

      // Override child with MANAGE permission (direct override)
      await buildDocumentPermission({
        userId: userA.id,
        docId: childDoc.id,
        permission: PermissionLevel.MANAGE,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
      });

      // Verify child now has MANAGE (overridden)
      const overriddenPermission = await service.resolveUserPermissionForDocument(userA.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(overriddenPermission.level).toBe(PermissionLevel.MANAGE);
    });

    it("should allow child to override inherited permission with group permission", async () => {
      const workspace = await buildWorkspace();
      const userB = await buildUser({ email: "userB@test.com" });

      const subspace = await buildSubspace({
        workspaceId: workspace.id,
        type: "PUBLIC",
      });

      await buildWorkspaceMember({ workspaceId: workspace.id, userId: userB.id, role: "MEMBER" });

      // Create group
      const group = await prisma.memberGroup.create({
        data: {
          name: "Test Group",
          workspaceId: workspace.id,
        },
      });

      await prisma.memberGroupUser.create({
        data: {
          groupId: group.id,
          userId: userB.id,
        },
      });

      // Create parent with EDIT permission for user B (direct)
      const parentDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        title: "Parent Document",
      });

      await buildDocumentPermission({
        userId: userB.id,
        docId: parentDoc.id,
        permission: PermissionLevel.EDIT,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
      });

      // Create child document
      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: parentDoc.id,
        title: "Child Document",
      });

      // Verify child inherits EDIT from parent
      const inheritedPermission = await service.resolveUserPermissionForDocument(userB.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(inheritedPermission.level).toBe(PermissionLevel.EDIT);

      // Override child with READ via group permission
      await buildDocumentPermission({
        userId: userB.id,
        docId: childDoc.id,
        permission: PermissionLevel.READ,
        inheritedFromType: PermissionInheritanceType.GROUP,
        priority: 2,
      });

      // Child still has EDIT because direct parent permission (priority 1) beats child group permission (priority 2)
      // This is because inheritance check happens BEFORE direct child permissions in the resolution order
      // Wait - let me re-check the code...
      // Actually, direct document-level permissions are checked FIRST (line 32-39)
      // So child's GROUP permission should be returned
      const childPermission = await service.resolveUserPermissionForDocument(userB.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(childPermission.level).toBe(PermissionLevel.READ);
    });

    it("should prioritize child direct permission over inherited parent permission", async () => {
      const workspace = await buildWorkspace();
      const userC = await buildUser({ email: "userC@test.com" });

      const subspace = await buildSubspace({
        workspaceId: workspace.id,
        type: "PUBLIC",
      });

      await buildWorkspaceMember({ workspaceId: workspace.id, userId: userC.id, role: "MEMBER" });

      // Create parent with MANAGE permission for user C
      const parentDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        title: "Parent Document",
      });

      await buildDocumentPermission({
        userId: userC.id,
        docId: parentDoc.id,
        permission: PermissionLevel.MANAGE,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
      });

      // Create child document with direct READ permission (downgrade)
      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: parentDoc.id,
        title: "Child Document",
      });

      await buildDocumentPermission({
        userId: userC.id,
        docId: childDoc.id,
        permission: PermissionLevel.READ,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
      });

      // Child should have READ (direct child permission overrides inherited MANAGE)
      const childPermission = await service.resolveUserPermissionForDocument(userC.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(childPermission.level).toBe(PermissionLevel.READ);
    });

    it("should support restoring inherited permission by removing child override", async () => {
      const workspace = await buildWorkspace();
      const userA = await buildUser({ email: "userA@test.com" });

      const subspace = await buildSubspace({
        workspaceId: workspace.id,
        type: "PUBLIC",
      });

      await buildWorkspaceMember({ workspaceId: workspace.id, userId: userA.id, role: "MEMBER" });

      // Create parent with EDIT permission
      const parentDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        title: "Parent Document",
      });

      await buildDocumentPermission({
        userId: userA.id,
        docId: parentDoc.id,
        permission: PermissionLevel.EDIT,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
      });

      // Create child with override (READ)
      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: parentDoc.id,
        title: "Child Document",
      });

      const childOverride = await buildDocumentPermission({
        userId: userA.id,
        docId: childDoc.id,
        permission: PermissionLevel.READ,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
      });

      // Verify override is active (READ)
      const overridden = await service.resolveUserPermissionForDocument(userA.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(overridden.level).toBe(PermissionLevel.READ);

      // Remove the child override to "restore inherited"
      await prisma.documentPermission.delete({
        where: { id: childOverride.id },
      });

      // Verify child now inherits EDIT from parent
      const restored = await service.resolveUserPermissionForDocument(userA.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(restored.level).toBe(PermissionLevel.EDIT);
    });
  });

  describe("Multi-level Inheritance with Overrides", () => {
    it("should handle grandparent -> parent -> child inheritance correctly", async () => {
      const workspace = await buildWorkspace();
      const userA = await buildUser({ email: "userA@test.com" });

      const subspace = await buildSubspace({
        workspaceId: workspace.id,
        type: "PUBLIC",
      });

      await buildWorkspaceMember({ workspaceId: workspace.id, userId: userA.id, role: "MEMBER" });

      // Create grandparent with MANAGE permission
      const grandparentDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        title: "Grandparent Document",
      });

      await buildDocumentPermission({
        userId: userA.id,
        docId: grandparentDoc.id,
        permission: PermissionLevel.MANAGE,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
      });

      // Create parent (no explicit permission - should inherit MANAGE)
      const parentDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: grandparentDoc.id,
        title: "Parent Document",
      });

      // Create child (no explicit permission - should inherit MANAGE)
      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: parentDoc.id,
        title: "Child Document",
      });

      // Verify all inherit MANAGE from grandparent
      const parentPermission = await service.resolveUserPermissionForDocument(userA.id, {
        id: parentDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(parentPermission.level).toBe(PermissionLevel.MANAGE);

      const childPermission = await service.resolveUserPermissionForDocument(userA.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(childPermission.level).toBe(PermissionLevel.MANAGE);
    });

    it("should find closest ancestor permission when multiple ancestors have permissions", async () => {
      const workspace = await buildWorkspace();
      const userA = await buildUser({ email: "userA@test.com" });

      const subspace = await buildSubspace({
        workspaceId: workspace.id,
        type: "PUBLIC",
      });

      await buildWorkspaceMember({ workspaceId: workspace.id, userId: userA.id, role: "MEMBER" });

      // Create grandparent with MANAGE permission
      const grandparentDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        title: "Grandparent Document",
      });

      await buildDocumentPermission({
        userId: userA.id,
        docId: grandparentDoc.id,
        permission: PermissionLevel.MANAGE,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
      });

      // Create parent with EDIT permission (should override grandparent for descendants)
      const parentDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: grandparentDoc.id,
        title: "Parent Document",
      });

      await buildDocumentPermission({
        userId: userA.id,
        docId: parentDoc.id,
        permission: PermissionLevel.EDIT,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
      });

      // Create child (no explicit permission)
      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: parentDoc.id,
        title: "Child Document",
      });

      // Child should inherit EDIT from closest ancestor (parent), not MANAGE from grandparent
      const childPermission = await service.resolveUserPermissionForDocument(userA.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });
      expect(childPermission.level).toBe(PermissionLevel.EDIT);
    });
  });
});
