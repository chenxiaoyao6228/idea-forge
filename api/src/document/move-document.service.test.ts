import { describe, it, expect, beforeEach, vi } from "vitest";
import { MoveDocumentService } from "./move-document.service";
import { EventPublisherService } from "../_shared/events/event-publisher.service";
import { PermissionInheritanceService } from "../permission/permission-inheritance.service";
import { PermissionService } from "../permission/permission.service";
import { ApiException } from "../_shared/exceptions/api.exception";
import { ServiceTestBuilder } from "@test/helpers/create-service-unit-test";
import { buildDocument, buildSubspace } from "@test/factories";

const createDocumentMocks = () => {
  const mockPrisma = {
    doc: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    subspace: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  const mockEventPublisher = { publishWebsocketEvent: vi.fn() };
  const mockPermissionInheritance = { updatePermissionsOnMove: vi.fn() };
  const mockPermissionService = { getResourcePermissionAbilities: vi.fn() };

  return {
    mockPrisma,
    mockEventPublisher,
    mockPermissionInheritance,
    mockPermissionService,
    resetMocks: () => {
      vi.clearAllMocks();
      mockPermissionService.getResourcePermissionAbilities.mockResolvedValue({
        read: true,
        write: true,
      });
    },
  };
};

describe("MoveDocumentService", () => {
  let service: MoveDocumentService;
  let ctx: any;
  const mocks = createDocumentMocks();

  beforeEach(async () => {
    ctx = await new ServiceTestBuilder(MoveDocumentService)
      .withMockPrisma(mocks.mockPrisma)
      .withProvider({
        provide: EventPublisherService,
        useValue: mocks.mockEventPublisher,
      })
      .withProvider({
        provide: PermissionInheritanceService,
        useValue: mocks.mockPermissionInheritance,
      })
      .withProvider({
        provide: PermissionService,
        useValue: mocks.mockPermissionService,
      })
      .build();
    service = ctx.service;
    mocks.resetMocks();
  });

  describe("moveDocs", () => {
    describe("Document Not Found", () => {
      it("should throw DocumentNotFound when document doesn't exist", async () => {
        mocks.mockPrisma.doc.findUnique.mockResolvedValue(null);
        const dto = buildDocument({ id: "nonexistent" });
        await expect(service.moveDocs("user1", dto)).rejects.toThrow(ApiException);
      });
    });

    describe("My-Docs Operations", () => {
      it("should move document within my-docs with fractional index", async () => {
        const mockDoc = buildDocument({ subspaceId: null, parentId: null });
        mocks.mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
        mocks.mockPrisma.doc.update.mockResolvedValue({
          ...mockDoc,
          index: "b",
          updatedAt: new Date(),
        });

        const result = await service.moveDocs("user1", {
          id: mockDoc.id,
          subspaceId: null,
          parentId: null,
          index: "b",
        });

        expect(mocks.mockPrisma.doc.update).toHaveBeenCalledWith({
          where: { id: mockDoc.id },
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
        const mockDoc = buildDocument({ subspaceId: null, parentId: null });
        mocks.mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
        mocks.mockPrisma.doc.update.mockResolvedValue({
          ...mockDoc,
          parentId: "parent1",
          index: "a",
        });

        await service.moveDocs("user1", {
          id: mockDoc.id,
          subspaceId: null,
          parentId: "parent1",
          index: "a",
        });

        expect(mocks.mockPermissionInheritance.updatePermissionsOnMove).toHaveBeenCalledWith(mockDoc.id, "parent1", null);
      });
    });

    describe("Cross-Subspace Moves", () => {
      it("should move document from my-docs to subspace", async () => {
        const mockDoc = buildDocument({ subspaceId: null, parentId: null });
        const targetSubspace = buildSubspace({ id: "sub1" });
        mocks.mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
        mocks.mockPrisma.doc.update.mockResolvedValue({
          ...mockDoc,
          subspaceId: targetSubspace.id,
        });
        mocks.mockPrisma.subspace.findUnique.mockResolvedValue(targetSubspace);
        mocks.mockPrisma.subspace.update.mockResolvedValue({});

        const result = await service.moveDocs("user1", {
          id: mockDoc.id,
          subspaceId: targetSubspace.id,
          parentId: null,
          index: "a",
        });

        expect(result.data.documents[0].subspaceId).toBe(targetSubspace.id);
        expect(mocks.mockEventPublisher.publishWebsocketEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ myDocsChanged: true }),
          }),
        );
      });

      it("should handle child documents when moving across subspaces", async () => {
        const mockDoc = buildDocument({ subspaceId: null, parentId: null });
        const mockChildren = [buildDocument({ parentId: mockDoc.id, subspaceId: null }), buildDocument({ parentId: mockDoc.id, subspaceId: null })];
        const targetSubspace = buildSubspace({ id: "sub1" });

        mocks.mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
        mocks.mockPrisma.doc.findMany.mockResolvedValue(mockChildren);
        mocks.mockPrisma.doc.update
          .mockResolvedValueOnce({
            ...mockDoc,
            subspaceId: targetSubspace.id,
          })
          .mockResolvedValueOnce({
            ...mockChildren[0],
            subspaceId: targetSubspace.id,
          })
          .mockResolvedValueOnce({
            ...mockChildren[1],
            subspaceId: targetSubspace.id,
          });

        mocks.mockPrisma.subspace.findUnique.mockResolvedValue(targetSubspace);
        mocks.mockPrisma.subspace.update.mockResolvedValue({});

        const result = await service.moveDocs("user1", {
          id: mockDoc.id,
          subspaceId: targetSubspace.id,
          parentId: null,
          index: "a",
        });

        expect(result.data.documents).toHaveLength(3);
        result.data.documents.forEach((doc) => {
          expect(doc.subspaceId).toBe(targetSubspace.id);
        });
      });
    });

    describe("Navigation Tree Updates", () => {
      it("should update navigation tree for subspace documents", async () => {
        const mockDoc = buildDocument({ subspaceId: "sub1", parentId: null });
        mocks.mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
        mocks.mockPrisma.doc.update.mockResolvedValue({
          ...mockDoc,
          parentId: "newParent",
        });

        await service.moveDocs("user1", {
          id: mockDoc.id,
          subspaceId: "sub1",
          parentId: "newParent",
          index: "a",
        });

        expect(mocks.mockPrisma.subspace.update).toHaveBeenCalled();
      });

      it("should skip navigation tree updates for my-docs", async () => {
        const mockDoc = buildDocument({ subspaceId: null, parentId: null });
        mocks.mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
        mocks.mockPrisma.doc.update.mockResolvedValue({
          ...mockDoc,
          index: "d",
        });

        await service.moveDocs("user1", {
          id: mockDoc.id,
          subspaceId: null,
          parentId: null,
          index: "d",
        });

        expect(mocks.mockPrisma.subspace.update).not.toHaveBeenCalled();
      });
    });

    describe("WebSocket Events", () => {
      it("should emit correct events for my-docs changes", async () => {
        const mockDoc = buildDocument({ subspaceId: null, parentId: null });
        mocks.mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
        mocks.mockPrisma.doc.update.mockResolvedValue({
          ...mockDoc,
          index: "e",
        });

        await service.moveDocs("user1", {
          id: mockDoc.id,
          subspaceId: null,
          parentId: null,
          index: "e",
        });

        expect(mocks.mockEventPublisher.publishWebsocketEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              myDocsChanged: true,
              subspaceIds: [],
            }),
          }),
        );
      });

      it("should emit correct events for subspace changes", async () => {
        const mockDoc = buildDocument({ subspaceId: "sub1", parentId: null });
        mocks.mockPrisma.doc.findUnique.mockResolvedValue(mockDoc);
        mocks.mockPrisma.doc.update.mockResolvedValue({
          ...mockDoc,
          subspaceId: "sub2",
        });
        mocks.mockPrisma.subspace.findUnique.mockResolvedValue(buildSubspace({ id: "sub2" }));
        mocks.mockPrisma.subspace.update.mockResolvedValue({});

        await service.moveDocs("user1", {
          id: mockDoc.id,
          subspaceId: "sub2",
          parentId: null,
          index: "a",
        });

        expect(mocks.mockEventPublisher.publishWebsocketEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              myDocsChanged: false,
              subspaceIds: [{ id: "sub1" }, { id: "sub2" }],
            }),
          }),
        );
      });
    });
  });
});
