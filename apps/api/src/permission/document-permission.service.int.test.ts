import { Test, TestingModule } from "@nestjs/testing";
import { DocPermissionResolveService } from "./document-permission.service";
import { getTestPrisma, clearDatabase, startContainersAndWriteEnv, stopContainers } from "@test/setup/test-container-setup";
import { buildDocument, buildUser, buildWorkspace, buildWorkspaceMember, buildSubspace, buildDocumentPermission } from "@test/factories/prisma";
import { PermissionLevel, PermissionInheritanceType } from "@idea/contracts";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";

describe("DocPermissionResolveService", () => {
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

  describe("resolveUserPermissionForDocument", () => {
    it("should return NONE when user has no permissions", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace();
      const doc = await buildDocument({ workspaceId: workspace.id });

      const result = await service.resolveUserPermissionForDocument(user.id, {
        id: doc.id,
        workspaceId: workspace.id,
        subspaceId: doc.subspaceId,
      });

      expect(result).toBe(PermissionLevel.NONE);
    });

    it("should return direct document permission when user has direct access", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace();
      const doc = await buildDocument({ workspaceId: workspace.id });

      await buildDocumentPermission({
        userId: user.id,
        docId: doc.id,
        permission: PermissionLevel.READ,
        inheritedFromType: PermissionInheritanceType.DIRECT,
      });

      const result = await service.resolveUserPermissionForDocument(user.id, {
        id: doc.id,
        workspaceId: workspace.id,
        subspaceId: doc.subspaceId,
      });

      expect(result).toBe(PermissionLevel.READ);
    });

    it("should return inherited permission from parent document", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace();

      // Create parent document with user permission
      const parentDoc = await buildDocument({ workspaceId: workspace.id });
      await buildDocumentPermission({
        userId: user.id,
        docId: parentDoc.id,
        permission: PermissionLevel.EDIT,
        inheritedFromType: PermissionInheritanceType.DIRECT,
      });

      // Create child document
      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        parentId: parentDoc.id,
      });

      const result = await service.resolveUserPermissionForDocument(user.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: childDoc.subspaceId,
      });

      expect(result).toBe(PermissionLevel.EDIT);
    });

    it("should traverse multiple levels of parent-child hierarchy", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace();

      // Create grandparent document with user permission
      const grandparentDoc = await buildDocument({ workspaceId: workspace.id });
      await buildDocumentPermission({
        userId: user.id,
        docId: grandparentDoc.id,
        permission: PermissionLevel.MANAGE,
        inheritedFromType: PermissionInheritanceType.DIRECT,
      });

      // Create parent document
      const parentDoc = await buildDocument({
        workspaceId: workspace.id,
        parentId: grandparentDoc.id,
      });

      // Create child document
      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        parentId: parentDoc.id,
      });

      const result = await service.resolveUserPermissionForDocument(user.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: childDoc.subspaceId,
      });

      expect(result).toBe(PermissionLevel.MANAGE);
    });

    it("should prioritize direct permission over inherited permission", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace();

      // Create parent document with user permission
      const parentDoc = await buildDocument({ workspaceId: workspace.id });
      await buildDocumentPermission({
        userId: user.id,
        docId: parentDoc.id,
        permission: PermissionLevel.EDIT,
        inheritedFromType: PermissionInheritanceType.DIRECT,
      });

      // Create child document with higher direct permission
      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        parentId: parentDoc.id,
      });
      await buildDocumentPermission({
        userId: user.id,
        docId: childDoc.id,
        permission: PermissionLevel.MANAGE,
        inheritedFromType: PermissionInheritanceType.DIRECT,
      });

      const result = await service.resolveUserPermissionForDocument(user.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: childDoc.subspaceId,
      });

      expect(result).toBe(PermissionLevel.MANAGE);
    });

    it("should handle circular parent-child relationships gracefully", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace();

      // Create document A
      const docA = await buildDocument({ workspaceId: workspace.id });
      // Create document B with A as parent
      const docB = await buildDocument({
        workspaceId: workspace.id,
        parentId: docA.id,
      });

      // Create circular reference (A's parent is B) - this would normally be prevented by DB constraints
      // For testing, we'll manually set this (in real scenarios, this should be prevented)
      await prisma.doc.update({
        where: { id: docA.id },
        data: { parentId: docB.id },
      });

      // Add permission to docB
      await buildDocumentPermission({
        userId: user.id,
        docId: docB.id,
        permission: PermissionLevel.READ,
        inheritedFromType: PermissionInheritanceType.DIRECT,
      });

      // Test that it finds the inherited permission from docB and returns READ
      // The circular reference detection is a safety mechanism but doesn't affect this valid inheritance
      const result = await service.resolveUserPermissionForDocument(user.id, {
        id: docA.id,
        workspaceId: workspace.id,
        subspaceId: docA.subspaceId,
      });

      // Should return READ inherited from parent docB
      expect(result).toBe(PermissionLevel.READ);
    });

    it("should handle deep hierarchy without infinite loops", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace();

      // Create a chain of 30 documents (exceeding the maxDepth limit of 25)
      let parentId: string | undefined;
      const deepDoc = await buildDocument({ workspaceId: workspace.id });

      for (let i = 0; i < 30; i++) {
        const doc = await buildDocument({
          workspaceId: workspace.id,
          parentId: parentId,
        });
        parentId = doc.id;
      }

      // Add permission to the root document
      await buildDocumentPermission({
        userId: user.id,
        docId: deepDoc.id,
        permission: PermissionLevel.READ,
        inheritedFromType: PermissionInheritanceType.DIRECT,
      });

      const result = await service.resolveUserPermissionForDocument(user.id, {
        id: parentId!,
        workspaceId: workspace.id,
        subspaceId: undefined,
      });

      // Should return NONE due to depth limit being exceeded
      expect(result).toBe(PermissionLevel.NONE);
    });

    it("should work with subspace permissions when no direct or inherited permissions exist", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace();

      // Create subspace with explicit permission values to avoid random generation
      const subspace = await buildSubspace({
        workspaceId: workspace.id,
        subspaceAdminPermission: PermissionLevel.MANAGE,
        subspaceMemberPermission: PermissionLevel.MANAGE,
        nonSubspaceMemberPermission: PermissionLevel.COMMENT,
      });

      // Make user a workspace member (but NOT a subspace member)
      await buildWorkspaceMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: "MEMBER",
      });

      // Create document in subspace with a different author
      const author = await buildUser();
      const doc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        authorId: author.id,
        createdById: author.id,
        lastModifiedById: author.id,
      });

      const result = await service.resolveUserPermissionForDocument(user.id, {
        id: doc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });

      expect(result).toBe(PermissionLevel.COMMENT);
    });

    it("should prioritize inherited permissions over subspace permissions", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace();
      const subspace = await buildSubspace({ workspaceId: workspace.id });

      // Make user a workspace member
      await buildWorkspaceMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: "MEMBER",
      });

      // Create parent document with permission
      const parentDoc = await buildDocument({ workspaceId: workspace.id });
      await buildDocumentPermission({
        userId: user.id,
        docId: parentDoc.id,
        permission: PermissionLevel.EDIT,
        inheritedFromType: PermissionInheritanceType.DIRECT,
      });

      // Create child document in subspace
      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        subspaceId: subspace.id,
        parentId: parentDoc.id,
      });

      // Set lower subspace permissions
      await prisma.subspace.update({
        where: { id: subspace.id },
        data: {
          subspaceMemberPermission: PermissionLevel.READ,
        },
      });

      const result = await service.resolveUserPermissionForDocument(user.id, {
        id: childDoc.id,
        workspaceId: workspace.id,
        subspaceId: subspace.id,
      });

      // Should return inherited permission (EDIT) over subspace permission (READ)
      expect(result).toBe(PermissionLevel.EDIT);
    });
  });
});
