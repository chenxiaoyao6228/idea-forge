import { Test, TestingModule } from "@nestjs/testing";
import { MoveDocumentService } from "./move-document.service";
import { PRISMA_CLIENT } from "../_shared/database/prisma/prisma.extension";
import { EventPublisherService } from "../_shared/events/event-publisher.service";
import { PermissionInheritanceService } from "../permission/permission-inheritance.service";
import { PermissionService } from "../permission/permission.service";
import { ApiException } from "../_shared/exceptions/api.exception";

// Mock dependencies
const mockPrisma = {
  doc: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  subspace: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};
const mockEventPublisher = { publishWebsocketEvent: jest.fn() };
const mockPermissionInheritance = { updatePermissionsOnMove: jest.fn() };
const mockPermissionService = { getResourcePermissionAbilities: jest.fn() };

describe("MoveDocumentService - Comprehensive Tests", () => {
  let service: MoveDocumentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoveDocumentService,
        { provide: PRISMA_CLIENT, useValue: mockPrisma },
        { provide: EventPublisherService, useValue: mockEventPublisher },
        {
          provide: PermissionInheritanceService,
          useValue: mockPermissionInheritance,
        },
        { provide: PermissionService, useValue: mockPermissionService },
      ],
    }).compile();

    service = module.get<MoveDocumentService>(MoveDocumentService);
    jest.clearAllMocks();
  });

  describe("Document Not Found", () => {
    it("should throw DocumentNotFound when document doesn't exist", async () => {
      mockPrisma.doc.findUnique.mockResolvedValue(null);

      const dto = {
        id: "nonexistent",
        subspaceId: null,
        parentId: null,
        index: "a",
      };

      await expect(service.moveDocs("user1", dto as any)).rejects.toThrow(
        ApiException
      );
    });
  });

  describe("My-Docs Operations", () => {
    beforeEach(() => {
      mockPermissionService.getResourcePermissionAbilities.mockResolvedValue({
        read: true,
        write: true,
      });
    });

    it("should move document within my-docs with fractional index", async () => {
      const mockDoc = {
        id: "doc1",
        subspaceId: null,
        parentId: null,
        workspaceId: "ws1",
        title: "Test Doc",
      };

      mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.doc.update.mockResolvedValue({
        ...mockDoc,
        index: "b",
        updatedAt: new Date(),
      });

      const dto = { id: "doc1", subspaceId: null, parentId: null, index: "b" };
      const result = await service.moveDocs("user1", dto as any);

      expect(mockPrisma.doc.update).toHaveBeenCalledWith({
        where: { id: "doc1" },
        data: {
          subspaceId: null,
          parentId: null,
          index: "b",
          updatedAt: expect.any(Date),
        },
        include: { subspace: true },
      });
      expect(result.data.documents).toHaveLength(1);
    });

    it("should handle reparenting within my-docs", async () => {
      const mockDoc = {
        id: "child1",
        subspaceId: null,
        parentId: null,
        workspaceId: "ws1",
      };

      mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.doc.update.mockResolvedValue({
        ...mockDoc,
        parentId: "parent1",
        index: "a",
      });

      const dto = {
        id: "child1",
        subspaceId: null,
        parentId: "parent1",
        index: "a",
      };
      await service.moveDocs("user1", dto as any);

      expect(
        mockPermissionInheritance.updatePermissionsOnMove
      ).toHaveBeenCalledWith("child1", "parent1", null);
    });
  });

  describe("Cross-Subspace Moves", () => {
    it("should move document from my-docs to subspace", async () => {
      const mockDoc = {
        id: "doc2",
        subspaceId: null,
        parentId: null,
        workspaceId: "ws1",
      };

      mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.doc.update.mockResolvedValue({
        ...mockDoc,
        subspaceId: "sub1",
      });
      mockPrisma.subspace.findUnique.mockResolvedValue({
        id: "sub1",
        navigationTree: [],
      });
      mockPrisma.subspace.update.mockResolvedValue({});
      mockPermissionService.getResourcePermissionAbilities.mockResolvedValue({
        read: true,
      });

      // Mock updateChildDocumentsSubspace to return empty array
      jest
        .spyOn(service as any, "updateChildDocumentsSubspace")
        .mockResolvedValue([]);
      jest
        .spyOn(service as any, "updateNavigationTreeStructure")
        .mockResolvedValue(undefined);

      const dto = {
        id: "doc2",
        subspaceId: "sub1",
        parentId: null,
        index: "a",
      };
      const result = await service.moveDocs("user1", dto as any);

      expect(result.data.documents[0].subspaceId).toBe("sub1");
      expect(mockEventPublisher.publishWebsocketEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            myDocsChanged: true,
          }),
        })
      );
    });

    // it("should move document from subspace to my-docs", async () => {
    //   const mockDoc = {
    //     id: "doc3",
    //     subspaceId: "sub1",
    //     parentId: null,
    //     workspaceId: "ws1",
    //   };

    //   mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
    //   mockPrisma.doc.update.mockResolvedValue({
    //     ...mockDoc,
    //     subspaceId: null,
    //     index: "c",
    //   });
    //   mockPermissionService.getResourcePermissionAbilities.mockResolvedValue({
    //     read: true,
    //   });

    //   const dto = { id: "doc3", subspaceId: null, parentId: null, index: "c" };
    //   const result = await service.moveDocs("user1", dto as any);

    //   expect(result.data.documents[0].subspaceId).toBe(null);
    //   expect(mockEventPublisher.publishWebsocketEvent).toHaveBeenCalledWith(
    //     expect.objectContaining({
    //       data: expect.objectContaining({
    //         myDocsChanged: true,
    //       }),
    //     })
    //   );
    // });

    it("should handle child documents when moving across subspaces", async () => {
      const mockDoc = {
        id: "parent1",
        subspaceId: null,
        parentId: null,
        workspaceId: "ws1",
      };

      const mockChildren = [
        { id: "child1", parentId: "parent1", subspaceId: null },
        { id: "child2", parentId: "parent1", subspaceId: null },
      ];

      mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.doc.update.mockResolvedValue({
        ...mockDoc,
        subspaceId: "sub1",
      });
      mockPrisma.subspace.findUnique.mockResolvedValue({
        id: "sub1",
        navigationTree: [],
      });
      mockPrisma.subspace.update.mockResolvedValue({});
      mockPermissionService.getResourcePermissionAbilities.mockResolvedValue({
        read: true,
      });

      // Mock the recursive child update
      jest
        .spyOn(service as any, "updateChildDocumentsSubspace")
        .mockResolvedValue(
          mockChildren.map((child) => ({ ...child, subspaceId: "sub1" }))
        );
      jest
        .spyOn(service as any, "updateNavigationTreeStructure")
        .mockResolvedValue(undefined);

      const dto = {
        id: "parent1",
        subspaceId: "sub1",
        parentId: null,
        index: "a",
      };
      const result = await service.moveDocs("user1", dto as any);

      expect(result.data.documents).toHaveLength(3); // parent + 2 children
    });
  });

  describe("Navigation Tree Updates", () => {
    it("should update navigation tree for subspace documents", async () => {
      const mockDoc = {
        id: "doc4",
        subspaceId: "sub1",
        parentId: null,
        workspaceId: "ws1",
      };

      mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.doc.update.mockResolvedValue({
        ...mockDoc,
        parentId: "newParent",
      });
      mockPermissionService.getResourcePermissionAbilities.mockResolvedValue({
        read: true,
      });

      const updateNavigationTreeSpy = jest
        .spyOn(service as any, "updateNavigationTreeStructure")
        .mockResolvedValue(undefined);

      const dto = {
        id: "doc4",
        subspaceId: "sub1",
        parentId: "newParent",
        index: "a",
      };
      await service.moveDocs("user1", dto as any);

      expect(updateNavigationTreeSpy).toHaveBeenCalledWith(
        mockDoc,
        expect.objectContaining({ parentId: "newParent" }),
        undefined,
        false
      );
    });

    it("should skip navigation tree updates for my-docs", async () => {
      const mockDoc = {
        id: "doc5",
        subspaceId: null,
        parentId: null,
        workspaceId: "ws1",
      };

      mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.doc.update.mockResolvedValue({
        ...mockDoc,
        index: "d",
      });
      mockPermissionService.getResourcePermissionAbilities.mockResolvedValue({
        read: true,
      });

      const updateNavigationTreeSpy = jest
        .spyOn(service as any, "updateNavigationTreeStructure")
        .mockResolvedValue(undefined);

      const dto = { id: "doc5", subspaceId: null, parentId: null, index: "d" };
      await service.moveDocs("user1", dto as any);

      expect(updateNavigationTreeSpy).not.toHaveBeenCalled();
    });
  });

  describe("WebSocket Events", () => {
    it("should emit correct events for my-docs changes", async () => {
      const mockDoc = {
        id: "doc6",
        subspaceId: null,
        parentId: null,
        workspaceId: "ws1",
      };

      mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.doc.update.mockResolvedValue({
        ...mockDoc,
        index: "e",
      });
      mockPermissionService.getResourcePermissionAbilities.mockResolvedValue({
        read: true,
      });

      const dto = { id: "doc6", subspaceId: null, parentId: null, index: "e" };
      await service.moveDocs("user1", dto as any);

      expect(mockEventPublisher.publishWebsocketEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            myDocsChanged: true,
            subspaceIds: [],
          }),
        })
      );
    });

    it("should emit correct events for subspace changes", async () => {
      const mockDoc = {
        id: "doc7",
        subspaceId: "sub1",
        parentId: null,
        workspaceId: "ws1",
      };

      mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.doc.update.mockResolvedValue({
        ...mockDoc,
        subspaceId: "sub2",
      });
      mockPrisma.subspace.findUnique.mockResolvedValue({
        id: "sub2",
        navigationTree: [],
      });
      mockPrisma.subspace.update.mockResolvedValue({});
      mockPermissionService.getResourcePermissionAbilities.mockResolvedValue({
        read: true,
      });

      jest
        .spyOn(service as any, "updateChildDocumentsSubspace")
        .mockResolvedValue([]);
      jest
        .spyOn(service as any, "updateNavigationTreeStructure")
        .mockResolvedValue(undefined);

      const dto = {
        id: "doc7",
        subspaceId: "sub2",
        parentId: null,
        index: "a",
      };
      await service.moveDocs("user1", dto as any);

      expect(mockEventPublisher.publishWebsocketEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            myDocsChanged: false,
            subspaceIds: [{ id: "sub1" }, { id: "sub2" }],
          }),
        })
      );
    });
  });

  describe("Permission Handling", () => {
    it("should generate permissions for all affected documents", async () => {
      const mockDoc = {
        id: "doc8",
        subspaceId: null,
        parentId: null,
        workspaceId: "ws1",
      };

      mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.doc.update.mockResolvedValue({
        ...mockDoc,
        index: "f",
      });
      mockPermissionService.getResourcePermissionAbilities.mockResolvedValue({
        read: true,
        write: false,
        delete: false,
      });

      const dto = { id: "doc8", subspaceId: null, parentId: null, index: "f" };
      const result = await service.moveDocs("user1", dto as any);

      expect(result.permissions).toEqual({
        doc8: {
          read: true,
          write: false,
          delete: false,
        },
      });
      expect(
        mockPermissionService.getResourcePermissionAbilities
      ).toHaveBeenCalledWith("DOCUMENT", "doc8", "user1");
    });

    it("should call permission inheritance service for moves", async () => {
      const mockDoc = {
        id: "doc9",
        subspaceId: null,
        parentId: null,
        workspaceId: "ws1",
      };

      mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.doc.update.mockResolvedValue({
        ...mockDoc,
        parentId: "newParent",
        index: "g",
      });
      mockPermissionService.getResourcePermissionAbilities.mockResolvedValue({
        read: true,
      });

      const dto = {
        id: "doc9",
        subspaceId: null,
        parentId: "newParent",
        index: "g",
      };
      await service.moveDocs("user1", dto as any);

      expect(
        mockPermissionInheritance.updatePermissionsOnMove
      ).toHaveBeenCalledWith("doc9", "newParent", null);
    });

    it("should handle permissions for multiple affected documents", async () => {
      const mockDoc = {
        id: "parent2",
        subspaceId: null,
        parentId: null,
        workspaceId: "ws1",
      };

      const mockChildren = [
        { id: "child3", parentId: "parent2", subspaceId: null },
        { id: "child4", parentId: "parent2", subspaceId: null },
      ];

      mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.doc.update.mockResolvedValue({
        ...mockDoc,
        subspaceId: "sub1",
      });
      mockPrisma.subspace.findUnique.mockResolvedValue({
        id: "sub1",
        navigationTree: [],
      });
      mockPrisma.subspace.update.mockResolvedValue({});

      // Mock different permissions for each document
      mockPermissionService.getResourcePermissionAbilities
        .mockResolvedValueOnce({ read: true, write: true })
        .mockResolvedValueOnce({ read: true, write: false })
        .mockResolvedValueOnce({ read: false, write: false });

      jest
        .spyOn(service as any, "updateChildDocumentsSubspace")
        .mockResolvedValue(
          mockChildren.map((child) => ({ ...child, subspaceId: "sub1" }))
        );
      jest
        .spyOn(service as any, "updateNavigationTreeStructure")
        .mockResolvedValue(undefined);

      const dto = {
        id: "parent2",
        subspaceId: "sub1",
        parentId: null,
        index: "h",
      };
      const result = await service.moveDocs("user1", dto as any);

      expect(result.permissions).toEqual({
        parent2: { read: true, write: true },
        child3: { read: true, write: false },
        child4: { read: false, write: false },
      });
      expect(
        mockPermissionService.getResourcePermissionAbilities
      ).toHaveBeenCalledTimes(3);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle missing subspace gracefully", async () => {
      const mockDoc = {
        id: "doc10",
        subspaceId: null,
        parentId: null,
        workspaceId: "ws1",
      };

      mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.doc.update.mockResolvedValue({
        ...mockDoc,
        subspaceId: "nonexistent",
      });
      mockPrisma.subspace.findUnique.mockResolvedValue(null);
      mockPermissionService.getResourcePermissionAbilities.mockResolvedValue({
        read: true,
      });

      jest
        .spyOn(service as any, "updateChildDocumentsSubspace")
        .mockResolvedValue([]);
      jest
        .spyOn(service as any, "updateNavigationTreeStructure")
        .mockResolvedValue(undefined);

      const dto = {
        id: "doc10",
        subspaceId: "nonexistent",
        parentId: null,
        index: "i",
      };
      const result = await service.moveDocs("user1", dto as any);

      expect(result.data.documents).toHaveLength(1);
      expect(result.data.documents[0].subspaceId).toBe("nonexistent");
    });

    it("should handle documents without fractional index", async () => {
      const mockDoc = {
        id: "doc11",
        subspaceId: null,
        parentId: null,
        workspaceId: "ws1",
      };

      mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.doc.update.mockResolvedValue({
        ...mockDoc,
        parentId: "parent3",
      });
      mockPermissionService.getResourcePermissionAbilities.mockResolvedValue({
        read: true,
      });

      const dto = { id: "doc11", subspaceId: null, parentId: "parent3" }; // No index provided
      const result = await service.moveDocs("user1", dto as any);

      expect(mockPrisma.doc.update).toHaveBeenCalledWith({
        where: { id: "doc11" },
        data: {
          subspaceId: null,
          parentId: "parent3",
          updatedAt: expect.any(Date),
        },
        include: { subspace: true },
      });
    });

    it("should handle same subspace moves (no subspace change)", async () => {
      const mockDoc = {
        id: "doc12",
        subspaceId: "sub1",
        parentId: null,
        workspaceId: "ws1",
      };

      mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.doc.update.mockResolvedValue({
        ...mockDoc,
        parentId: "newParent",
      });
      mockPermissionService.getResourcePermissionAbilities.mockResolvedValue({
        read: true,
      });

      const updateNavigationTreeSpy = jest
        .spyOn(service as any, "updateNavigationTreeStructure")
        .mockResolvedValue(undefined);
      const updateChildDocumentsSpy = jest
        .spyOn(service as any, "updateChildDocumentsSubspace")
        .mockResolvedValue([]);

      const dto = {
        id: "doc12",
        subspaceId: "sub1",
        parentId: "newParent",
        index: "j",
      };
      await service.moveDocs("user1", dto as any);

      expect(updateChildDocumentsSpy).not.toHaveBeenCalled(); // No subspace change
      expect(updateNavigationTreeSpy).toHaveBeenCalled(); // Still update navigation tree
      expect(mockEventPublisher.publishWebsocketEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            myDocsChanged: false,
            subspaceIds: [{ id: "sub1" }], // Only current subspace
          }),
        })
      );
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle moving document with deep hierarchy", async () => {
      const mockDoc = {
        id: "grandparent",
        subspaceId: null,
        parentId: null,
        workspaceId: "ws1",
      };

      const mockHierarchy = [
        { id: "parent", parentId: "grandparent", subspaceId: null },
        { id: "child1", parentId: "parent", subspaceId: null },
        { id: "child2", parentId: "parent", subspaceId: null },
        { id: "grandchild", parentId: "child1", subspaceId: null },
      ];

      mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.doc.update.mockResolvedValue({
        ...mockDoc,
        subspaceId: "sub1",
      });
      mockPrisma.subspace.findUnique.mockResolvedValue({
        id: "sub1",
        navigationTree: [],
      });
      mockPrisma.subspace.update.mockResolvedValue({});
      mockPermissionService.getResourcePermissionAbilities.mockResolvedValue({
        read: true,
      });

      jest
        .spyOn(service as any, "updateChildDocumentsSubspace")
        .mockResolvedValue(
          mockHierarchy.map((doc) => ({ ...doc, subspaceId: "sub1" }))
        );
      jest
        .spyOn(service as any, "updateNavigationTreeStructure")
        .mockResolvedValue(undefined);

      const dto = {
        id: "grandparent",
        subspaceId: "sub1",
        parentId: null,
        index: "k",
      };
      const result = await service.moveDocs("user1", dto as any);

      expect(result.data.documents).toHaveLength(5); // grandparent + 4 descendants
      expect(
        mockPermissionInheritance.updatePermissionsOnMove
      ).toHaveBeenCalledWith("grandparent", null, "sub1");
    });

    it("should handle concurrent move operations", async () => {
      const mockDoc1 = {
        id: "doc13",
        subspaceId: null,
        parentId: null,
        workspaceId: "ws1",
      };

      const mockDoc2 = {
        id: "doc14",
        subspaceId: null,
        parentId: null,
        workspaceId: "ws1",
      };

      mockPrisma.doc.findUnique
        .mockResolvedValueOnce(mockDoc1)
        .mockResolvedValueOnce(mockDoc2);

      mockPrisma.doc.update
        .mockResolvedValueOnce({ ...mockDoc1, index: "l" })
        .mockResolvedValueOnce({ ...mockDoc2, index: "m" });

      mockPermissionService.getResourcePermissionAbilities.mockResolvedValue({
        read: true,
      });

      const dto1 = {
        id: "doc13",
        subspaceId: null,
        parentId: null,
        index: "l",
      };
      const dto2 = {
        id: "doc14",
        subspaceId: null,
        parentId: null,
        index: "m",
      };

      const [result1, result2] = await Promise.all([
        service.moveDocs("user1", dto1 as any),
        service.moveDocs("user1", dto2 as any),
      ]);

      expect(result1.data.documents[0].id).toBe("doc13");
      expect(result2.data.documents[0].id).toBe("doc14");
      expect(mockPrisma.doc.update).toHaveBeenCalledTimes(2);
    });
  });
});
