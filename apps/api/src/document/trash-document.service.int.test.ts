import { Test, TestingModule } from "@nestjs/testing";
import { DocumentTrashService } from "./trash-document.service";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { PrismaClient } from "@prisma/client";
import { ConfigsModule } from "@/_shared/config/config.module";
import { ClsModule } from "@/_shared/utils/cls.module";
import { SubspaceService } from "@/subspace/subspace.service";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { buildUser, buildWorkspace, buildWorkspaceMember, buildSubspace, buildDocument } from "@test/factories/prisma";
import { AbilityService } from "@/_shared/casl/casl.service";
import { getTestPrisma } from "@test/setup/test-container-setup";

async function createMockData(tx: PrismaClient) {
  // Create workspace
  const workspace = await buildWorkspace({ name: "Test Workspace" });

  // Create user
  const user = await buildUser({
    displayName: "Test User",
    currentWorkspaceId: workspace.id,
  });

  // Create workspace member
  await buildWorkspaceMember({
    workspaceId: workspace.id,
    userId: user.id,
    role: "MEMBER",
  });

  // Create a regular subspace
  const subspace = await buildSubspace({
    name: "Team Subspace",
    type: "WORKSPACE_WIDE",
    workspaceId: workspace.id,
    navigationTree: [],
  });

  // Create a personal subspace
  const personalSubspace = await buildSubspace({
    name: "Personal",
    type: "PERSONAL",
    workspaceId: workspace.id,
    navigationTree: [],
  });

  // Create test documents
  const rootDoc = await buildDocument({
    title: "Root Document",
    workspaceId: workspace.id,
    authorId: user.id,
    subspaceId: subspace.id,
    parentId: null,
  });

  const childDoc = await buildDocument({
    title: "Child Document",
    workspaceId: workspace.id,
    authorId: user.id,
    subspaceId: subspace.id,
    parentId: rootDoc.id,
  });

  const grandchildDoc = await buildDocument({
    title: "Grandchild Document",
    workspaceId: workspace.id,
    authorId: user.id,
    subspaceId: subspace.id,
    parentId: childDoc.id,
  });

  const personalDoc = await buildDocument({
    title: "Personal Document",
    workspaceId: workspace.id,
    authorId: user.id,
    subspaceId: personalSubspace.id,
    parentId: null,
  });

  // Initialize navigation trees
  const subspaceTree = [
    {
      id: rootDoc.id,
      type: "document",
      title: rootDoc.title,
      url: `/${rootDoc.id}`,
      workspaceId: workspace.id,
      authorId: user.id,
      children: [
        {
          id: childDoc.id,
          type: "document",
          title: childDoc.title,
          url: `/${childDoc.id}`,
          workspaceId: workspace.id,
          authorId: user.id,
          children: [
            {
              id: grandchildDoc.id,
              type: "document",
              title: grandchildDoc.title,
              url: `/${grandchildDoc.id}`,
              workspaceId: workspace.id,
              authorId: user.id,
              children: [],
            },
          ],
        },
      ],
    },
  ];

  const personalTree = [
    {
      id: personalDoc.id,
      type: "document",
      title: personalDoc.title,
      url: `/${personalDoc.id}`,
      workspaceId: workspace.id,
      authorId: user.id,
      children: [],
    },
  ];

  await tx.subspace.update({
    where: { id: subspace.id },
    data: { navigationTree: subspaceTree as any },
  });

  await tx.subspace.update({
    where: { id: personalSubspace.id },
    data: { navigationTree: personalTree as any },
  });

  return {
    workspace,
    user,
    subspace,
    personalSubspace,
    rootDoc,
    childDoc,
    grandchildDoc,
    personalDoc,
  };
}

