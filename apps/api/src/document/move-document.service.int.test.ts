import { Test, TestingModule } from "@nestjs/testing";
import { MoveDocumentService } from "./move-document.service";
import { EventPublisherService } from "../_shared/events/event-publisher.service";
import { DocPermissionResolveService } from "../permission/document-permission.service";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { PrismaClient } from "@prisma/client";
import { ConfigsModule } from "@/_shared/config/config.module";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";
import { ClsModule } from "@/_shared/utils/cls.module";

async function createComplexMockData(tx: PrismaClient) {
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
  const workspace = await tx.workspace.create({
    data: { id: workspaceId, name: "Test Workspace" },
  });
  const user = await tx.user.create({
    data: { id: userId, displayName: "Test User", email: `${userId}@test.com` },
  });

  // Create subspaces
  const subspace1 = await tx.subspace.create({
    data: {
      id: subspace1Id,
      name: "Engineering",
      workspaceId: workspace.id,
      navigationTree: [],
    },
  });
  const subspace2 = await tx.subspace.create({
    data: {
      id: subspace2Id,
      name: "Marketing",
      workspaceId: workspace.id,
      navigationTree: [],
    },
  });
  const subspaces = [subspace1, subspace2];

  // MyDocs: 2 roots, each with 1 child
  const myDocsRoot1 = await tx.doc.create({
    data: {
      id: myDocsRoot1Id,
      title: "Root 1",
      workspaceId: workspace.id,
      authorId: user.id,
      createdById: user.id,
      lastModifiedById: user.id,
      subspaceId: null,
      parentId: null,
    },
  });
  const myDocsRoot2 = await tx.doc.create({
    data: {
      id: myDocsRoot2Id,
      title: "Root 2",
      workspaceId: workspace.id,
      authorId: user.id,
      createdById: user.id,
      lastModifiedById: user.id,
      subspaceId: null,
      parentId: null,
    },
  });
  const myDocsChild1 = await tx.doc.create({
    data: {
      id: myDocsChild1Id,
      title: "Child 1",
      workspaceId: workspace.id,
      authorId: user.id,
      createdById: user.id,
      lastModifiedById: user.id,
      subspaceId: null,
      parentId: myDocsRoot1.id,
    },
  });
  const myDocsChild2 = await tx.doc.create({
    data: {
      id: myDocsChild2Id,
      title: "Child 2",
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
  const subspace1Root = await tx.doc.create({
    data: {
      id: subspace1RootId,
      title: "S1 Root",
      workspaceId: workspace.id,
      authorId: user.id,
      createdById: user.id,
      lastModifiedById: user.id,
      subspaceId: subspace1.id,
      parentId: null,
    },
  });
  const subspace2Root = await tx.doc.create({
    data: {
      id: subspace2RootId,
      title: "S2 Root",
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
  let module: TestingModule;
  let mockData: Awaited<ReturnType<typeof createComplexMockData>>;
  let prisma: PrismaService;
  let eventPublisherMock: { publishWebsocketEvent: any };
  let permissionMock: {};
  let realtimeGatewayMock: { sendToUser: any };

  beforeEach(async () => {
    console.log("beforeEach in move-document.service.int.test.ts");
    eventPublisherMock = { publishWebsocketEvent: vi.fn().mockResolvedValue(undefined) };
    permissionMock = {};
    realtimeGatewayMock = { sendToUser: vi.fn() };

    module = await Test.createTestingModule({
      imports: [ConfigsModule, ClsModule, PrismaModule],
      providers: [
        MoveDocumentService,
        { provide: EventPublisherService, useValue: eventPublisherMock },
        { provide: DocPermissionResolveService, useValue: permissionMock },
      ],
    }).compile();

    service = module.get(MoveDocumentService);
    prisma = module.get(PrismaService);

    mockData = await createComplexMockData(prisma);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    // No need to disconnect prisma here as it's handled globally
  });

  it("should handle deep nesting reparenting in mydocs", async () => {
    // Find a doc whose parent is not the target parent and is not root
    const targetParent = mockData.myDocsDocuments[1];
    const sourceDoc = mockData.myDocsDocuments.find((doc) => doc.parentId && doc.parentId !== targetParent.id && doc.id !== targetParent.id);
    if (!sourceDoc) throw new Error("No suitable sourceDoc found for reparenting test");

    // Record old parentId before the move
    const oldParentId = sourceDoc.parentId;
    console.log("sourceDoc.id:", sourceDoc.id, "oldParentId:", oldParentId, "targetParent.id:", targetParent.id);
    const result = await service.moveDocs(mockData.user.id, {
      id: sourceDoc.id,
      subspaceId: null,
      parentId: targetParent.id,
      index: 0, // Insert at first position
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
      index: 0, // Move to first position
    });
    expect(result.data.documents[0].id).toBe(sourceDoc.id);
    expect(result.data.documents).toHaveLength(1);

    // DB assertion: check the move was successful
    const updatedDoc = await prisma.doc.findUnique({
      where: { id: sourceDoc.id },
    });
    expect(updatedDoc?.parentId).toBeNull();
    expect(updatedDoc?.subspaceId).toBeNull();
  });

  it("should move document from subspace to my-docs (draft), recursively updating all children", async () => {
    // Pick a subspace and a root doc in it
    const subspace = mockData.subspaces[0];
    const sourceDoc = mockData.subspaceDocuments[subspace.id][0];

    // Add a child to the sourceDoc for recursion check
    const childDoc = await prisma.doc.create({
      data: {
        id: uuidv4(),
        title: "Subspace Child 1",
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
      index: 0,
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
    const tree = updatedSubspace?.navigationTree && Array.isArray(updatedSubspace.navigationTree) ? updatedSubspace.navigationTree : [];
    const findInTree = (tree: any[], id: string): boolean =>
      tree.some((node) => node.id === id || (Array.isArray(node.children) && findInTree(node.children, id)));
    expect(findInTree(tree, sourceDoc.id)).toBe(false);
  });

  it("should move document from my-docs to subspace, recursively updating all children", async () => {
    const targetSubspace = mockData.subspaces[1];
    const sourceDoc = mockData.myDocsDocuments[0];

    // Add a child to the sourceDoc for recursion check
    const childDoc = await prisma.doc.create({
      data: {
        id: uuidv4(),
        title: "MyDocs Child 3",
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
      index: 0,
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
    const tree = updatedSubspace?.navigationTree && Array.isArray(updatedSubspace.navigationTree) ? updatedSubspace.navigationTree : [];
    const findInTree = (tree: any[], id: string): boolean =>
      tree.some((node) => node.id === id || (Array.isArray(node.children) && findInTree(node.children, id)));
    expect(findInTree(tree, sourceDoc.id)).toBe(true);
  });

  it("should move document between subspaces, recursively updating all children and navigation trees", async () => {
    const sourceSubspace = mockData.subspaces[0];
    const targetSubspace = mockData.subspaces[1];
    const sourceDoc = mockData.subspaceDocuments[sourceSubspace.id][0];

    // Add a child to the sourceDoc for recursion check
    const childDoc = await prisma.doc.create({
      data: {
        id: "subspace-move-child-1",
        title: "Subspace Move Child 1",
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
      index: 0,
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
    const sourceTree = updatedSourceSubspace?.navigationTree && Array.isArray(updatedSourceSubspace.navigationTree) ? updatedSourceSubspace.navigationTree : [];
    const targetTree = updatedTargetSubspace?.navigationTree && Array.isArray(updatedTargetSubspace.navigationTree) ? updatedTargetSubspace.navigationTree : [];
    expect(findInTree(sourceTree, sourceDoc.id)).toBe(false);
    expect(findInTree(targetTree, sourceDoc.id)).toBe(true);
  });

  it("should handle moving within my-docs", async () => {
    const sourceDoc = mockData.myDocsDocuments[0];
    const result = await service.moveDocs(mockData.user.id, {
      id: sourceDoc.id,
      subspaceId: null,
      parentId: null,
      index: 1, // Move to second position
    });
    expect(result.data.documents[0].id).toBe(sourceDoc.id);
  });

  it("should handle moving within subspace", async () => {
    const subspace = mockData.subspaces[0];
    const sourceDoc = mockData.subspaceDocuments[subspace.id][0];
    const result = await service.moveDocs(mockData.user.id, {
      id: sourceDoc.id,
      subspaceId: subspace.id,
      parentId: null,
      index: 0,
    });
    expect(result.data.documents[0].id).toBe(sourceDoc.id);
  });

  it("should not change subspaceId or parentId when moving to the same parent/position (no-op)", async () => {
    const sourceDoc = mockData.myDocsDocuments[0];
    const result = await service.moveDocs(mockData.user.id, {
      id: sourceDoc.id,
      subspaceId: null,
      parentId: null,
      index: 0,
    });
    expect(result.data.documents[0].subspaceId).toBeNull();
    expect(result.data.documents[0].parentId).toBeNull();
  });

  it("should trigger permission inheritance and event publishing", async () => {
    const sourceDoc = mockData.myDocsDocuments[0];

    await service.moveDocs(mockData.user.id, {
      id: sourceDoc.id,
      subspaceId: null,
      parentId: null,
      index: 1, // a different position to ensure move happens
    });

    expect(eventPublisherMock.publishWebsocketEvent).toHaveBeenCalled();
  });

  it("should move a leaf document from subspace to my-docs", async () => {
    const subspace = mockData.subspaces[0];
    // Pick a leaf doc (no children)
    const leafDoc = await prisma.doc.create({
      data: {
        id: uuidv4(),
        title: "Leaf Doc 1",
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
      index: 0,
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
        index: 0,
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
        index: 0,
      }),
    ).rejects.toThrow();
  });

  it("should recursively update all descendants when moving a large subtree between subspaces", async () => {
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
      index: 0,
    });

    // All descendants should have new subspaceId
    for (const doc of descendants) {
      const updated = await prisma.doc.findUnique({ where: { id: doc.id } });
      expect(updated?.subspaceId).toBe(targetSubspace.id);
    }
  });

  it("should move a document to the end of a parent's children", async () => {
    const parent = mockData.myDocsDocuments[0];
    // Add two children
    const child1 = await prisma.doc.create({
      data: {
        id: uuidv4(),
        title: "Child 1 for Position",
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
        title: "Child 2 for Position",
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
        title: "New Doc for Position",
        workspaceId: parent.workspaceId,
        authorId: mockData.user.id,
        createdById: mockData.user.id,
        lastModifiedById: mockData.user.id,
        subspaceId: null,
        parentId: null,
      },
    });

    const result = await service.moveDocs(mockData.user.id, {
      id: newDoc.id,
      subspaceId: null,
      parentId: parent.id,
      index: 2, // Move to end (after child1 and child2)
    });

    const updated = await prisma.doc.findUnique({ where: { id: newDoc.id } });
    expect(updated?.parentId).toBe(parent.id);
  });

  it("should reorder documents within the same subspace without creating duplicates", async () => {
    // Create a subspace with multiple documents
    const subspace = mockData.subspaces[0];

    // Create multiple documents in the subspace
    const doc1 = await prisma.doc.create({
      data: {
        id: uuidv4(),
        title: "Doc 1",
        workspaceId: subspace.workspaceId,
        authorId: mockData.user.id,
        createdById: mockData.user.id,
        lastModifiedById: mockData.user.id,
        subspaceId: subspace.id,
        parentId: null,
      },
    });

    const doc2 = await prisma.doc.create({
      data: {
        id: uuidv4(),
        title: "Doc 2",
        workspaceId: subspace.workspaceId,
        authorId: mockData.user.id,
        createdById: mockData.user.id,
        lastModifiedById: mockData.user.id,
        subspaceId: subspace.id,
        parentId: null,
      },
    });

    const doc3 = await prisma.doc.create({
      data: {
        id: uuidv4(),
        title: "Doc 3",
        workspaceId: subspace.workspaceId,
        authorId: mockData.user.id,
        createdById: mockData.user.id,
        lastModifiedById: mockData.user.id,
        subspaceId: subspace.id,
        parentId: null,
      },
    });

    // Initialize the navigation tree with the documents
    const initialTree = [
      {
        id: doc1.id,
        type: "document",
        title: doc1.title,
        url: `/${doc1.id}`,
        children: [],
      },
      {
        id: doc2.id,
        type: "document",
        title: doc2.title,
        url: `/${doc2.id}`,
        children: [],
      },
      {
        id: doc3.id,
        type: "document",
        title: doc3.title,
        url: `/${doc3.id}`,
        children: [],
      },
    ];

    await prisma.subspace.update({
      where: { id: subspace.id },
      data: { navigationTree: initialTree },
    });

    // Move doc3 to the first position (index 0)
    const result = await service.moveDocs(mockData.user.id, {
      id: doc3.id,
      subspaceId: subspace.id,
      parentId: null,
      index: 0,
    });

    // Verify the move was successful
    expect(result.data.documents[0].id).toBe(doc3.id);
    expect(result.data.documents[0].subspaceId).toBe(subspace.id);

    // Check the navigation tree was updated correctly
    const updatedSubspace = await prisma.subspace.findUnique({
      where: { id: subspace.id },
    });

    const tree = updatedSubspace?.navigationTree as any[];
    expect(Array.isArray(tree)).toBe(true);

    // Verify the order is correct: doc3 should be first
    expect(tree[0].id).toBe(doc3.id);
    expect(tree[1].id).toBe(doc1.id);
    expect(tree[2].id).toBe(doc2.id);

    // Verify no duplicates exist
    const docIds = tree.map((node) => node.id);
    const uniqueDocIds = [...new Set(docIds)];
    expect(docIds.length).toBe(uniqueDocIds.length);
    expect(docIds.length).toBe(3); // Should have exactly 3 documents

    // Verify all documents are still in the tree
    expect(docIds).toContain(doc1.id);
    expect(docIds).toContain(doc2.id);
    expect(docIds).toContain(doc3.id);
  });

  it("should handle moving a document within the same subspace to a different position", async () => {
    // Create a subspace with multiple documents
    const subspace = mockData.subspaces[0];

    // Create multiple documents in the subspace
    const doc1 = await prisma.doc.create({
      data: {
        id: uuidv4(),
        title: "Doc A",
        workspaceId: subspace.workspaceId,
        authorId: mockData.user.id,
        createdById: mockData.user.id,
        lastModifiedById: mockData.user.id,
        subspaceId: subspace.id,
        parentId: null,
      },
    });

    const doc2 = await prisma.doc.create({
      data: {
        id: uuidv4(),
        title: "Doc B",
        workspaceId: subspace.workspaceId,
        authorId: mockData.user.id,
        createdById: mockData.user.id,
        lastModifiedById: mockData.user.id,
        subspaceId: subspace.id,
        parentId: null,
      },
    });

    const doc3 = await prisma.doc.create({
      data: {
        id: uuidv4(),
        title: "Doc C",
        workspaceId: subspace.workspaceId,
        authorId: mockData.user.id,
        createdById: mockData.user.id,
        lastModifiedById: mockData.user.id,
        subspaceId: subspace.id,
        parentId: null,
      },
    });

    // Initialize the navigation tree with the documents
    const initialTree = [
      {
        id: doc1.id,
        type: "document",
        title: doc1.title,
        url: `/${doc1.id}`,
        children: [],
      },
      {
        id: doc2.id,
        type: "document",
        title: doc2.title,
        url: `/${doc2.id}`,
        children: [],
      },
      {
        id: doc3.id,
        type: "document",
        title: doc3.title,
        url: `/${doc3.id}`,
        children: [],
      },
    ];

    await prisma.subspace.update({
      where: { id: subspace.id },
      data: { navigationTree: initialTree },
    });

    // Move doc1 to the middle position (index 1)
    const result = await service.moveDocs(mockData.user.id, {
      id: doc1.id,
      subspaceId: subspace.id,
      parentId: null,
      index: 1,
    });

    // Verify the move was successful
    expect(result.data.documents[0].id).toBe(doc1.id);

    // Check the navigation tree was updated correctly
    const updatedSubspace = await prisma.subspace.findUnique({
      where: { id: subspace.id },
    });

    const tree = updatedSubspace?.navigationTree as any[];

    // Verify the order is correct: doc2, doc1, doc3
    expect(tree[0].id).toBe(doc2.id);
    expect(tree[1].id).toBe(doc1.id);
    expect(tree[2].id).toBe(doc3.id);

    // Verify no duplicates
    const docIds = tree.map((node) => node.id);
    const uniqueDocIds = [...new Set(docIds)];
    expect(docIds.length).toBe(uniqueDocIds.length);
  });

  it("should move a folder (document with children) from one subspace to another and preserve its children in the navigation tree", async () => {
    const sourceSubspace = mockData.subspaces[0];
    const targetSubspace = mockData.subspaces[1];
    // Create a folder (parent doc) and two children in sourceSubspace
    const folder = await prisma.doc.create({
      data: {
        id: uuidv4(),
        title: "Folder Doc",
        workspaceId: sourceSubspace.workspaceId,
        authorId: mockData.user.id,
        createdById: mockData.user.id,
        lastModifiedById: mockData.user.id,
        subspaceId: sourceSubspace.id,
        parentId: null,
      },
    });
    const child1 = await prisma.doc.create({
      data: {
        id: uuidv4(),
        title: "Child 1",
        workspaceId: sourceSubspace.workspaceId,
        authorId: mockData.user.id,
        createdById: mockData.user.id,
        lastModifiedById: mockData.user.id,
        subspaceId: sourceSubspace.id,
        parentId: folder.id,
      },
    });
    const child2 = await prisma.doc.create({
      data: {
        id: uuidv4(),
        title: "Child 2",
        workspaceId: sourceSubspace.workspaceId,
        authorId: mockData.user.id,
        createdById: mockData.user.id,
        lastModifiedById: mockData.user.id,
        subspaceId: sourceSubspace.id,
        parentId: folder.id,
      },
    });
    // Move the folder to the target subspace
    await service.moveDocs(mockData.user.id, {
      id: folder.id,
      subspaceId: targetSubspace.id,
      parentId: null,
      index: 0,
    });
    // Check the navigation tree in the target subspace
    const updatedTargetSubspace = await prisma.subspace.findUnique({ where: { id: targetSubspace.id } });
    const tree = updatedTargetSubspace?.navigationTree as any[];
    // Find the folder node
    const folderNode = tree.find((node) => node.id === folder.id);
    expect(folderNode).toBeDefined();
    expect(Array.isArray(folderNode.children)).toBe(true);
    // The children should be present
    const childIds = folderNode.children.map((c) => c.id);
    expect(childIds).toContain(child1.id);
    expect(childIds).toContain(child2.id);
  });

  describe("transactions", () => {
    it("should rollback all changes when an error occurs during a transaction", async () => {
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

    it("should handle concurrent document moves with transaction isolation", async () => {
      // Create a subspace with multiple documents
      const subspace = mockData.subspaces[0];

      // Create multiple documents in the subspace
      const doc1 = await prisma.doc.create({
        data: {
          id: uuidv4(),
          title: "Concurrent Doc 1",
          workspaceId: subspace.workspaceId,
          authorId: mockData.user.id,
          createdById: mockData.user.id,
          lastModifiedById: mockData.user.id,
          subspaceId: subspace.id,
          parentId: null,
        },
      });

      const doc2 = await prisma.doc.create({
        data: {
          id: uuidv4(),
          title: "Concurrent Doc 2",
          workspaceId: subspace.workspaceId,
          authorId: mockData.user.id,
          createdById: mockData.user.id,
          lastModifiedById: mockData.user.id,
          subspaceId: subspace.id,
          parentId: null,
        },
      });

      const doc3 = await prisma.doc.create({
        data: {
          id: uuidv4(),
          title: "Concurrent Doc 3",
          workspaceId: subspace.workspaceId,
          authorId: mockData.user.id,
          createdById: mockData.user.id,
          lastModifiedById: mockData.user.id,
          subspaceId: subspace.id,
          parentId: null,
        },
      });

      // Initialize the navigation tree
      const initialTree = [
        {
          id: doc1.id,
          type: "document",
          title: doc1.title,
          url: `/${doc1.id}`,
          children: [],
        },
        {
          id: doc2.id,
          type: "document",
          title: doc2.title,
          url: `/${doc2.id}`,
          children: [],
        },
        {
          id: doc3.id,
          type: "document",
          title: doc3.title,
          url: `/${doc3.id}`,
          children: [],
        },
      ];

      await prisma.subspace.update({
        where: { id: subspace.id },
        data: { navigationTree: initialTree },
      });

      // Simulate concurrent moves by running them in parallel
      const movePromises = [
        // Move doc1 to position 2
        service.moveDocs(mockData.user.id, {
          id: doc1.id,
          subspaceId: subspace.id,
          parentId: null,
          index: 2,
        }),
        // Move doc3 to position 0
        service.moveDocs(mockData.user.id, {
          id: doc3.id,
          subspaceId: subspace.id,
          parentId: null,
          index: 0,
        }),
      ];

      // Execute both moves concurrently
      const results = await Promise.all(movePromises);

      // Both moves should succeed
      expect(results[0].data.documents[0].id).toBe(doc1.id);
      expect(results[1].data.documents[0].id).toBe(doc3.id);

      // Check the final navigation tree state
      const updatedSubspace = await prisma.subspace.findUnique({
        where: { id: subspace.id },
      });

      const tree = updatedSubspace?.navigationTree as any[];

      // Verify no duplicates exist
      const docIds = tree.map((node) => node.id);
      const uniqueDocIds = [...new Set(docIds)];
      expect(docIds.length).toBe(uniqueDocIds.length);
      expect(docIds.length).toBe(3); // Should have exactly 3 documents

      // Verify all documents are still present
      expect(docIds).toContain(doc1.id);
      expect(docIds).toContain(doc2.id);
      expect(docIds).toContain(doc3.id);

      // The final order should be consistent (one of the moves should "win")
      // and the tree should be in a valid state
      expect(tree.length).toBe(3);
    });

    it("should commit all changes when transaction succeeds", async () => {
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

  describe("MoveDocumentService (edge cases)", () => {
    let service: MoveDocumentService;
    let prisma: PrismaService;
    let mockData: Awaited<ReturnType<typeof createComplexMockData>>;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [ConfigsModule, ClsModule, PrismaModule],
        providers: [MoveDocumentService, { provide: EventPublisherService, useValue: { publishWebsocketEvent: vi.fn() } }],
      }).compile();
      service = module.get(MoveDocumentService);
      prisma = module.get(PrismaService);
      mockData = await createComplexMockData(prisma);
    });

    it("should handle navigation tree with missing nodes (corrupted tree)", async () => {
      // Create a doc and add to subspace, but not in navigation tree
      const subspace = mockData.subspaces[0];
      const orphanDoc = await prisma.doc.create({
        data: {
          id: uuidv4(),
          title: "Orphan Doc",
          workspaceId: subspace.workspaceId,
          authorId: mockData.user.id,
          createdById: mockData.user.id,
          lastModifiedById: mockData.user.id,
          subspaceId: subspace.id,
          parentId: null,
        },
      });
      // Remove all nodes from navigation tree (simulate corruption)
      await prisma.subspace.update({
        where: { id: subspace.id },
        data: { navigationTree: [] },
      });
      // Try to move the orphan doc to another subspace
      const targetSubspace = mockData.subspaces[1];
      await expect(
        service.moveDocs(mockData.user.id, {
          id: orphanDoc.id,
          subspaceId: targetSubspace.id,
          parentId: null,
          index: 0,
        }),
      ).resolves.toBeDefined();
      // Should not throw, and doc should be in target subspace
      const updated = await prisma.doc.findUnique({ where: { id: orphanDoc.id } });
      expect(updated?.subspaceId).toBe(targetSubspace.id);
    });

    it("should not create duplicate nodes in navigation tree after repeated moves", async () => {
      const subspace = mockData.subspaces[0];
      const doc = await prisma.doc.create({
        data: {
          id: uuidv4(),
          title: "Dup Doc",
          workspaceId: subspace.workspaceId,
          authorId: mockData.user.id,
          createdById: mockData.user.id,
          lastModifiedById: mockData.user.id,
          subspaceId: subspace.id,
          parentId: null,
        },
      });
      // Add to navigation tree
      await prisma.subspace.update({
        where: { id: subspace.id },
        data: { navigationTree: [{ id: doc.id, type: "document", title: doc.title, url: `/${doc.id}`, children: [] }] },
      });
      // Move doc to same subspace multiple times
      for (let i = 0; i < 3; i++) {
        await service.moveDocs(mockData.user.id, {
          id: doc.id,
          subspaceId: subspace.id,
          parentId: null,
          index: 0,
        });
      }
      // Check navigation tree for duplicates
      const updatedSubspace = await prisma.subspace.findUnique({ where: { id: subspace.id } });
      const tree = updatedSubspace?.navigationTree as any[];
      const docIds = tree.map((node) => node.id);
      const uniqueDocIds = [...new Set(docIds)];
      expect(docIds.length).toBe(uniqueDocIds.length);
    });

    it("should handle orphan documents (no parent, not in navigation tree)", async () => {
      const subspace = mockData.subspaces[0];
      const orphanDoc = await prisma.doc.create({
        data: {
          id: uuidv4(),
          title: "Orphan Doc 2",
          workspaceId: subspace.workspaceId,
          authorId: mockData.user.id,
          createdById: mockData.user.id,
          lastModifiedById: mockData.user.id,
          subspaceId: subspace.id,
          parentId: null,
        },
      });
      // Not in navigation tree
      // Try to move it under a valid parent
      const parentDoc = mockData.subspaceDocuments[subspace.id][0];
      await expect(
        service.moveDocs(mockData.user.id, {
          id: orphanDoc.id,
          subspaceId: subspace.id,
          parentId: parentDoc.id,
          index: 0,
        }),
      ).resolves.toBeDefined();
      // Should now have parentId set
      const updated = await prisma.doc.findUnique({ where: { id: orphanDoc.id } });
      expect(updated?.parentId).toBe(parentDoc.id);
    });
  });
});
