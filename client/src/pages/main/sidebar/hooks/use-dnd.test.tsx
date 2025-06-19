import { describe, it, expect, vi, beforeEach } from "vitest";
import { processDropEvent, DropEventParams, DragItem, DropTarget } from "./use-dnd";

// Mock fractional-index
vi.mock("fractional-index", () => ({
  default: vi.fn((a, b) => {
    if (a === null && b === null) return "middle";
    if (a === null) return `before-${b}`;
    if (b === null) return `after-${a}`;
    return `between-${a}-${b}`;
  }),
}));

describe("processDropEvent", () => {
  const mockSubspaces = [
    { id: "space1", index: "a", name: "Space 1" },
    { id: "space2", index: "b", name: "Space 2" },
    { id: "space3", index: "c", name: "Space 3" },
  ];

  const mockMyDocsDocuments = [
    { id: "mydoc1", index: "a", title: "My Doc 1", subspaceId: null },
    { id: "mydoc2", index: "b", title: "My Doc 2", subspaceId: null },
    { id: "mydoc3", index: "c", title: "My Doc 3", subspaceId: null },
  ];

  const mockAllDocuments = {
    mydoc1: {
      id: "mydoc1",
      index: "a",
      title: "My Doc 1",
      subspaceId: null,
      parentId: null,
    },
    mydoc2: {
      id: "mydoc2",
      index: "b",
      title: "My Doc 2",
      subspaceId: null,
      parentId: null,
    },
    mydoc3: {
      id: "mydoc3",
      index: "c",
      title: "My Doc 3",
      subspaceId: null,
      parentId: null,
    },
    subdoc1: {
      id: "subdoc1",
      index: "a",
      title: "Sub Doc 1",
      subspaceId: "space1",
      parentId: null,
    },
    child1: {
      id: "child1",
      index: "a",
      title: "Child 1",
      subspaceId: null,
      parentId: "mydoc1",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("My-docs area reorder", () => {
    it("should reorder document within my-docs to top position", () => {
      const draggingItem: DragItem = {
        id: "mydoc2",
        type: "document",
        title: "My Doc 2",
        subspaceId: null, // my-docs
        index: "b",
      };

      const toDropItem: DropTarget = {
        accept: ["document"],
        dropType: "top",
        subspaceId: null, // my-docs
      };

      const params: DropEventParams = {
        draggingItem,
        toDropItem,
        allSubspaces: mockSubspaces,
        myDocsDocuments: mockMyDocsDocuments,
        allDocuments: mockAllDocuments,
      };

      const result = processDropEvent(params);

      expect(result.type).toBe("document");
      expect(result.documentParams).toEqual({
        id: "mydoc2",
        subspaceId: null,
        parentId: undefined,
        index: "before-a", // fractionalIndex(null, 'a')
      });
    });

    it("should reorder document within my-docs to bottom position", () => {
      const draggingItem: DragItem = {
        id: "mydoc1",
        type: "document",
        title: "My Doc 1",
        subspaceId: null,
        index: "a",
      };

      const toDropItem: DropTarget = {
        accept: ["document"],
        dropType: "bottom",
        subspaceId: null,
      };

      const params: DropEventParams = {
        draggingItem,
        toDropItem,
        allSubspaces: mockSubspaces,
        myDocsDocuments: mockMyDocsDocuments,
        allDocuments: mockAllDocuments,
      };

      const result = processDropEvent(params);

      expect(result.type).toBe("document");
      expect(result.documentParams?.index).toBe("after-c"); // fractionalIndex('c', null)
    });

    it("should reorder document within my-docs between two documents", () => {
      const draggingItem: DragItem = {
        id: "mydoc3",
        type: "document",
        title: "My Doc 3",
        subspaceId: null,
        index: "c",
      };

      const toDropItem: DropTarget = {
        accept: ["document"],
        dropType: "reorder",
        subspaceId: null,
        documentId: "mydoc1",
        dropPosition: "bottom",
      };

      const params: DropEventParams = {
        draggingItem,
        toDropItem,
        allSubspaces: mockSubspaces,
        myDocsDocuments: [
          { id: "mydoc1", index: "a" },
          { id: "mydoc2", index: "b" },
          { id: "mydoc3", index: "c" },
        ],
        allDocuments: mockAllDocuments,
      };

      const result = processDropEvent(params);
      expect(result.type).toBe("document");
      expect(result.documentParams?.index).toBe("between-a-b"); // fractionalIndex('a', 'b')
    });

    it("should fallback to 'z' if indices are equal (fractionalIndex would throw)", () => {
      const draggingItem: DragItem = {
        id: "mydoc1",
        type: "document",
        title: "My Doc 1",
        subspaceId: null,
        index: "a",
      };

      const toDropItem: DropTarget = {
        accept: ["document"],
        dropType: "reorder",
        subspaceId: null,
        documentId: "mydoc1",
        dropPosition: "bottom",
      };

      const params: DropEventParams = {
        draggingItem,
        toDropItem,
        allSubspaces: mockSubspaces,
        myDocsDocuments: [
          { id: "mydoc1", index: "a" },
          { id: "mydoc2", index: "a" },
        ],
        allDocuments: mockAllDocuments,
      };

      const result = processDropEvent(params);
      expect(result.type).toBe("document");
      expect(result.documentParams?.index).toBe("middle"); // fallback from mock
    });
  });

  describe("Move from my-docs to subspace", () => {
    it("should move document from my-docs to subspace", () => {
      const draggingItem: DragItem = {
        id: "mydoc1",
        type: "document",
        title: "My Doc 1",
        subspaceId: null, // currently in my-docs
        index: "a",
      };

      const toDropItem: DropTarget = {
        accept: ["document"],
        dropType: "reorder",
        subspaceId: "space1", // moving to subspace
        parentId: null,
      };

      const params: DropEventParams = {
        draggingItem,
        toDropItem,
        allSubspaces: mockSubspaces,
        myDocsDocuments: mockMyDocsDocuments,
        allDocuments: mockAllDocuments,
      };

      const result = processDropEvent(params);

      expect(result.type).toBe("document");
      expect(result.documentParams).toEqual({
        id: "mydoc1",
        subspaceId: "space1",
        parentId: null,
        index: "middle", // Server handles subspace indexing, now always a string
      });
    });

    it("should move document from my-docs to subspace as child", () => {
      const draggingItem: DragItem = {
        id: "mydoc2",
        type: "document",
        title: "My Doc 2",
        subspaceId: null,
        index: "b",
      };

      const toDropItem: DropTarget = {
        accept: ["document"],
        dropType: "reparent",
        subspaceId: "space1",
        documentId: "subdoc1", // parent document
        parentId: null,
      };

      const params: DropEventParams = {
        draggingItem,
        toDropItem,
        allSubspaces: mockSubspaces,
        myDocsDocuments: mockMyDocsDocuments,
        allDocuments: mockAllDocuments,
      };

      const result = processDropEvent(params);

      expect(result.type).toBe("document");
      expect(result.documentParams).toEqual({
        id: "mydoc2",
        subspaceId: "space1",
        parentId: "subdoc1",
        index: "middle", // Server handles subspace indexing, now always a string
      });
    });
  });

  describe("Subspace reorder in folder", () => {
    it("should reorder subspace to top position", () => {
      const draggingItem: DragItem = {
        id: "drag-space2",
        type: "subspace",
        title: "Space 2",
        subspaceId: "space2",
        index: "b",
      };

      const toDropItem: DropTarget = {
        accept: ["subspace"],
        dropType: "top",
      };

      const params: DropEventParams = {
        draggingItem,
        toDropItem,
        allSubspaces: mockSubspaces,
        myDocsDocuments: mockMyDocsDocuments,
        allDocuments: mockAllDocuments,
      };

      const result = processDropEvent(params);

      expect(result.type).toBe("subspace");
      expect(result.subspaceParams).toEqual({
        id: "space2",
        newIndex: "before-a", // fractionalIndex(null, 'a')
      });
    });

    it("should reorder subspace to bottom position", () => {
      const draggingItem: DragItem = {
        id: "drag-space1",
        type: "subspace",
        title: "Space 1",
        subspaceId: "space1",
        index: "a",
      };

      const toDropItem: DropTarget = {
        accept: ["subspace"],
        dropType: "bottom",
      };

      const params: DropEventParams = {
        draggingItem,
        toDropItem,
        allSubspaces: mockSubspaces,
        myDocsDocuments: mockMyDocsDocuments,
        allDocuments: mockAllDocuments,
      };

      const result = processDropEvent(params);

      expect(result.type).toBe("subspace");
      expect(result.subspaceParams?.newIndex).toBe("after-c"); // fractionalIndex('c', null)
    });

    it("should reorder subspace between two other subspaces", () => {
      const draggingItem: DragItem = {
        id: "drag-space3",
        type: "subspace",
        title: "Space 3",
        subspaceId: "space3",
        index: "c",
      };

      const toDropItem: DropTarget = {
        accept: ["subspace"],
        dropType: "reorder",
        subspaceId: "space1", // drop after space1
      };

      const params: DropEventParams = {
        draggingItem,
        toDropItem,
        allSubspaces: mockSubspaces,
        myDocsDocuments: mockMyDocsDocuments,
        allDocuments: mockAllDocuments,
      };

      const result = processDropEvent(params);

      expect(result.type).toBe("subspace");
      expect(result.subspaceParams?.newIndex).toBe("between-a-b"); // fractionalIndex('a', 'b')
    });
  });

  describe("Move from one subspace to another", () => {
    it("should move document from one subspace to another", () => {
      const draggingItem: DragItem = {
        id: "subdoc1",
        type: "document",
        title: "Sub Doc 1",
        subspaceId: "space1", // currently in space1
        index: "a",
      };

      const toDropItem: DropTarget = {
        accept: ["document"],
        dropType: "reorder",
        subspaceId: "space2", // moving to space2
        parentId: null,
      };

      const params: DropEventParams = {
        draggingItem,
        toDropItem,
        allSubspaces: mockSubspaces,
        myDocsDocuments: mockMyDocsDocuments,
        allDocuments: mockAllDocuments,
      };

      const result = processDropEvent(params);

      expect(result.type).toBe("document");
      expect(result.documentParams).toEqual({
        id: "subdoc1",
        subspaceId: "space2",
        parentId: null,
        index: "middle", // Server handles subspace indexing, now always a string
      });
    });
  });

  describe("Handle star drop", () => {
    it("should return none for unsupported star drop type", () => {
      const draggingItem: DragItem = {
        id: "star1",
        type: "star" as any, // Not supported in current implementation
        title: "Starred Item",
        subspaceId: null,
        index: "a",
      };

      const toDropItem: DropTarget = {
        accept: ["star"],
        dropType: "reorder",
      };

      const params: DropEventParams = {
        draggingItem,
        toDropItem,
        allSubspaces: mockSubspaces,
        myDocsDocuments: mockMyDocsDocuments,
        allDocuments: mockAllDocuments,
      };

      const result = processDropEvent(params);

      expect(result.type).toBe("none");
    });

    it("should handle document drop on star area (treat as my-docs)", () => {
      const draggingItem: DragItem = {
        id: "mydoc1",
        type: "document",
        title: "My Doc 1",
        subspaceId: null,
        index: "a",
      };

      const toDropItem: DropTarget = {
        accept: ["document"],
        dropType: "reorder",
        subspaceId: null, // Star area treated as my-docs
        documentId: "mydoc2",
        dropPosition: "top",
      };

      const params: DropEventParams = {
        draggingItem,
        toDropItem,
        allSubspaces: mockSubspaces,
        myDocsDocuments: mockMyDocsDocuments,
        allDocuments: mockAllDocuments,
      };

      const result = processDropEvent(params);

      expect(result.type).toBe("document");
      expect(result.documentParams?.subspaceId).toBe(null);
    });
  });
});
