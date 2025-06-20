import { MoveDocumentService } from "./move-document.service";
import { EventPublisherService } from "../_shared/events/event-publisher.service";
import { PermissionInheritanceService } from "../permission/permission-inheritance.service";
import { PermissionService } from "../permission/permission.service";
import { ServiceTestBuilder } from "@test/helpers/create-unit-integration-app";
import { getTestPrisma } from "@test/setup/test-container-setup";
import { generateFractionalIndex } from "@/_shared/utils/fractional-index";
import { v4 as uuidv4 } from "uuid";
import { setupMocks } from "@test/setup/mock-setup";

async function createComplexMockData() {
  const prisma = getTestPrisma();

  // Generate UUIDs for all entities
  const workspaceId = uuidv4();
  const userId = uuidv4();
  const subspace1Id = uuidv4();
  const subspace2Id = uuidv4();
  const myDocsRoot1Id = uuidv4();
  const myDocsRoot2Id = uuidv4();
  const myDocsChild1Id = uuidv4();
  const myDocsChild2Id = uuidv4();
  const subspace1RootId = uuidv4();
  const subspace2RootId = uuidv4();

  // Create workspace and user
  const workspace = await prisma.workspace.create({
    data: { id: workspaceId, name: "Test Workspace" },
  });
  const user = await prisma.user.create({
    data: { id: userId, displayName: "Test User", email: `${userId}@test.com` },
  });

  // Create subspaces
  const subspace1 = await prisma.subspace.create({
    data: {
      id: subspace1Id,
      name: "Engineering",
      workspaceId: workspace.id,
      navigationTree: [],
    },
  });
  const subspace2 = await prisma.subspace.create({
    data: {
      id: subspace2Id,
      name: "Marketing",
      workspaceId: workspace.id,
      navigationTree: [],
    },
  });
  const subspaces = [subspace1, subspace2];

  // MyDocs: 2 roots, each with 1 child
  const myDocsRoot1 = await prisma.doc.create({
    data: {
      id: myDocsRoot1Id,
      title: "Root 1",
      index: "a",
      workspaceId: workspace.id,
      authorId: user.id,
      createdById: user.id,
      lastModifiedById: user.id,
      subspaceId: null,
      parentId: null,
    },
  });
  const myDocsRoot2 = await prisma.doc.create({
    data: {
      id: myDocsRoot2Id,
      title: "Root 2",
      index: "b",
      workspaceId: workspace.id,
      authorId: user.id,
      createdById: user.id,
      lastModifiedById: user.id,
      subspaceId: null,
      parentId: null,
    },
  });
  const myDocsChild1 = await prisma.doc.create({
    data: {
      id: myDocsChild1Id,
      title: "Child 1",
      index: "a",
      workspaceId: workspace.id,
      authorId: user.id,
      createdById: user.id,
      lastModifiedById: user.id,
      subspaceId: null,
      parentId: myDocsRoot1.id,
    },
  });
  const myDocsChild2 = await prisma.doc.create({
    data: {
      id: myDocsChild2Id,
      title: "Child 2",
      index: "a",
      workspaceId: workspace.id,
      authorId: user.id,
      createdById: user.id,
      lastModifiedById: user.id,
      subspaceId: null,
      parentId: myDocsRoot2.id,
    },
  });
  const myDocsDocuments = [myDocsRoot1, myDocsRoot2, myDocsChild1, myDocsChild2];

  // Subspace docs: 1 root per subspace
  const subspace1Root = await prisma.doc.create({
    data: {
      id: subspace1RootId,
      title: "S1 Root",
      index: "a",
      workspaceId: workspace.id,
      authorId: user.id,
      createdById: user.id,
      lastModifiedById: user.id,
      subspaceId: subspace1.id,
      parentId: null,
    },
  });
  const subspace2Root = await prisma.doc.create({
    data: {
      id: subspace2RootId,
      title: "S2 Root",
      index: "a",
      workspaceId: workspace.id,
      authorId: user.id,
      createdById: user.id,
      lastModifiedById: user.id,
      subspaceId: subspace2.id,
      parentId: null,
    },
  });
  const subspaceDocuments = {
    [subspace1Id]: [subspace1Root],
    [subspace2Id]: [subspace2Root],
  };
  const allDocuments = {
    "mydocs-root-1": myDocsRoot1,
    "mydocs-root-2": myDocsRoot2,
    "mydocs-child-1": myDocsChild1,
    "mydocs-child-2": myDocsChild2,
    "subspace1-root": subspace1Root,
    "subspace2-root": subspace2Root,
  };
  return {
    workspace,
    user,
    subspaces,
    myDocsDocuments,
    subspaceDocuments,
    allDocuments,
    ids: {
      workspaceId,
      userId,
      subspace1Id,
      subspace2Id,
      myDocsRoot1Id,
      myDocsRoot2Id,
      myDocsChild1Id,
      myDocsChild2Id,
      subspace1RootId,
      subspace2RootId,
    },
  };
}