describe("DocumentTrashService (integration)", () => {
  let service: DocumentTrashService;
  let subspaceService: SubspaceService;
  let module: TestingModule;
  let mockData: Awaited<ReturnType<typeof createMockData>>;
  let prisma: PrismaService;
  let eventPublisherMock: { publishWebsocketEvent: any };

  beforeAll(async () => {
    console.log("beforeAll in trash-document.service.int.test.ts");
    eventPublisherMock = { publishWebsocketEvent: vi.fn().mockResolvedValue(undefined) };

    // Use the same Prisma instance as factory methods
    const testPrisma = getTestPrisma();

    module = await Test.createTestingModule({
      imports: [ConfigsModule, ClsModule],
      providers: [
        DocumentTrashService,
        SubspaceService,
        { provide: PrismaService, useValue: testPrisma }, // Use test Prisma instance
        { provide: AbilityService, useValue: {} }, // Mock AbilityService
        { provide: EventPublisherService, useValue: eventPublisherMock },
      ],
    }).compile();

    service = module.get(DocumentTrashService);
    subspaceService = module.get(SubspaceService);
    prisma = module.get(PrismaService);
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    // Create fresh mock data for each test
    mockData = await createMockData(prisma);
  });

  describe("deleteDocument", () => {
    it("should soft delete a document and remove it from navigation tree", async () => {
      const docId = mockData.rootDoc.id;
      const subspaceId = mockData.subspace.id;

      // Delete the document
      const result = await service.deleteDocument(docId, mockData.user.id);

      // Verify soft delete in database
      expect(result.deletedAt).toBeDefined();
      expect(result.deletedAt).not.toBeNull();

      const deletedDoc = await prisma.doc.findUnique({ where: { id: docId } });
      expect(deletedDoc?.deletedAt).toBeDefined();
      expect(deletedDoc?.deletedAt).not.toBeNull();

      // Verify removed from navigation tree
      const updatedSubspace = await prisma.subspace.findUnique({ where: { id: subspaceId } });
      const tree = updatedSubspace?.navigationTree as any[];
      const findInTree = (nodes: any[], id: string): boolean =>
        nodes.some((node) => node.id === id || (Array.isArray(node.children) && findInTree(node.children, id)));

      expect(findInTree(tree, docId)).toBe(false);
    });

    it("should soft delete a document with children and remove entire subtree from navigation tree", async () => {
      const docId = mockData.rootDoc.id;
      const childId = mockData.childDoc.id;
      const grandchildId = mockData.grandchildDoc.id;
      const subspaceId = mockData.subspace.id;

      // Delete the root document
      await service.deleteDocument(docId, mockData.user.id);

      // Verify the entire subtree is removed from navigation tree
      const updatedSubspace = await prisma.subspace.findUnique({ where: { id: subspaceId } });
      const tree = updatedSubspace?.navigationTree as any[];
      const findInTree = (nodes: any[], id: string): boolean =>
        nodes.some((node) => node.id === id || (Array.isArray(node.children) && findInTree(node.children, id)));

      expect(findInTree(tree, docId)).toBe(false);
      expect(findInTree(tree, childId)).toBe(false);
      expect(findInTree(tree, grandchildId)).toBe(false);
    });

    it("should soft delete a personal document and remove it from personal navigation tree", async () => {
      const docId = mockData.personalDoc.id;
      const subspaceId = mockData.personalSubspace.id;

      // Delete the personal document
      await service.deleteDocument(docId, mockData.user.id);

      // Verify removed from personal navigation tree
      const updatedSubspace = await prisma.subspace.findUnique({ where: { id: subspaceId } });
      const tree = updatedSubspace?.navigationTree as any[];
      const findInTree = (nodes: any[], id: string): boolean =>
        nodes.some((node) => node.id === id || (Array.isArray(node.children) && findInTree(node.children, id)));

      expect(findInTree(tree, docId)).toBe(false);
    });

    it("should throw error when deleting non-existent document", async () => {
      const nonExistentId = uuidv4();

      await expect(service.deleteDocument(nonExistentId, mockData.user.id)).rejects.toThrow(ApiException);
    });

    it("should throw error when deleting already deleted document", async () => {
      const docId = mockData.rootDoc.id;

      // Delete once
      await service.deleteDocument(docId, mockData.user.id);

      // Try to delete again
      await expect(service.deleteDocument(docId, mockData.user.id)).rejects.toThrow(ApiException);
    });

    it("should handle deleting document without subspace (My Docs)", async () => {
      // Create a document without subspace
      const myDoc = await buildDocument({
        title: "My Doc",
        workspaceId: mockData.workspace.id,
        authorId: mockData.user.id,
        subspaceId: null,
        parentId: null,
      });

      // Delete should succeed without trying to update navigation tree
      const result = await service.deleteDocument(myDoc.id, mockData.user.id);
      expect(result.deletedAt).toBeDefined();
    });
  });

  describe("restore", () => {
    it("should restore a deleted document and add it back to navigation tree", async () => {
      const docId = mockData.rootDoc.id;
      const subspaceId = mockData.subspace.id;

      // Delete the document first
      await service.deleteDocument(docId, mockData.user.id);

      // Restore it
      const result = await service.restore(docId, mockData.user.id);

      // Verify restored in database
      expect(result.deletedAt).toBeNull();

      const restoredDoc = await prisma.doc.findUnique({ where: { id: docId } });
      expect(restoredDoc?.deletedAt).toBeNull();

      // Verify added back to navigation tree
      const updatedSubspace = await prisma.subspace.findUnique({ where: { id: subspaceId } });
      const tree = updatedSubspace?.navigationTree as any[];
      const findInTree = (nodes: any[], id: string): boolean =>
        nodes.some((node) => node.id === id || (Array.isArray(node.children) && findInTree(node.children, id)));

      expect(findInTree(tree, docId)).toBe(true);
    });

    it("should restore a document with children and add entire subtree back to navigation tree", async () => {
      const docId = mockData.rootDoc.id;
      const childId = mockData.childDoc.id;
      const subspaceId = mockData.subspace.id;

      // Delete the root document
      await service.deleteDocument(docId, mockData.user.id);

      // Manually delete children (simulating cascade delete behavior)
      await prisma.doc.update({
        where: { id: childId },
        data: { deletedAt: new Date() },
      });

      // Restore the root document
      await service.restore(docId, mockData.user.id);

      // Verify added back to navigation tree
      const updatedSubspace = await prisma.subspace.findUnique({ where: { id: subspaceId } });
      const tree = updatedSubspace?.navigationTree as any[];
      const findInTree = (nodes: any[], id: string): boolean =>
        nodes.some((node) => node.id === id || (Array.isArray(node.children) && findInTree(node.children, id)));

      expect(findInTree(tree, docId)).toBe(true);
    });

    it("should restore document to root if parent was deleted", async () => {
      const childId = mockData.childDoc.id;
      const parentId = mockData.rootDoc.id;

      // Delete parent first
      await service.deleteDocument(parentId, mockData.user.id);

      // Delete child
      await prisma.doc.update({
        where: { id: childId },
        data: { deletedAt: new Date() },
      });

      // Restore child (parent is still deleted)
      const result = await service.restore(childId, mockData.user.id);

      // Child should be moved to root (parentId = null)
      expect(result.parentId).toBeNull();

      const restoredDoc = await prisma.doc.findUnique({ where: { id: childId } });
      expect(restoredDoc?.parentId).toBeNull();
    });

    it("should restore all children when restoring a parent document", async () => {
      const rootId = mockData.rootDoc.id;
      const childId = mockData.childDoc.id;
      const grandchildId = mockData.grandchildDoc.id;

      // Delete root (which should delete all children in real scenario)
      await service.deleteDocument(rootId, mockData.user.id);

      // Manually mark children as deleted
      await prisma.doc.update({
        where: { id: childId },
        data: { deletedAt: new Date() },
      });
      await prisma.doc.update({
        where: { id: grandchildId },
        data: { deletedAt: new Date() },
      });

      // Restore root
      await service.restore(rootId, mockData.user.id);

      // All children should be restored
      const restoredChild = await prisma.doc.findUnique({ where: { id: childId } });
      const restoredGrandchild = await prisma.doc.findUnique({ where: { id: grandchildId } });

      expect(restoredChild?.deletedAt).toBeNull();
      expect(restoredGrandchild?.deletedAt).toBeNull();
    });

    it("should throw error when restoring non-existent document", async () => {
      const nonExistentId = uuidv4();

      await expect(service.restore(nonExistentId, mockData.user.id)).rejects.toThrow(ApiException);
    });

    it("should throw error when restoring non-deleted document", async () => {
      const docId = mockData.rootDoc.id;

      // Try to restore without deleting first
      await expect(service.restore(docId, mockData.user.id)).rejects.toThrow(ApiException);
    });

    it("should handle restoring document without subspace (My Docs)", async () => {
      // Create and delete a My Docs document
      const myDoc = await buildDocument({
        title: "My Doc",
        workspaceId: mockData.workspace.id,
        authorId: mockData.user.id,
        subspaceId: null,
        parentId: null,
        deletedAt: new Date(),
      });

      // Restore should succeed without trying to update navigation tree
      const result = await service.restore(myDoc.id, mockData.user.id);
      expect(result.deletedAt).toBeNull();
    });
  });

  describe("navigation tree consistency", () => {
    it("should not create duplicate nodes when deleting and restoring multiple times", async () => {
      const docId = mockData.rootDoc.id;
      const subspaceId = mockData.subspace.id;

      // Delete and restore multiple times
      for (let i = 0; i < 3; i++) {
        await service.deleteDocument(docId, mockData.user.id);
        await service.restore(docId, mockData.user.id);
      }

      // Verify no duplicates in navigation tree
      const updatedSubspace = await prisma.subspace.findUnique({ where: { id: subspaceId } });
      const tree = updatedSubspace?.navigationTree as any[];

      const countOccurrences = (nodes: any[], id: string): number => {
        let count = 0;
        for (const node of nodes) {
          if (node.id === id) count++;
          if (Array.isArray(node.children)) {
            count += countOccurrences(node.children, id);
          }
        }
        return count;
      };

      expect(countOccurrences(tree, docId)).toBe(1);
    });

    it("should preserve navigation tree structure when deleting child document", async () => {
      const childId = mockData.childDoc.id;
      const rootId = mockData.rootDoc.id;
      const subspaceId = mockData.subspace.id;

      // Delete child document
      await service.deleteDocument(childId, mockData.user.id);

      // Verify parent still exists in tree
      const updatedSubspace = await prisma.subspace.findUnique({ where: { id: subspaceId } });
      const tree = updatedSubspace?.navigationTree as any[];
      const findInTree = (nodes: any[], id: string): boolean =>
        nodes.some((node) => node.id === id || (Array.isArray(node.children) && findInTree(node.children, id)));

      expect(findInTree(tree, rootId)).toBe(true);
      expect(findInTree(tree, childId)).toBe(false);
    });

    it("should handle restoring child to correct parent in navigation tree", async () => {
      const childId = mockData.childDoc.id;
      const rootId = mockData.rootDoc.id;
      const subspaceId = mockData.subspace.id;

      // Delete child
      await service.deleteDocument(childId, mockData.user.id);

      // Restore child
      await service.restore(childId, mockData.user.id);

      // Verify child is under correct parent in tree
      const updatedSubspace = await prisma.subspace.findUnique({ where: { id: subspaceId } });
      const tree = updatedSubspace?.navigationTree as any[];

      const findParentOf = (nodes: any[], targetId: string): string | null => {
        for (const node of nodes) {
          if (Array.isArray(node.children)) {
            if (node.children.some((child: any) => child.id === targetId)) {
              return node.id;
            }
            const found = findParentOf(node.children, targetId);
            if (found) return found;
          }
        }
        return null;
      };

      expect(findParentOf(tree, childId)).toBe(rootId);
    });
  });

  describe("edge cases", () => {
    it("should handle corrupted navigation tree gracefully", async () => {
      const docId = mockData.rootDoc.id;
      const subspaceId = mockData.subspace.id;

      // Corrupt navigation tree
      await prisma.subspace.update({
        where: { id: subspaceId },
        data: { navigationTree: null },
      });

      // Delete should not throw
      await expect(service.deleteDocument(docId, mockData.user.id)).resolves.toBeDefined();
    });

    it("should handle document with no navigation tree entry", async () => {
      // Create a document that's not in the navigation tree
      const orphanDoc = await buildDocument({
        title: "Orphan Doc",
        workspaceId: mockData.workspace.id,
        authorId: mockData.user.id,
        subspaceId: mockData.subspace.id,
        parentId: null,
      });

      // Delete should succeed
      await expect(service.deleteDocument(orphanDoc.id, mockData.user.id)).resolves.toBeDefined();
    });

    it("should handle concurrent delete operations on same document", async () => {
      const docId = mockData.rootDoc.id;

      // First delete should succeed
      const promise1 = service.deleteDocument(docId, mockData.user.id);

      // Wait a bit to ensure first delete starts
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second delete should fail
      const promise2 = service.deleteDocument(docId, mockData.user.id);

      const results = await Promise.allSettled([promise1, promise2]);

      // One should succeed, one should fail
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      expect(succeeded).toBe(1);
      expect(failed).toBe(1);
    });

    it("should handle deeply nested document tree deletion", async () => {
      // Create a deep tree
      let parent = mockData.rootDoc;
      const descendants: any[] = [];

      for (let i = 0; i < 10; i++) {
        const child = await buildDocument({
          title: `Deep Doc ${i}`,
          workspaceId: mockData.workspace.id,
          authorId: mockData.user.id,
          subspaceId: mockData.subspace.id,
          parentId: parent.id,
        });
        descendants.push(child);
        parent = child;
      }

      // Delete root
      await service.deleteDocument(mockData.rootDoc.id, mockData.user.id);

      // Verify root is deleted
      const deletedRoot = await prisma.doc.findUnique({ where: { id: mockData.rootDoc.id } });
      expect(deletedRoot?.deletedAt).toBeDefined();
    });
  });

  describe("getTrash", () => {
    it("should return workspace admin's own deleted docs + non-personal subspace docs, excluding other users' personal docs", async () => {
      // Create another user with their own personal subspace doc
      const otherUser = await buildUser({
        displayName: "Other User",
        currentWorkspaceId: mockData.workspace.id,
      });

      await buildWorkspaceMember({
        workspaceId: mockData.workspace.id,
        userId: otherUser.id,
        role: "MEMBER",
      });

      const otherPersonalSubspace = await buildSubspace({
        name: "Other Personal",
        type: "PERSONAL",
        workspaceId: mockData.workspace.id,
        navigationTree: [],
      });

      const otherPersonalDoc = await buildDocument({
        title: "Other User Personal Doc",
        workspaceId: mockData.workspace.id,
        authorId: otherUser.id,
        subspaceId: otherPersonalSubspace.id,
        parentId: null,
        deletedAt: new Date(),
        deletedById: otherUser.id,
      });

      // Make user a workspace admin
      await prisma.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId: mockData.workspace.id,
            userId: mockData.user.id,
          },
        },
        data: { role: "ADMIN" },
      });

      // Delete user's own documents
      await service.deleteDocument(mockData.rootDoc.id, mockData.user.id);
      await service.deleteDocument(mockData.personalDoc.id, mockData.user.id);

      // Get trash
      const trash = await service.getTrash(mockData.user.id);

      // Should include user's own deleted documents
      expect(trash.some((doc) => doc.id === mockData.rootDoc.id)).toBe(true);
      expect(trash.some((doc) => doc.id === mockData.personalDoc.id)).toBe(true);

      // Should NOT include other user's personal subspace doc
      expect(trash.some((doc) => doc.id === otherPersonalDoc.id)).toBe(false);
    });

    it("should return workspace admin can see other users' deleted docs in non-personal subspaces", async () => {
      // Create another user
      const otherUser = await buildUser({
        displayName: "Other User",
        currentWorkspaceId: mockData.workspace.id,
      });

      await buildWorkspaceMember({
        workspaceId: mockData.workspace.id,
        userId: otherUser.id,
        role: "MEMBER",
      });

      // Create a deleted doc in non-personal subspace authored by other user
      const otherDoc = await buildDocument({
        title: "Other User Doc in Team Subspace",
        workspaceId: mockData.workspace.id,
        authorId: otherUser.id,
        subspaceId: mockData.subspace.id, // Team subspace (WORKSPACE_WIDE)
        parentId: null,
        deletedAt: new Date(),
        deletedById: otherUser.id,
      });

      // Make user a workspace admin
      await prisma.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId: mockData.workspace.id,
            userId: mockData.user.id,
          },
        },
        data: { role: "ADMIN" },
      });

      // Get trash
      const trash = await service.getTrash(mockData.user.id);

      // Workspace admin SHOULD see other user's deleted doc in non-personal subspace
      expect(trash.some((doc) => doc.id === otherDoc.id)).toBe(true);
    });

    it("should return only user's deleted documents for regular member", async () => {
      // Delete user's document
      await service.deleteDocument(mockData.rootDoc.id, mockData.user.id);

      // Create another user and delete their document
      const otherUser = await buildUser({
        displayName: "Other User",
        currentWorkspaceId: mockData.workspace.id,
      });

      const otherDoc = await buildDocument({
        title: "Other Doc",
        workspaceId: mockData.workspace.id,
        authorId: otherUser.id,
        subspaceId: mockData.subspace.id,
        parentId: null,
        deletedAt: new Date(),
      });

      // Get trash (user is regular member)
      const trash = await service.getTrash(mockData.user.id);

      // Should only include user's deleted documents
      expect(trash.some((doc) => doc.id === mockData.rootDoc.id)).toBe(true);
      expect(trash.some((doc) => doc.id === otherDoc.id)).toBe(false);
    });
  });
});
