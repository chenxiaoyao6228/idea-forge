import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { PublicShareService } from "./public-share.service";
import { DocPermissionResolveService } from "@/permission/document-permission.service";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { getTestPrisma, clearDatabase, startContainersAndWriteEnv, stopContainers } from "@test/setup/test-container-setup";
import { buildDocument, buildUser, buildWorkspace, buildPublicShare } from "@test/factories/prisma";
import { PermissionLevel } from "@idea/contracts";

describe("PublicShareService (Integration)", () => {
  let service: PublicShareService;
  let prisma: any;
  let mockDocPermissionService: any;
  let mockEventPublisher: any;

  beforeAll(async () => {
    await startContainersAndWriteEnv();
    prisma = getTestPrisma();
  });

  afterAll(async () => {
    await stopContainers();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Mock DocPermissionResolveService
    mockDocPermissionService = {
      resolveUserPermissionForDocument: vi.fn(),
    };

    // Mock EventPublisherService
    mockEventPublisher = {
      publishWebsocketEvent: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicShareService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: DocPermissionResolveService,
          useValue: mockDocPermissionService,
        },
        {
          provide: EventPublisherService,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    service = module.get<PublicShareService>(PublicShareService);
  });

  describe("getOrCreateShare", () => {
    it("should create a new public share when none exists", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace({ allowPublicSharing: true });
      const doc = await buildDocument({ workspaceId: workspace.id, authorId: user.id });

      // Mock MANAGE permission
      mockDocPermissionService.resolveUserPermissionForDocument.mockResolvedValue({
        level: PermissionLevel.MANAGE,
      });

      const result = await service.getOrCreateShare(user.id, {
        documentId: doc.id,
        workspaceId: workspace.id,
        duration: "NEVER",
      });

      expect(result.created).toBe(true);
      expect(result.data).toMatchObject({
        docId: doc.id,
        workspaceId: workspace.id,
        published: true,
        revokedAt: null,
      });
      expect(result.data.token).toBeTruthy();
      expect(result.data.url).toContain(`/public/${result.data.token}`);

      // Verify WebSocket event was published
      expect(mockEventPublisher.publishWebsocketEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "PUBLIC_SHARE_CREATED",
          workspaceId: workspace.id,
          actorId: user.id,
        }),
      );
    });

    it("should return existing share when one already exists (upsert pattern)", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace({ allowPublicSharing: true });
      const doc = await buildDocument({ workspaceId: workspace.id, authorId: user.id });

      // Create existing share
      const existingShare = await buildPublicShare({
        docId: doc.id,
        workspaceId: workspace.id,
        authorId: user.id,
      });

      mockDocPermissionService.resolveUserPermissionForDocument.mockResolvedValue({
        level: PermissionLevel.MANAGE,
      });

      const result = await service.getOrCreateShare(user.id, {
        documentId: doc.id,
        workspaceId: workspace.id,
        duration: "NEVER",
      });

      expect(result.created).toBe(false);
      expect(result.data.id).toBe(existingShare.id);
      expect(result.data.token).toBe(existingShare.token);

      // Should NOT publish event for existing share
      expect(mockEventPublisher.publishWebsocketEvent).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenException when workspace disallows public sharing", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace({ allowPublicSharing: false });
      const doc = await buildDocument({ workspaceId: workspace.id, authorId: user.id });

      await expect(
        service.getOrCreateShare(user.id, {
          documentId: doc.id,
          workspaceId: workspace.id,
          duration: "NEVER",
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw ForbiddenException when user lacks MANAGE permission", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace({ allowPublicSharing: true });
      const doc = await buildDocument({ workspaceId: workspace.id });

      // Mock READ permission (not MANAGE)
      mockDocPermissionService.resolveUserPermissionForDocument.mockResolvedValue({
        level: PermissionLevel.READ,
      });

      await expect(
        service.getOrCreateShare(user.id, {
          documentId: doc.id,
          workspaceId: workspace.id,
          duration: "NEVER",
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should create share with expiration when duration is specified", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace({ allowPublicSharing: true });
      const doc = await buildDocument({ workspaceId: workspace.id, authorId: user.id });

      mockDocPermissionService.resolveUserPermissionForDocument.mockResolvedValue({
        level: PermissionLevel.MANAGE,
      });

      const result = await service.getOrCreateShare(user.id, {
        documentId: doc.id,
        workspaceId: workspace.id,
        duration: "ONE_HOUR",
      });

      expect(result.data.expiresAt).toBeTruthy();
      const expiresAt = new Date(result.data.expiresAt!);
      const now = new Date();
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);
      expect(diffMinutes).toBeGreaterThan(55); // ~1 hour
      expect(diffMinutes).toBeLessThan(65);
    });
  });

  describe("updateShare", () => {
    it("should update share expiration", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace();
      const doc = await buildDocument({ workspaceId: workspace.id, authorId: user.id });
      const share = await buildPublicShare({
        docId: doc.id,
        workspaceId: workspace.id,
        authorId: user.id,
        expiresAt: null,
      });

      mockDocPermissionService.resolveUserPermissionForDocument.mockResolvedValue({
        level: PermissionLevel.MANAGE,
      });

      const result = await service.updateShare(user.id, share.id, {
        duration: "ONE_DAY",
      });

      expect(result.data.expiresAt).toBeTruthy();
      const expiresAt = new Date(result.data.expiresAt!);
      const now = new Date();
      const diffHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(23);
      expect(diffHours).toBeLessThan(25);

      // Verify WebSocket event was published
      expect(mockEventPublisher.publishWebsocketEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "PUBLIC_SHARE_UPDATED",
        }),
      );
    });

    it("should update custom URL slug", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace();
      const doc = await buildDocument({ workspaceId: workspace.id, authorId: user.id });
      const share = await buildPublicShare({
        docId: doc.id,
        workspaceId: workspace.id,
        authorId: user.id,
      });

      mockDocPermissionService.resolveUserPermissionForDocument.mockResolvedValue({
        level: PermissionLevel.MANAGE,
      });

      const result = await service.updateShare(user.id, share.id, {
        urlId: "custom-slug",
      });

      expect(result.data.urlId).toBe("custom-slug");
    });

    it("should throw NotFoundException for non-existent share", async () => {
      const user = await buildUser();

      await expect(
        service.updateShare(user.id, "non-existent-id", {
          duration: "ONE_DAY",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user lacks MANAGE permission", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace();
      const doc = await buildDocument({ workspaceId: workspace.id });
      const share = await buildPublicShare({
        docId: doc.id,
        workspaceId: workspace.id,
        authorId: user.id,
      });

      mockDocPermissionService.resolveUserPermissionForDocument.mockResolvedValue({
        level: PermissionLevel.EDIT,
      });

      await expect(
        service.updateShare(user.id, share.id, {
          duration: "ONE_DAY",
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("revokeShare", () => {
    it("should soft delete share by setting revokedAt", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace();
      const doc = await buildDocument({ workspaceId: workspace.id, authorId: user.id });
      const share = await buildPublicShare({
        docId: doc.id,
        workspaceId: workspace.id,
        authorId: user.id,
      });

      mockDocPermissionService.resolveUserPermissionForDocument.mockResolvedValue({
        level: PermissionLevel.MANAGE,
      });

      const result = await service.revokeShare(user.id, { id: share.id });

      expect(result.success).toBe(true);

      // Verify share is soft deleted
      const updatedShare = await prisma.publicShare.findUnique({
        where: { id: share.id },
      });
      expect(updatedShare.revokedAt).toBeTruthy();

      // Verify WebSocket event
      expect(mockEventPublisher.publishWebsocketEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "PUBLIC_SHARE_REVOKED",
        }),
      );
    });

    it("should throw NotFoundException for non-existent share", async () => {
      const user = await buildUser();

      await expect(service.revokeShare(user.id, { id: "non-existent-id" })).rejects.toThrow(NotFoundException);
    });
  });

  describe("listShares", () => {
    it("should return paginated list of shares for documents user can manage", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace();
      const doc1 = await buildDocument({ workspaceId: workspace.id, authorId: user.id });
      const doc2 = await buildDocument({ workspaceId: workspace.id, authorId: user.id });

      await buildPublicShare({ docId: doc1.id, workspaceId: workspace.id, authorId: user.id });
      await buildPublicShare({ docId: doc2.id, workspaceId: workspace.id, authorId: user.id });

      mockDocPermissionService.resolveUserPermissionForDocument.mockResolvedValue({
        level: PermissionLevel.MANAGE,
      });

      const result = await service.listShares(user.id, {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      expect(result.data.length).toBe(2);
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 2,
      });
    });

    it("should filter out shares for documents user cannot manage", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace();
      const doc1 = await buildDocument({ workspaceId: workspace.id });
      const doc2 = await buildDocument({ workspaceId: workspace.id });

      await buildPublicShare({ docId: doc1.id, workspaceId: workspace.id, authorId: user.id });
      await buildPublicShare({ docId: doc2.id, workspaceId: workspace.id, authorId: user.id });

      // User only has MANAGE on doc1
      mockDocPermissionService.resolveUserPermissionForDocument.mockImplementation(async (_userId: string, doc: any) => {
        if (doc.id === doc1.id) {
          return { level: PermissionLevel.MANAGE };
        }
        return { level: PermissionLevel.READ };
      });

      const result = await service.listShares(user.id, {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      expect(result.data.length).toBe(1);
      expect(result.data[0].docId).toBe(doc1.id);
    });
  });

  describe("getShareById", () => {
    it("should return share details for user with MANAGE permission", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace();
      const doc = await buildDocument({ workspaceId: workspace.id, authorId: user.id });
      const share = await buildPublicShare({
        docId: doc.id,
        workspaceId: workspace.id,
        authorId: user.id,
      });

      mockDocPermissionService.resolveUserPermissionForDocument.mockResolvedValue({
        level: PermissionLevel.MANAGE,
      });

      const result = await service.getShareById(user.id, share.id);

      expect(result.data.id).toBe(share.id);
      expect(result.data.token).toBe(share.token);
    });

    it("should throw ForbiddenException when user lacks MANAGE permission", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace();
      const doc = await buildDocument({ workspaceId: workspace.id });
      const share = await buildPublicShare({
        docId: doc.id,
        workspaceId: workspace.id,
        authorId: user.id,
      });

      mockDocPermissionService.resolveUserPermissionForDocument.mockResolvedValue({
        level: PermissionLevel.READ,
      });

      await expect(service.getShareById(user.id, share.id)).rejects.toThrow(ForbiddenException);
    });
  });

  describe("getShareByDocId", () => {
    it("should return share by document ID", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace();
      const doc = await buildDocument({ workspaceId: workspace.id, authorId: user.id });
      const share = await buildPublicShare({
        docId: doc.id,
        workspaceId: workspace.id,
        authorId: user.id,
      });

      mockDocPermissionService.resolveUserPermissionForDocument.mockResolvedValue({
        level: PermissionLevel.MANAGE,
      });

      const result = await service.getShareByDocId(user.id, doc.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(share.id);
      expect(result!.docId).toBe(doc.id);
    });

    it("should return null when no share exists for document", async () => {
      const user = await buildUser();
      const workspace = await buildWorkspace();
      const doc = await buildDocument({ workspaceId: workspace.id, authorId: user.id });

      mockDocPermissionService.resolveUserPermissionForDocument.mockResolvedValue({
        level: PermissionLevel.MANAGE,
      });

      const result = await service.getShareByDocId(user.id, doc.id);

      expect(result).toBeNull();
    });
  });

  describe("getPublicDocument", () => {
    it("should return public document with children for valid token", async () => {
      const workspace = await buildWorkspace();
      const parentDoc = await buildDocument({ workspaceId: workspace.id });
      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        parentId: parentDoc.id,
      });

      const share = await buildPublicShare({
        docId: parentDoc.id,
        workspaceId: workspace.id,
      });

      const mockRequest = {
        headers: { "user-agent": "Mozilla/5.0" },
      };

      const result = await service.getPublicDocument(share.token, mockRequest);

      expect(result.doc.id).toBe(parentDoc.id);
      expect(result.doc.title).toBe(parentDoc.title);
      expect(result.navigationTree.children?.length).toBe(1);
      expect(result.navigationTree.children?.[0].id).toBe(childDoc.id);
      expect(result.share.viewCount).toBeGreaterThanOrEqual(1); // View was tracked

      // Verify view was incremented in database
      const updatedShare = await prisma.publicShare.findUnique({
        where: { id: share.id },
      });
      expect(updatedShare.views).toBe(1);
      expect(updatedShare.lastAccessedAt).toBeTruthy();
    });

    it("should find share by custom URL slug", async () => {
      const workspace = await buildWorkspace();
      const doc = await buildDocument({ workspaceId: workspace.id });
      await buildPublicShare({
        docId: doc.id,
        workspaceId: workspace.id,
        urlId: "custom-slug",
      });

      const mockRequest = {
        headers: { "user-agent": "Mozilla/5.0" },
      };

      const result = await service.getPublicDocument("custom-slug", mockRequest);

      expect(result.doc.id).toBe(doc.id);
    });

    it("should throw ForbiddenException for revoked share", async () => {
      const workspace = await buildWorkspace();
      const doc = await buildDocument({ workspaceId: workspace.id });
      const share = await buildPublicShare({
        docId: doc.id,
        workspaceId: workspace.id,
        revokedAt: new Date(),
      });

      const mockRequest = {
        headers: { "user-agent": "Mozilla/5.0" },
      };

      await expect(service.getPublicDocument(share.token, mockRequest)).rejects.toThrow(ForbiddenException);
    });

    it("should throw ForbiddenException for expired share", async () => {
      const workspace = await buildWorkspace();
      const doc = await buildDocument({ workspaceId: workspace.id });
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      const share = await buildPublicShare({
        docId: doc.id,
        workspaceId: workspace.id,
        expiresAt: pastDate,
      });

      const mockRequest = {
        headers: { "user-agent": "Mozilla/5.0" },
      };

      await expect(service.getPublicDocument(share.token, mockRequest)).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException for deleted document", async () => {
      const workspace = await buildWorkspace();
      const doc = await buildDocument({
        workspaceId: workspace.id,
        deletedAt: new Date(),
      });
      const share = await buildPublicShare({
        docId: doc.id,
        workspaceId: workspace.id,
      });

      const mockRequest = {
        headers: { "user-agent": "Mozilla/5.0" },
      };

      await expect(service.getPublicDocument(share.token, mockRequest)).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException for archived document", async () => {
      const workspace = await buildWorkspace();
      const doc = await buildDocument({
        workspaceId: workspace.id,
        archivedAt: new Date(),
      });
      const share = await buildPublicShare({
        docId: doc.id,
        workspaceId: workspace.id,
      });

      const mockRequest = {
        headers: { "user-agent": "Mozilla/5.0" },
      };

      await expect(service.getPublicDocument(share.token, mockRequest)).rejects.toThrow(ForbiddenException);
    });

    it("should not increment view count for bot traffic", async () => {
      const workspace = await buildWorkspace();
      const doc = await buildDocument({ workspaceId: workspace.id });
      const share = await buildPublicShare({
        docId: doc.id,
        workspaceId: workspace.id,
      });

      const mockRequest = {
        headers: { "user-agent": "Googlebot/2.1" }, // Bot user agent
      };

      await service.getPublicDocument(share.token, mockRequest);

      // Verify view was NOT incremented
      const updatedShare = await prisma.publicShare.findUnique({
        where: { id: share.id },
      });
      expect(updatedShare.views).toBe(0);
    });
  });

  describe("getPublicNestedDocument", () => {
    it("should return nested child document for valid descendant", async () => {
      const workspace = await buildWorkspace();
      const parentDoc = await buildDocument({ workspaceId: workspace.id });
      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        parentId: parentDoc.id,
      });
      const grandchildDoc = await buildDocument({
        workspaceId: workspace.id,
        parentId: childDoc.id,
      });

      const share = await buildPublicShare({
        docId: parentDoc.id,
        workspaceId: workspace.id,
      });

      const mockRequest = {
        headers: { "user-agent": "Mozilla/5.0" },
      };

      const result = await service.getPublicNestedDocument(share.token, grandchildDoc.id, mockRequest);

      expect(result.doc.id).toBe(grandchildDoc.id);
      expect(result.navigationTree.children?.length).toBe(0); // grandchild has no children
    });

    it("should throw NotFoundException for non-descendant document", async () => {
      const workspace = await buildWorkspace();
      const parentDoc = await buildDocument({ workspaceId: workspace.id });
      const unrelatedDoc = await buildDocument({ workspaceId: workspace.id });

      const share = await buildPublicShare({
        docId: parentDoc.id,
        workspaceId: workspace.id,
      });

      const mockRequest = {
        headers: { "user-agent": "Mozilla/5.0" },
      };

      await expect(service.getPublicNestedDocument(share.token, unrelatedDoc.id, mockRequest)).rejects.toThrow(NotFoundException);
    });

    it("should validate share status before allowing nested access", async () => {
      const workspace = await buildWorkspace();
      const parentDoc = await buildDocument({ workspaceId: workspace.id });
      const childDoc = await buildDocument({
        workspaceId: workspace.id,
        parentId: parentDoc.id,
      });

      const share = await buildPublicShare({
        docId: parentDoc.id,
        workspaceId: workspace.id,
        revokedAt: new Date(),
      });

      const mockRequest = {
        headers: { "user-agent": "Mozilla/5.0" },
      };

      await expect(service.getPublicNestedDocument(share.token, childDoc.id, mockRequest)).rejects.toThrow(ForbiddenException);
    });
  });

  describe("Database Constraints", () => {
    it("should enforce unique docId constraint (one share per document)", async () => {
      const workspace = await buildWorkspace();
      const doc = await buildDocument({ workspaceId: workspace.id });

      await buildPublicShare({
        docId: doc.id,
        workspaceId: workspace.id,
      });

      // Attempt to create second share for same document
      await expect(
        buildPublicShare({
          docId: doc.id,
          workspaceId: workspace.id,
        }),
      ).rejects.toThrow();
    });

    it("should enforce unique token constraint", async () => {
      const workspace = await buildWorkspace();
      const doc1 = await buildDocument({ workspaceId: workspace.id });
      const doc2 = await buildDocument({ workspaceId: workspace.id });

      const token = "duplicate-token-123";

      await buildPublicShare({
        docId: doc1.id,
        workspaceId: workspace.id,
        token,
      });

      // Attempt to create share with same token
      await expect(
        buildPublicShare({
          docId: doc2.id,
          workspaceId: workspace.id,
          token,
        }),
      ).rejects.toThrow();
    });

    it("should cascade delete share when document is deleted", async () => {
      const workspace = await buildWorkspace();
      const doc = await buildDocument({ workspaceId: workspace.id });
      await buildPublicShare({
        docId: doc.id,
        workspaceId: workspace.id,
      });

      // Delete document
      await prisma.doc.delete({ where: { id: doc.id } });

      // Verify share is also deleted
      const shares = await prisma.publicShare.findMany({
        where: { docId: doc.id },
      });
      expect(shares.length).toBe(0);
    });
  });
});