describe("MoveDocumentService (integration)", () => {
  let service: MoveDocumentService;
  let ctx: any;
  let mockData: Awaited<ReturnType<typeof createComplexMockData>>;

  beforeAll(async () => {
    await setupMocks();
  });

  beforeEach(async () => {
    mockData = await createComplexMockData();
    ctx = await new ServiceTestBuilder(MoveDocumentService)
      .withPrisma()
      .withProvider({
        provide: EventPublisherService,
        useValue: { publishWebsocketEvent: vi.fn() },
      })
      .withProvider({
        provide: PermissionInheritanceService,
        useValue: {
          updatePermissionsOnMove: vi.fn().mockResolvedValue(undefined),
        },
      })
      .withProvider({
        provide: PermissionService,
        useValue: {
          getResourcePermissionAbilities: vi.fn().mockResolvedValue({ read: true, write: true }),
        },
      })
      .compile();
    service = ctx.service;
  });

  afterEach(async () => {
    if (ctx) await ctx.close();
  });

  it("should handle deep nesting reparenting in mydocs", async () => {
    const prisma = getTestPrisma();
    // Find a doc whose parent is not the target parent and is not root
    const targetParent = mockData.myDocsDocuments[1];
    const sourceDoc = mockData.myDocsDocuments.find((doc) => doc.parentId && doc.parentId !== targetParent.id && doc.id !== targetParent.id);
    if (!sourceDoc) throw new Error("No suitable sourceDoc found for reparenting test");

    // Find siblings of the target parent to determine the correct index
    const siblings = await prisma.doc.findMany({
      where: { parentId: targetParent.id, subspaceId: null },
      orderBy: { index: "asc" },
    });

    // Place at the end of the children
    const lastIndex = siblings.length > 0 ? siblings[siblings.length - 1].index : null;
    const newIndex = generateFractionalIndex(lastIndex, null);
    // Record old parentId before the move
    const oldParentId = sourceDoc.parentId;
    console.log("sourceDoc.id:", sourceDoc.id, "oldParentId:", oldParentId, "targetParent.id:", targetParent.id);
    const result = await service.moveDocs(mockData.user.id, {
      id: sourceDoc.id,
      subspaceId: null,
      parentId: targetParent.id,
      index: newIndex,
    });
    expect(result.data.documents[0].parentId).toBe(targetParent.id);

    // DB assertion: check parentId in DB
    const updatedDoc = await prisma.doc.findUnique({
      where: { id: sourceDoc.id },
    });
    expect(updatedDoc?.parentId).toBe(targetParent.id);

    // Check the old parent no longer has the sourceDoc as a child
    if (oldParentId && oldParentId !== targetParent.id) {
      const oldSiblings = await prisma.doc.findMany({
        where: { parentId: oldParentId },
      });
      expect(oldSiblings.map((d) => d.id)).not.toContain(sourceDoc.id);
    }

    //  Check the children of the new parent
    const children = await prisma.doc.findMany({
      where: { parentId: targetParent.id },
    });
    expect(children.map((c) => c.id)).toContain(sourceDoc.id);
  });

  it("should reorder root level documents in mydocs", async () => {
    // Use an existing root doc
    const sourceDoc = mockData.allDocuments["mydocs-root-2"];
    const result = await service.moveDocs(mockData.user.id, {
      id: sourceDoc.id,
      subspaceId: null,
      parentId: null,
      index: "ab",
    });
    expect(result.data.documents[0].id).toBe(sourceDoc.id);
    expect(result.data.documents).toHaveLength(1);

    // DB assertion: check index in DB
    const prisma = getTestPrisma();
    const updatedDoc = await prisma.doc.findUnique({
      where: { id: sourceDoc.id },
    });
    expect(updatedDoc?.index?.startsWith("ab")).toBe(true);
    // Optionally, check all root docs' order
    const rootDocs = await prisma.doc.findMany({
      where: { parentId: null, subspaceId: null },
      orderBy: { index: "asc" },
    });
    expect(rootDocs.map((d) => d.id)).toContain(sourceDoc.id);
  });

  it("should move document from subspace to my-docs (draft), recursively updating all children", async () => {
    const prisma = getTestPrisma();
    // Pick a subspace and a root doc in it
    const subspace = mockData.subspaces[0];
    const sourceDoc = mockData.subspaceDocuments[subspace.id][0];

    // Add a child to the sourceDoc for recursion check
    const childDoc = await prisma.doc.create({
      data: {
        id: uuidv4(),
        title: "Subspace Child 1",
        index: "a",
        workspaceId: subspace.workspaceId,
        authorId: mockData.user.id,
        createdById: mockData.user.id,
        lastModifiedById: mockData.user.id,
        subspaceId: subspace.id,
        parentId: sourceDoc.id,
      },
    });

    // Move to my-docs
    const result = await service.moveDocs(mockData.user.id, {
      id: sourceDoc.id,
      subspaceId: null,
      parentId: null,
      index: "z",
    });

    // Assert parent and all children are now in my-docs
    const updatedSource = await prisma.doc.findUnique({
      where: { id: sourceDoc.id },
    });
    const updatedChild = await prisma.doc.findUnique({
      where: { id: childDoc.id },
    });
    expect(updatedSource?.subspaceId).toBeNull();
    expect(updatedChild?.subspaceId).toBeNull();

    // Assert navigation tree in subspace no longer contains the doc
    const updatedSubspace = await prisma.subspace.findUnique({
      where: { id: subspace.id },
    });
    const tree = Array.isArray(updatedSubspace?.navigationTree) ? updatedSubspace.navigationTree : [];
    const findInTree = (tree: any[], id: string): boolean =>
      tree.some((node) => node.id === id || (Array.isArray(node.children) && findInTree(node.children, id)));
    expect(findInTree(tree, sourceDoc.id)).toBe(false);
  });

  it("should move document from my-docs to subspace, recursively updating all children", async () => {
    const prisma = getTestPrisma();
    const targetSubspace = mockData.subspaces[1];
    const sourceDoc = mockData.myDocsDocuments[0];

    // Add a child to the sourceDoc for recursion check
    const childDoc = await prisma.doc.create({
      data: {
        id: uuidv4(),
        title: "MyDocs Child 3",
        index: "a",
        workspaceId: targetSubspace.workspaceId,
        authorId: mockData.user.id,
        createdById: mockData.user.id,
        lastModifiedById: mockData.user.id,
        subspaceId: null,
        parentId: sourceDoc.id,
      },
    });

    // Move to subspace
    const result = await service.moveDocs(mockData.user.id, {
      id: sourceDoc.id,
      subspaceId: targetSubspace.id,
      parentId: null,
      index: "a",
    });

    // Assert parent and all children are now in the subspace
    const updatedSource = await prisma.doc.findUnique({
      where: { id: sourceDoc.id },
    });
    const updatedChild = await prisma.doc.findUnique({
      where: { id: childDoc.id },
    });
    expect(updatedSource?.subspaceId).toBe(targetSubspace.id);
    expect(updatedChild?.subspaceId).toBe(targetSubspace.id);

    // Assert navigation tree in subspace contains the doc
    const updatedSubspace = await prisma.subspace.findUnique({
      where: { id: targetSubspace.id },
    });
    const tree = Array.isArray(updatedSubspace?.navigationTree) ? updatedSubspace.navigationTree : [];
    const findInTree = (tree: any[], id: string): boolean =>
      tree.some((node) => node.id === id || (Array.isArray(node.children) && findInTree(node.children, id)));
    expect(findInTree(tree, sourceDoc.id)).toBe(true);
  });

  it("should move document between subspaces, recursively updating all children and navigation trees", async () => {
    const prisma = getTestPrisma();
    const sourceSubspace = mockData.subspaces[0];
    const targetSubspace = mockData.subspaces[1];
    const sourceDoc = mockData.subspaceDocuments[sourceSubspace.id][0];

    // Add a child to the sourceDoc for recursion check
    const childDoc = await prisma.doc.create({
      data: {
        id: "subspace-move-child-1",
        title: "Subspace Move Child 1",
        index: "a",
        workspaceId: sourceSubspace.workspaceId,
        authorId: mockData.user.id,
        createdById: mockData.user.id,
        lastModifiedById: mockData.user.id,
        subspaceId: sourceSubspace.id,
        parentId: sourceDoc.id,
      },
    });

    // Move to another subspace
    const result = await service.moveDocs(mockData.user.id, {
      id: sourceDoc.id,
      subspaceId: targetSubspace.id,
      parentId: null,
      index: "a",
    });

    // Assert parent and all children are now in the target subspace
    const updatedSource = await prisma.doc.findUnique({
      where: { id: sourceDoc.id },
    });
    const updatedChild = await prisma.doc.findUnique({
      where: { id: childDoc.id },
    });
    expect(updatedSource?.subspaceId).toBe(targetSubspace.id);
    expect(updatedChild?.subspaceId).toBe(targetSubspace.id);

    // Assert navigation tree in target subspace contains the doc, and source subspace does not
    const updatedSourceSubspace = await prisma.subspace.findUnique({
      where: { id: sourceSubspace.id },
    });
    const updatedTargetSubspace = await prisma.subspace.findUnique({
      where: { id: targetSubspace.id },
    });
    const findInTree = (tree: any[], id: string): boolean =>
      tree.some((node) => node.id === id || (Array.isArray(node.children) && findInTree(node.children, id)));
    const sourceTree = Array.isArray(updatedSourceSubspace?.navigationTree) ? updatedSourceSubspace.navigationTree : [];
    const targetTree = Array.isArray(updatedTargetSubspace?.navigationTree) ? updatedTargetSubspace.navigationTree : [];
    expect(findInTree(sourceTree, sourceDoc.id)).toBe(false);
    expect(findInTree(targetTree, sourceDoc.id)).toBe(true);
  });

  it("should handle index collision resolution when moving within my-docs", async () => {
    const sourceDoc = mockData.myDocsDocuments[0];
    // Move to an index that likely collides
    const result = await service.moveDocs(mockData.user.id, {
      id: sourceDoc.id,
      subspaceId: null,
      parentId: null,
      index: "a",
    });
    expect(result.data.documents[0].index).toBeDefined();
  });

  it("should handle index collision resolution when moving within subspace", async () => {
    const subspace = mockData.subspaces[0];
    const sourceDoc = mockData.subspaceDocuments[subspace.id][0];
    // Move to an index that likely collides
    const result = await service.moveDocs(mockData.user.id, {
      id: sourceDoc.id,
      subspaceId: subspace.id,
      parentId: null,
      index: "a",
    });
    expect(result.data.documents[0].index).toBeDefined();
  });

  it("should not change subspaceId or parentId when moving to the same parent/index (no-op)", async () => {
    const sourceDoc = mockData.myDocsDocuments[0];
    const result = await service.moveDocs(mockData.user.id, {
      id: sourceDoc.id,
      subspaceId: null,
      parentId: null,
      index: sourceDoc.index,
    });
    expect(result.data.documents[0].subspaceId).toBeNull();
    expect(result.data.documents[0].parentId).toBeNull();
  });

  it("should trigger permission inheritance and event publishing", async () => {
    const sourceDoc = mockData.myDocsDocuments[0];
    const spyPermission = vi.spyOn((service as any).permissionInheritanceService, "updatePermissionsOnMove");
    const spyEvent = vi.spyOn((service as any).eventPublisher, "publishWebsocketEvent");
    await service.moveDocs(mockData.user.id, {
      id: sourceDoc.id,
      subspaceId: null,
      parentId: null,
      index: "b",
    });
    expect(spyPermission).toHaveBeenCalled();
    expect(spyEvent).toHaveBeenCalled();
  });

  it("should move a leaf document from subspace to my-docs", async () => {
    const prisma = getTestPrisma();
    const subspace = mockData.subspaces[0];
    // Pick a leaf doc (no children)
    const leafDoc = await prisma.doc.create({
      data: {
        id: uuidv4(),
        title: "Leaf Doc 1",
        index: "b",
        workspaceId: subspace.workspaceId,
        authorId: mockData.user.id,
        createdById: mockData.user.id,
        lastModifiedById: mockData.user.id,
        subspaceId: subspace.id,
        parentId: null,
      },
    });

    const result = await service.moveDocs(mockData.user.id, {
      id: leafDoc.id,
      subspaceId: null,
      parentId: null,
      index: "z",
    });

    const updated = await prisma.doc.findUnique({ where: { id: leafDoc.id } });
    expect(updated?.subspaceId).toBeNull();
  });

  it("should not allow moving a document to be its own parent", async () => {
    const sourceDoc = mockData.myDocsDocuments[0];
    await expect(
      service.moveDocs(mockData.user.id, {
        id: sourceDoc.id,
        subspaceId: null,
        parentId: sourceDoc.id,
        index: "a",
      }),
    ).rejects.toThrow();
  });

  it("should not allow moving a document to a non-existent parent", async () => {
    const sourceDoc = mockData.myDocsDocuments[0];
    await expect(
      service.moveDocs(mockData.user.id, {
        id: sourceDoc.id,
        subspaceId: null,
        parentId: "non-existent-id",
        index: "a",
      }),
    ).rejects.toThrow();
  });

  it("should recursively update all descendants when moving a large subtree between subspaces", async () => {
    const prisma = getTestPrisma();
    const sourceSubspace = mockData.subspaces[0];
    const targetSubspace = mockData.subspaces[1];
    // Build a deep tree
    let parent = mockData.subspaceDocuments[sourceSubspace.id][0];
    const descendants: any[] = [];
    for (let i = 0; i < 5; i++) {
      const child = await prisma.doc.create({
        data: {
          id: uuidv4(),
          title: `Descendant Doc ${i + 1}`,
          index: String.fromCharCode(97 + i),
          workspaceId: sourceSubspace.workspaceId,
          authorId: mockData.user.id,
          createdById: mockData.user.id,
          lastModifiedById: mockData.user.id,
          subspaceId: sourceSubspace.id,
          parentId: parent.id,
        },
      });
      descendants.push(child);
      parent = child;
    }

    // Move the root of the subtree
    await service.moveDocs(mockData.user.id, {
      id: descendants[0].parentId, // the original parent
      subspaceId: targetSubspace.id,
      parentId: null,
      index: "a",
    });

    // All descendants should have new subspaceId
    for (const doc of descendants) {
      const updated = await prisma.doc.findUnique({ where: { id: doc.id } });
      expect(updated?.subspaceId).toBe(targetSubspace.id);
    }
  });

  it("should generate a new index when moving to the end of a parent's children", async () => {
    const prisma = getTestPrisma();
    const parent = mockData.myDocsDocuments[0];
    // Add two children
    const child1 = await prisma.doc.create({
      data: {
        id: uuidv4(),
        title: "Child 1 for Index",
        index: "a",
        workspaceId: parent.workspaceId,
        authorId: mockData.user.id,
        createdById: mockData.user.id,
        lastModifiedById: mockData.user.id,
        subspaceId: null,
        parentId: parent.id,
      },
    });
    const child2 = await prisma.doc.create({
      data: {
        id: uuidv4(),
        title: "Child 2 for Index",
        index: "b",
        workspaceId: parent.workspaceId,
        authorId: mockData.user.id,
        createdById: mockData.user.id,
        lastModifiedById: mockData.user.id,
        subspaceId: null,
        parentId: parent.id,
      },
    });

    // Move a new doc to the end
    const newDoc = await prisma.doc.create({
      data: {
        id: uuidv4(),
        title: "New Doc for Index",
        index: "c",
        workspaceId: parent.workspaceId,
        authorId: mockData.user.id,
        createdById: mockData.user.id,
        lastModifiedById: mockData.user.id,
        subspaceId: null,
        parentId: null,
      },
    });

    // Always provide a valid index string as required by the backend contract
    // Find the last index among the parent's children
    const siblings = await prisma.doc.findMany({
      where: { parentId: parent.id, subspaceId: null },
      orderBy: { index: "asc" },
    });
    const lastIndex = siblings.length > 0 ? siblings[siblings.length - 1].index : null;
    const newIndex = generateFractionalIndex(lastIndex, null);

    const result = await service.moveDocs(mockData.user.id, {
      id: newDoc.id,
      subspaceId: null,
      parentId: parent.id,
      index: newIndex, // Always provide a string index
    });

    const updated = await prisma.doc.findUnique({ where: { id: newDoc.id } });
    expect(updated?.parentId).toBe(parent.id);
    expect(updated?.index && updated.index > "b").toBe(true);
  });

  describe("transactions", () => {
    it("should rollback all changes when an error occurs during a transaction", async () => {
      const prisma = getTestPrisma();
      const docId = mockData.myDocsDocuments[0].id;
      const originalDoc = await prisma.doc.findUnique({ where: { id: docId } });

      // Start a transaction and throw an error after update
      let errorCaught = false;
      try {
        await prisma.$transaction(async (tx) => {
          await tx.doc.update({
            where: { id: docId },
            data: { title: "Should Rollback" },
          });
          throw new Error("Intentional error to trigger rollback");
        });
      } catch (e) {
        errorCaught = true;
      }
      expect(errorCaught).toBe(true);
      // The title should not be updated
      const docAfter = await prisma.doc.findUnique({ where: { id: docId } });
      expect(docAfter?.title).toBe(originalDoc?.title);
    });

    it("should commit all changes when transaction succeeds", async () => {
      const prisma = getTestPrisma();
      const docId = mockData.myDocsDocuments[1].id;
      const newTitle = "Committed Title";
      await prisma.$transaction(async (tx) => {
        await tx.doc.update({
          where: { id: docId },
          data: { title: newTitle },
        });
      });
      const updatedDoc = await prisma.doc.findUnique({ where: { id: docId } });
      expect(updatedDoc?.title).toBe(newTitle);
    });
  });
});
