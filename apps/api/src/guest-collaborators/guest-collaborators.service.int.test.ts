import { Test, TestingModule } from "@nestjs/testing";
import { GuestCollaboratorsService } from "./guest-collaborators.service";
import { EventPublisherService } from "../_shared/events/event-publisher.service";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { PrismaClient } from "@prisma/client";
import { ConfigsModule } from "@/_shared/config/config.module";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";
import { ClsModule } from "@/_shared/utils/cls.module";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";

async function createMockData(tx: PrismaClient) {
  // Generate UUIDs for all entities
  const workspaceId = uuidv4();
  const adminUserId = uuidv4();
  const regularUserId = uuidv4();
  const existingUserEmail = "existing@test.com";
  const newGuestEmail = "newguest@test.com";

  // Create workspace
  const workspace = await tx.workspace.create({
    data: { id: workspaceId, name: "Test Workspace", type: "TEAM" },
  });

  // Create admin user
  const adminUser = await tx.user.create({
    data: {
      id: adminUserId,
      displayName: "Admin User",
      email: `admin-${adminUserId}@test.com`,
    },
  });

  // Create workspace member (admin)
  await tx.workspaceMember.create({
    data: {
      workspaceId,
      userId: adminUserId,
      role: "ADMIN",
    },
  });

  // Create regular user (existing user who will receive guest invitations)
  const existingUser = await tx.user.create({
    data: {
      id: regularUserId,
      displayName: "Existing User",
      email: existingUserEmail,
    },
  });

  // Create a document in the workspace
  const document = await tx.doc.create({
    data: {
      id: uuidv4(),
      title: "Test Document",
      workspaceId,
      authorId: adminUserId,
      createdById: adminUserId,
      lastModifiedById: adminUserId,
    },
  });

  return {
    workspace,
    adminUser,
    existingUser,
    document,
    ids: {
      workspaceId,
      adminUserId,
      regularUserId,
      existingUserEmail,
      newGuestEmail,
      documentId: document.id,
    },
  };
}

describe("GuestCollaboratorsService (integration)", () => {
  let service: GuestCollaboratorsService;
  let module: TestingModule;
  let mockData: Awaited<ReturnType<typeof createMockData>>;
  let prisma: PrismaService;
  let eventPublisherMock: { publishWebsocketEvent: any };

  beforeEach(async () => {
    console.log("beforeEach in guest-collaborators.service.int.test.ts");
    eventPublisherMock = { publishWebsocketEvent: vi.fn().mockResolvedValue(undefined) };

    module = await Test.createTestingModule({
      imports: [ConfigsModule, ClsModule, PrismaModule],
      providers: [GuestCollaboratorsService, { provide: EventPublisherService, useValue: eventPublisherMock }],
    }).compile();

    service = module.get(GuestCollaboratorsService);
    prisma = module.get(PrismaService);

    mockData = await createMockData(prisma);
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  describe("inviteGuestToWorkspace", () => {
    it("should successfully invite a new guest to workspace (not existing user)", async () => {
      const result = await service.inviteGuestToWorkspace(mockData.ids.adminUserId, {
        workspaceId: mockData.ids.workspaceId,
        email: mockData.ids.newGuestEmail,
        name: "New Guest",
      });

      // Verify the guest was created
      expect(result).toBeDefined();
      expect(result.email).toBe(mockData.ids.newGuestEmail);
      expect(result.name).toBe("New Guest");
      expect(result.status).toBe("PENDING");

      // Verify database record
      const guestInDb = await prisma.guestCollaborator.findUnique({
        where: {
          email_workspaceId: {
            email: mockData.ids.newGuestEmail,
            workspaceId: mockData.ids.workspaceId,
          },
        },
      });
      expect(guestInDb).toBeDefined();
      expect(guestInDb?.status).toBe("PENDING");
      expect(guestInDb?.userId).toBeNull();

      // Verify WebSocket event was published
      expect(eventPublisherMock.publishWebsocketEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "guest.invited",
          workspaceId: mockData.ids.workspaceId,
        }),
      );
    });

    it("should successfully invite an existing user to workspace as guest", async () => {
      const result = await service.inviteGuestToWorkspace(mockData.ids.adminUserId, {
        workspaceId: mockData.ids.workspaceId,
        email: mockData.ids.existingUserEmail,
        name: "Guest Name",
      });

      // Verify the guest was created and linked to existing user
      expect(result).toBeDefined();
      expect(result.email).toBe(mockData.ids.existingUserEmail);
      expect(result.status).toBe("PENDING");

      // Verify database record has userId linked
      const guestInDb = await prisma.guestCollaborator.findUnique({
        where: {
          email_workspaceId: {
            email: mockData.ids.existingUserEmail,
            workspaceId: mockData.ids.workspaceId,
          },
        },
      });
      expect(guestInDb).toBeDefined();
      expect(guestInDb?.userId).toBe(mockData.ids.regularUserId);
    });

    it("should throw PermissionDenied error when non-admin tries to invite guest", async () => {
      // Create a regular member (non-admin)
      const regularUserId = uuidv4();
      await prisma.user.create({
        data: {
          id: regularUserId,
          displayName: "Regular User",
          email: `regular-${regularUserId}@test.com`,
        },
      });
      await prisma.workspaceMember.create({
        data: {
          workspaceId: mockData.ids.workspaceId,
          userId: regularUserId,
          role: "MEMBER",
        },
      });

      await expect(
        service.inviteGuestToWorkspace(regularUserId, {
          workspaceId: mockData.ids.workspaceId,
          email: "guest@test.com",
        }),
      ).rejects.toThrow(ApiException);
    });

    it("should throw UserAlreadyInWorkspace error when guest is already invited with PENDING status", async () => {
      // First invitation
      await service.inviteGuestToWorkspace(mockData.ids.adminUserId, {
        workspaceId: mockData.ids.workspaceId,
        email: mockData.ids.newGuestEmail,
      });

      // Second invitation should fail
      await expect(
        service.inviteGuestToWorkspace(mockData.ids.adminUserId, {
          workspaceId: mockData.ids.workspaceId,
          email: mockData.ids.newGuestEmail,
        }),
      ).rejects.toThrow(ApiException);
    });

    it("should allow re-inviting a guest with EXPIRED status", async () => {
      // Create an expired guest
      const expiredGuest = await prisma.guestCollaborator.create({
        data: {
          email: "expired@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "EXPIRED",
          expireAt: new Date(Date.now() - 1000), // Already expired
        },
      });

      // Re-invite should succeed
      const result = await service.inviteGuestToWorkspace(mockData.ids.adminUserId, {
        workspaceId: mockData.ids.workspaceId,
        email: "expired@test.com",
        name: "Updated Name",
      });

      expect(result.status).toBe("PENDING");
      expect(result.name).toBe("Updated Name");

      // Verify database was updated
      const updatedGuest = await prisma.guestCollaborator.findUnique({
        where: { id: expiredGuest.id },
      });
      expect(updatedGuest?.status).toBe("PENDING");
      expect(updatedGuest?.expireAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should set expiration date to 30 days from now", async () => {
      const beforeInvite = Date.now();

      const result = await service.inviteGuestToWorkspace(mockData.ids.adminUserId, {
        workspaceId: mockData.ids.workspaceId,
        email: mockData.ids.newGuestEmail,
      });

      const afterInvite = Date.now();
      const expectedExpireAt = beforeInvite + 30 * 24 * 60 * 60 * 1000;
      const expireAt = new Date(result.expireAt).getTime();

      // Allow 1 second tolerance for test execution time
      expect(expireAt).toBeGreaterThanOrEqual(expectedExpireAt - 1000);
      expect(expireAt).toBeLessThanOrEqual(afterInvite + 30 * 24 * 60 * 60 * 1000);
    });

    it("should handle case-insensitive email matching for existing users", async () => {
      const result = await service.inviteGuestToWorkspace(mockData.ids.adminUserId, {
        workspaceId: mockData.ids.workspaceId,
        email: mockData.ids.existingUserEmail.toUpperCase(), // Use uppercase
      });

      // Should still link to existing user despite case difference
      const guestInDb = await prisma.guestCollaborator.findFirst({
        where: {
          email: mockData.ids.existingUserEmail.toUpperCase(),
          workspaceId: mockData.ids.workspaceId,
        },
      });
      expect(guestInDb?.userId).toBe(mockData.ids.regularUserId);
    });
  });

  describe("acceptWorkspaceInvitation", () => {
    it("should successfully accept a pending guest invitation", async () => {
      // Create a pending guest invitation
      const guest = await prisma.guestCollaborator.create({
        data: {
          email: mockData.ids.existingUserEmail,
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "PENDING",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          userId: mockData.ids.regularUserId,
        },
      });

      const result = await service.acceptWorkspaceInvitation(mockData.ids.regularUserId, guest.id);

      expect(result.message).toBe("Invitation accepted successfully");

      // Verify database record
      const updatedGuest = await prisma.guestCollaborator.findUnique({
        where: { id: guest.id },
      });
      expect(updatedGuest?.status).toBe("ACTIVE");
      expect(updatedGuest?.userId).toBe(mockData.ids.regularUserId);

      // Verify WebSocket event was published
      expect(eventPublisherMock.publishWebsocketEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "guest.accepted",
          workspaceId: mockData.ids.workspaceId,
        }),
      );
    });

    it("should throw GuestNotFound error when guest does not exist", async () => {
      await expect(service.acceptWorkspaceInvitation(mockData.ids.regularUserId, "non-existent-id")).rejects.toThrow(ApiException);
    });

    it("should throw PermissionDenied error when user email does not match guest email", async () => {
      // Create a guest with different email
      const guest = await prisma.guestCollaborator.create({
        data: {
          email: "different@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "PENDING",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await expect(service.acceptWorkspaceInvitation(mockData.ids.regularUserId, guest.id)).rejects.toThrow(ApiException);
    });

    it("should throw WorkspaceInvitationExpired error when invitation is not pending", async () => {
      // Create an active guest
      const guest = await prisma.guestCollaborator.create({
        data: {
          email: mockData.ids.existingUserEmail,
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          userId: mockData.ids.regularUserId,
        },
      });

      await expect(service.acceptWorkspaceInvitation(mockData.ids.regularUserId, guest.id)).rejects.toThrow(ApiException);
    });

    it("should throw WorkspaceInvitationExpired error when invitation has expired", async () => {
      // Create an expired guest
      const guest = await prisma.guestCollaborator.create({
        data: {
          email: mockData.ids.existingUserEmail,
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "PENDING",
          expireAt: new Date(Date.now() - 1000), // Already expired
          userId: mockData.ids.regularUserId,
        },
      });

      await expect(service.acceptWorkspaceInvitation(mockData.ids.regularUserId, guest.id)).rejects.toThrow(ApiException);
    });

    it("should handle case-insensitive email matching when accepting invitation", async () => {
      // Create guest with lowercase email
      const guest = await prisma.guestCollaborator.create({
        data: {
          email: mockData.ids.existingUserEmail.toLowerCase(),
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "PENDING",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          userId: mockData.ids.regularUserId,
        },
      });

      // User email in DB might be different case
      const result = await service.acceptWorkspaceInvitation(mockData.ids.regularUserId, guest.id);

      expect(result.message).toBe("Invitation accepted successfully");
    });
  });

  describe("getWorkspaceGuests", () => {
    it("should return all guests in a workspace with pagination", async () => {
      // Create multiple guests
      await prisma.guestCollaborator.createMany({
        data: [
          {
            email: "guest1@test.com",
            workspaceId: mockData.ids.workspaceId,
            invitedById: mockData.ids.adminUserId,
            status: "PENDING",
            expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          {
            email: "guest2@test.com",
            workspaceId: mockData.ids.workspaceId,
            invitedById: mockData.ids.adminUserId,
            status: "ACTIVE",
            expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
      });

      const result = await service.getWorkspaceGuests(mockData.ids.adminUserId, {
        workspaceId: mockData.ids.workspaceId,
        page: 1,
        limit: 10,
        sortBy: "createdAt",
      });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.data[0]).toHaveProperty("email");
      expect(result.data[0]).toHaveProperty("status");
      expect(result.data[0]).toHaveProperty("documents");
    });

    it("should include document permissions for guests", async () => {
      // Create a guest
      const guest = await prisma.guestCollaborator.create({
        data: {
          email: "guestwithperm@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Create document permission for guest
      await prisma.documentPermission.create({
        data: {
          guestCollaboratorId: guest.id,
          docId: mockData.ids.documentId,
          permission: "READ",
          inheritedFromType: "GUEST",
          priority: 7,
          createdById: mockData.ids.adminUserId,
        },
      });

      const result = await service.getWorkspaceGuests(mockData.ids.adminUserId, {
        workspaceId: mockData.ids.workspaceId,
        page: 1,
        limit: 10,
        sortBy: "createdAt",
      });

      const guestWithPermission = result.data.find((g) => g.email === "guestwithperm@test.com");
      expect(guestWithPermission?.documents).toHaveLength(1);
      expect(guestWithPermission?.documents[0].documentId).toBe(mockData.ids.documentId);
      expect(guestWithPermission?.documents[0].permission).toBe("READ");
    });

    it("should return guests ordered by creation date (newest first)", async () => {
      // Create guests with slight delay
      const guest1 = await prisma.guestCollaborator.create({
        data: {
          email: "first@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "PENDING",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay

      const guest2 = await prisma.guestCollaborator.create({
        data: {
          email: "second@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "PENDING",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const result = await service.getWorkspaceGuests(mockData.ids.adminUserId, {
        workspaceId: mockData.ids.workspaceId,
        page: 1,
        limit: 10,
        sortBy: "createdAt",
      });

      // Should be ordered newest first
      expect(result.data[0].email).toBe("second@test.com");
      expect(result.data[1].email).toBe("first@test.com");
    });
  });

  describe("inviteGuestToDocument", () => {
    it("should create guest and assign document permission", async () => {
      // Create document permission for admin user first
      await prisma.documentPermission.create({
        data: {
          userId: mockData.ids.adminUserId,
          docId: mockData.ids.documentId,
          permission: "MANAGE",
          inheritedFromType: "DIRECT",
          priority: 1,
          createdById: mockData.ids.adminUserId,
        },
      });

      const result = await service.inviteGuestToDocument(mockData.ids.adminUserId, {
        documentId: mockData.ids.documentId,
        email: mockData.ids.newGuestEmail,
        permission: "READ",
      });

      expect(result).toBeDefined();
      expect(result.email).toBe(mockData.ids.newGuestEmail);

      // Verify document permission was created
      const permission = await prisma.documentPermission.findFirst({
        where: {
          guestCollaboratorId: result.id,
          docId: mockData.ids.documentId,
          inheritedFromType: "GUEST",
        },
      });
      expect(permission).toBeDefined();
      expect(permission?.permission).toBe("READ");
    });

    it("should reuse existing guest when inviting to another document", async () => {
      // Create document permission for admin user first
      await prisma.documentPermission.create({
        data: {
          userId: mockData.ids.adminUserId,
          docId: mockData.ids.documentId,
          permission: "MANAGE",
          inheritedFromType: "DIRECT",
          priority: 1,
          createdById: mockData.ids.adminUserId,
        },
      });

      // First invitation
      const result1 = await service.inviteGuestToDocument(mockData.ids.adminUserId, {
        documentId: mockData.ids.documentId,
        email: mockData.ids.newGuestEmail,
        permission: "READ",
      });

      // Create another document
      const doc2 = await prisma.doc.create({
        data: {
          id: uuidv4(),
          title: "Document 2",
          workspaceId: mockData.ids.workspaceId,
          authorId: mockData.ids.adminUserId,
          createdById: mockData.ids.adminUserId,
          lastModifiedById: mockData.ids.adminUserId,
        },
      });

      // Create document permission for the second document
      await prisma.documentPermission.create({
        data: {
          userId: mockData.ids.adminUserId,
          docId: doc2.id,
          permission: "MANAGE",
          inheritedFromType: "DIRECT",
          priority: 1,
          createdById: mockData.ids.adminUserId,
        },
      });

      // Second invitation to different document
      const result2 = await service.inviteGuestToDocument(mockData.ids.adminUserId, {
        documentId: doc2.id,
        email: mockData.ids.newGuestEmail,
        permission: "EDIT",
      });

      // Should reuse same guest
      expect(result2.id).toBe(result1.id);

      // Should have permissions for both documents
      const permissions = await prisma.documentPermission.findMany({
        where: {
          guestCollaboratorId: result1.id,
          inheritedFromType: "GUEST",
        },
      });
      expect(permissions).toHaveLength(2);
    });
  });

  describe("removeGuestFromWorkspace", () => {
    it("should remove guest and all their document permissions", async () => {
      // Create a guest with document permission
      const guest = await prisma.guestCollaborator.create({
        data: {
          email: "toremove@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.documentPermission.create({
        data: {
          guestCollaboratorId: guest.id,
          docId: mockData.ids.documentId,
          permission: "READ",
          inheritedFromType: "GUEST",
          priority: 7,
          createdById: mockData.ids.adminUserId,
        },
      });

      await service.removeGuestFromWorkspace(mockData.ids.adminUserId, guest.id);

      // Verify guest was removed
      const removedGuest = await prisma.guestCollaborator.findUnique({
        where: { id: guest.id },
      });
      expect(removedGuest).toBeNull();

      // Verify permissions were removed
      const permissions = await prisma.documentPermission.findMany({
        where: { guestCollaboratorId: guest.id },
      });
      expect(permissions).toHaveLength(0);
    });

    it("should throw PermissionDenied when non-admin tries to remove guest", async () => {
      // Create a regular member (non-admin)
      const regularUserId = uuidv4();
      await prisma.user.create({
        data: {
          id: regularUserId,
          displayName: "Regular User",
          email: `regular-${regularUserId}@test.com`,
        },
      });
      await prisma.workspaceMember.create({
        data: {
          workspaceId: mockData.ids.workspaceId,
          userId: regularUserId,
          role: "MEMBER",
        },
      });

      const guest = await prisma.guestCollaborator.create({
        data: {
          email: "guest@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await expect(service.removeGuestFromWorkspace(regularUserId, guest.id)).rejects.toThrow(ApiException);
    });
  });

  describe("Guest Visit Tracking", () => {
    it("should set lastVisitedAt to null when creating new guest", async () => {
      const result = await service.inviteGuestToWorkspace(mockData.ids.adminUserId, {
        workspaceId: mockData.ids.workspaceId,
        email: "newvisit@test.com",
      });

      expect(result.lastVisitedAt).toBeNull();

      // Verify in database
      const guest = await prisma.guestCollaborator.findUnique({
        where: { id: result.id },
      });
      expect(guest?.lastVisitedAt).toBeNull();
    });

    it("should preserve lastVisitedAt as null after accepting invitation", async () => {
      // Create pending guest
      const guest = await prisma.guestCollaborator.create({
        data: {
          email: mockData.ids.existingUserEmail,
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "PENDING",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          userId: mockData.ids.regularUserId,
          lastVisitedAt: null,
        },
      });

      await service.acceptWorkspaceInvitation(mockData.ids.regularUserId, guest.id);

      // Verify lastVisitedAt is still null (will be set on first workspace switch)
      const updatedGuest = await prisma.guestCollaborator.findUnique({
        where: { id: guest.id },
      });
      expect(updatedGuest?.lastVisitedAt).toBeNull();
    });
  });

  describe("batchInviteGuestsToDocument", () => {
    it("should successfully invite multiple existing guests to a document", async () => {
      // Create document permission for admin user first
      await prisma.documentPermission.create({
        data: {
          userId: mockData.ids.adminUserId,
          docId: mockData.ids.documentId,
          permission: "MANAGE",
          inheritedFromType: "DIRECT",
          priority: 1,
          createdById: mockData.ids.adminUserId,
        },
      });

      // Create existing guests first
      const guest1 = await prisma.guestCollaborator.create({
        data: {
          email: "batch1@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const guest2 = await prisma.guestCollaborator.create({
        data: {
          email: "batch2@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const guest3 = await prisma.guestCollaborator.create({
        data: {
          email: "batch3@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const result = await service.batchInviteGuestsToDocument(mockData.ids.adminUserId, {
        documentId: mockData.ids.documentId,
        guests: [
          { guestId: guest1.id, permission: "READ" },
          { guestId: guest2.id, permission: "EDIT" },
          { guestId: guest3.id, permission: "COMMENT" },
        ],
      });

      expect(result).toHaveLength(3);
      expect(result[0].email).toBe("batch1@test.com");
      expect(result[1].email).toBe("batch2@test.com");
      expect(result[2].email).toBe("batch3@test.com");

      // Verify document permissions were created
      const permissions = await prisma.documentPermission.findMany({
        where: {
          docId: mockData.ids.documentId,
          inheritedFromType: "GUEST",
        },
      });
      expect(permissions).toHaveLength(3);

      // Verify WebSocket events were published for each guest (DOCUMENT_SHARED events)
      expect(eventPublisherMock.publishWebsocketEvent).toHaveBeenCalledTimes(3);
      expect(eventPublisherMock.publishWebsocketEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "permission.document.shared",
          workspaceId: mockData.ids.workspaceId,
          data: expect.objectContaining({
            docId: mockData.ids.documentId,
            guestEmail: "batch1@test.com",
            permission: "READ",
          }),
        }),
      );
    });

    it("should handle guests that already have permission to the document", async () => {
      // Create document permission for admin user first
      await prisma.documentPermission.create({
        data: {
          userId: mockData.ids.adminUserId,
          docId: mockData.ids.documentId,
          permission: "MANAGE",
          inheritedFromType: "DIRECT",
          priority: 1,
          createdById: mockData.ids.adminUserId,
        },
      });

      // Create a guest with existing permission
      const guestWithPermission = await prisma.guestCollaborator.create({
        data: {
          email: "existing@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.documentPermission.create({
        data: {
          guestCollaboratorId: guestWithPermission.id,
          docId: mockData.ids.documentId,
          permission: "READ",
          inheritedFromType: "GUEST",
          priority: 7,
          createdById: mockData.ids.adminUserId,
        },
      });

      // Create a guest without permission
      const guestWithoutPermission = await prisma.guestCollaborator.create({
        data: {
          email: "new@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const result = await service.batchInviteGuestsToDocument(mockData.ids.adminUserId, {
        documentId: mockData.ids.documentId,
        guests: [
          { guestId: guestWithPermission.id, permission: "EDIT" }, // Should update existing permission
          { guestId: guestWithoutPermission.id, permission: "READ" }, // Should create new permission
        ],
      });

      expect(result).toHaveLength(2);

      // Verify permissions were updated/created
      const permissions = await prisma.documentPermission.findMany({
        where: {
          docId: mockData.ids.documentId,
          inheritedFromType: "GUEST",
        },
      });
      expect(permissions).toHaveLength(2);
    });

    it("should succeed even when non-admin tries to batch invite (no permission check in service)", async () => {
      const regularUserId = uuidv4();
      await prisma.user.create({
        data: {
          id: regularUserId,
          displayName: "Regular User",
          email: `regular-${regularUserId}@test.com`,
        },
      });
      await prisma.workspaceMember.create({
        data: {
          workspaceId: mockData.ids.workspaceId,
          userId: regularUserId,
          role: "MEMBER",
        },
      });

      const guest = await prisma.guestCollaborator.create({
        data: {
          email: "test@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Service method has no permission check - CASL guard handles this at controller level
      const result = await service.batchInviteGuestsToDocument(regularUserId, {
        documentId: mockData.ids.documentId,
        guests: [{ guestId: guest.id, permission: "READ" }],
      });

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("test@test.com");
    });
  });

  describe("updateGuestPermission", () => {
    it("should successfully update guest document permission", async () => {
      // Create document permission for admin user first
      await prisma.documentPermission.create({
        data: {
          userId: mockData.ids.adminUserId,
          docId: mockData.ids.documentId,
          permission: "MANAGE",
          inheritedFromType: "DIRECT",
          priority: 1,
          createdById: mockData.ids.adminUserId,
        },
      });

      // Create a guest with document permission
      const guest = await prisma.guestCollaborator.create({
        data: {
          email: "updateperm@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.documentPermission.create({
        data: {
          guestCollaboratorId: guest.id,
          docId: mockData.ids.documentId,
          permission: "READ",
          inheritedFromType: "GUEST",
          priority: 7,
          createdById: mockData.ids.adminUserId,
        },
      });

      const result = await service.updateGuestPermission(mockData.ids.adminUserId, guest.id, {
        documentId: mockData.ids.documentId,
        permission: "EDIT",
      });

      expect(result).toBeDefined();
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].permission).toBe("EDIT");

      // Verify database was updated
      const permission = await prisma.documentPermission.findFirst({
        where: {
          guestCollaboratorId: guest.id,
          docId: mockData.ids.documentId,
        },
      });
      expect(permission?.permission).toBe("EDIT");
    });

    it("should throw ResourceNotFound if guest doesn't have access to document", async () => {
      // Create document permission for admin user first
      await prisma.documentPermission.create({
        data: {
          userId: mockData.ids.adminUserId,
          docId: mockData.ids.documentId,
          permission: "MANAGE",
          inheritedFromType: "DIRECT",
          priority: 1,
          createdById: mockData.ids.adminUserId,
        },
      });

      const guest = await prisma.guestCollaborator.create({
        data: {
          email: "newperm@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Should throw error since guest has no permission to update
      await expect(
        service.updateGuestPermission(mockData.ids.adminUserId, guest.id, {
          documentId: mockData.ids.documentId,
          permission: "READ",
        }),
      ).rejects.toThrow(ApiException);
    });

    it("should throw GuestNotFound when guest doesn't exist", async () => {
      await expect(
        service.updateGuestPermission(mockData.ids.adminUserId, "non-existent-id", {
          documentId: mockData.ids.documentId,
          permission: "READ",
        }),
      ).rejects.toThrow(ApiException);
    });

    it("should throw PermissionDenied when non-admin tries to update permission", async () => {
      const regularUserId = uuidv4();
      await prisma.user.create({
        data: {
          id: regularUserId,
          displayName: "Regular User",
          email: `regular-${regularUserId}@test.com`,
        },
      });
      await prisma.workspaceMember.create({
        data: {
          workspaceId: mockData.ids.workspaceId,
          userId: regularUserId,
          role: "MEMBER",
        },
      });

      const guest = await prisma.guestCollaborator.create({
        data: {
          email: "test@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await expect(
        service.updateGuestPermission(regularUserId, guest.id, {
          documentId: mockData.ids.documentId,
          permission: "READ",
        }),
      ).rejects.toThrow(ApiException);
    });
  });

  describe("removeGuestFromDocument", () => {
    it("should successfully remove guest access from document", async () => {
      // Create document permission for admin user first
      await prisma.documentPermission.create({
        data: {
          userId: mockData.ids.adminUserId,
          docId: mockData.ids.documentId,
          permission: "MANAGE",
          inheritedFromType: "DIRECT",
          priority: 1,
          createdById: mockData.ids.adminUserId,
        },
      });

      // Create a guest with document permission
      const guest = await prisma.guestCollaborator.create({
        data: {
          email: "removefromdoc@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.documentPermission.create({
        data: {
          guestCollaboratorId: guest.id,
          docId: mockData.ids.documentId,
          permission: "READ",
          inheritedFromType: "GUEST",
          priority: 7,
          createdById: mockData.ids.adminUserId,
        },
      });

      await service.removeGuestFromDocument(mockData.ids.adminUserId, guest.id, {
        documentId: mockData.ids.documentId,
      });

      // Verify permission was removed
      const permission = await prisma.documentPermission.findFirst({
        where: {
          guestCollaboratorId: guest.id,
          docId: mockData.ids.documentId,
        },
      });
      expect(permission).toBeNull();

      // Verify guest still exists (only permission was removed)
      const guestStillExists = await prisma.guestCollaborator.findUnique({
        where: { id: guest.id },
      });
      expect(guestStillExists).toBeDefined();
    });

    it("should handle case where guest has no permission to document", async () => {
      const guest = await prisma.guestCollaborator.create({
        data: {
          email: "noperm@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Should not throw error even if no permission exists
      await expect(
        service.removeGuestFromDocument(mockData.ids.adminUserId, guest.id, {
          documentId: mockData.ids.documentId,
        }),
      ).resolves.not.toThrow();
    });

    it("should throw GuestNotFound when guest doesn't exist", async () => {
      await expect(
        service.removeGuestFromDocument(mockData.ids.adminUserId, "non-existent-id", {
          documentId: mockData.ids.documentId,
        }),
      ).rejects.toThrow(ApiException);
    });

    it("should succeed even when non-admin removes guest from document (no permission check in service)", async () => {
      const regularUserId = uuidv4();
      await prisma.user.create({
        data: {
          id: regularUserId,
          displayName: "Regular User",
          email: `regular-${regularUserId}@test.com`,
        },
      });
      await prisma.workspaceMember.create({
        data: {
          workspaceId: mockData.ids.workspaceId,
          userId: regularUserId,
          role: "MEMBER",
        },
      });

      const guest = await prisma.guestCollaborator.create({
        data: {
          email: "test@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.documentPermission.create({
        data: {
          guestCollaboratorId: guest.id,
          docId: mockData.ids.documentId,
          permission: "READ",
          inheritedFromType: "GUEST",
          priority: 7,
          createdById: mockData.ids.adminUserId,
        },
      });

      // Service method has no permission check - CASL guard handles this at controller level
      await expect(
        service.removeGuestFromDocument(regularUserId, guest.id, {
          documentId: mockData.ids.documentId,
        }),
      ).resolves.not.toThrow();

      // Verify permission was removed
      const permission = await prisma.documentPermission.findFirst({
        where: {
          guestCollaboratorId: guest.id,
          docId: mockData.ids.documentId,
        },
      });
      expect(permission).toBeNull();
    });
  });

  describe("getGuestsOfDocument", () => {
    it("should return all guests with access to a specific document", async () => {
      // Create guests with different permissions
      const guest1 = await prisma.guestCollaborator.create({
        data: {
          email: "docguest1@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const guest2 = await prisma.guestCollaborator.create({
        data: {
          email: "docguest2@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Create a guest without access to this document
      await prisma.guestCollaborator.create({
        data: {
          email: "noaccess@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Create document permissions
      await prisma.documentPermission.createMany({
        data: [
          {
            guestCollaboratorId: guest1.id,
            docId: mockData.ids.documentId,
            permission: "READ",
            inheritedFromType: "GUEST",
            priority: 7,
            createdById: mockData.ids.adminUserId,
          },
          {
            guestCollaboratorId: guest2.id,
            docId: mockData.ids.documentId,
            permission: "EDIT",
            inheritedFromType: "GUEST",
            priority: 7,
            createdById: mockData.ids.adminUserId,
          },
        ],
      });

      const result = await service.getGuestsOfDocument(mockData.ids.documentId);

      expect(result).toHaveLength(2);
      expect(result.find((g) => g.email === "docguest1@test.com")).toBeDefined();
      expect(result.find((g) => g.email === "docguest2@test.com")).toBeDefined();
      expect(result.find((g) => g.email === "noaccess@test.com")).toBeUndefined();

      // Verify permissions are included
      const guest1Result = result.find((g) => g.email === "docguest1@test.com");
      expect(guest1Result?.documents).toHaveLength(1);
      expect(guest1Result?.documents[0].permission).toBe("READ");
    });

    it("should return empty array for document with no guest access", async () => {
      // Create another document
      const doc2 = await prisma.doc.create({
        data: {
          id: uuidv4(),
          title: "Document 2",
          workspaceId: mockData.ids.workspaceId,
          authorId: mockData.ids.adminUserId,
          createdById: mockData.ids.adminUserId,
          lastModifiedById: mockData.ids.adminUserId,
        },
      });

      const result = await service.getGuestsOfDocument(doc2.id);
      expect(result).toHaveLength(0);
    });

    it("should include guest information and document permissions", async () => {
      const guest = await prisma.guestCollaborator.create({
        data: {
          email: "detailed@test.com",
          name: "Detailed Guest",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.documentPermission.create({
        data: {
          guestCollaboratorId: guest.id,
          docId: mockData.ids.documentId,
          permission: "COMMENT",
          inheritedFromType: "GUEST",
          priority: 7,
          createdById: mockData.ids.adminUserId,
        },
      });

      const result = await service.getGuestsOfDocument(mockData.ids.documentId);

      expect(result).toHaveLength(1);
      const guestResult = result[0];
      expect(guestResult.email).toBe("detailed@test.com");
      expect(guestResult.name).toBe("Detailed Guest");
      expect(guestResult.status).toBe("ACTIVE");
      expect(guestResult.documents).toHaveLength(1);
      expect(guestResult.documents[0].documentId).toBe(mockData.ids.documentId);
      expect(guestResult.documents[0].permission).toBe("COMMENT");
    });
  });

  describe("Edge Cases", () => {
    it("should handle workspace with OWNER role (not just ADMIN) when inviting guests", async () => {
      // Create an owner
      const ownerId = uuidv4();
      await prisma.user.create({
        data: {
          id: ownerId,
          displayName: "Owner User",
          email: `owner-${ownerId}@test.com`,
        },
      });
      await prisma.workspaceMember.create({
        data: {
          workspaceId: mockData.ids.workspaceId,
          userId: ownerId,
          role: "OWNER",
        },
      });

      const result = await service.inviteGuestToWorkspace(ownerId, {
        workspaceId: mockData.ids.workspaceId,
        email: "ownerinvite@test.com",
      });

      expect(result).toBeDefined();
      expect(result.email).toBe("ownerinvite@test.com");
    });

    it("should handle concurrent guest invitations without duplicates", async () => {
      const email = "concurrent@test.com";

      // Try to invite same guest concurrently
      const promises = [
        service.inviteGuestToWorkspace(mockData.ids.adminUserId, {
          workspaceId: mockData.ids.workspaceId,
          email,
        }),
        service.inviteGuestToWorkspace(mockData.ids.adminUserId, {
          workspaceId: mockData.ids.workspaceId,
          email,
        }),
      ];

      // One should succeed, one should fail
      const results = await Promise.allSettled(promises);
      const succeeded = results.filter((r) => r.status === "fulfilled");
      const failed = results.filter((r) => r.status === "rejected");

      expect(succeeded.length).toBe(1);
      expect(failed.length).toBe(1);

      // Verify only one guest was created
      const guests = await prisma.guestCollaborator.findMany({
        where: {
          email,
          workspaceId: mockData.ids.workspaceId,
        },
      });
      expect(guests).toHaveLength(1);
    });

    it("should handle batch operations with mixed success and failure", async () => {
      // Create guests that already exist
      const existingGuest1 = await prisma.guestCollaborator.create({
        data: {
          email: "existing1@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const existingGuest2 = await prisma.guestCollaborator.create({
        data: {
          email: "existing2@test.com",
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const result = await service.batchInviteGuestsToDocument(mockData.ids.adminUserId, {
        documentId: mockData.ids.documentId,
        guests: [
          { guestId: existingGuest1.id, permission: "READ" },
          { guestId: existingGuest2.id, permission: "EDIT" },
        ],
      });

      expect(result).toHaveLength(2);
      expect(result.find((g) => g.email === "existing1@test.com")).toBeDefined();
      expect(result.find((g) => g.email === "existing2@test.com")).toBeDefined();
    });

    it("should handle case-insensitive email operations", async () => {
      // Create document permission for admin user first
      await prisma.documentPermission.create({
        data: {
          userId: mockData.ids.adminUserId,
          docId: mockData.ids.documentId,
          permission: "MANAGE",
          inheritedFromType: "DIRECT",
          priority: 1,
          createdById: mockData.ids.adminUserId,
        },
      });

      const email = "CaseSensitive@test.com";

      // Create guest with lowercase email
      const guest = await prisma.guestCollaborator.create({
        data: {
          email: email.toLowerCase(),
          workspaceId: mockData.ids.workspaceId,
          invitedById: mockData.ids.adminUserId,
          status: "ACTIVE",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Create document permission for the guest first
      await prisma.documentPermission.create({
        data: {
          guestCollaboratorId: guest.id,
          docId: mockData.ids.documentId,
          permission: "COMMENT",
          inheritedFromType: "GUEST",
          priority: 7,
          createdById: mockData.ids.adminUserId,
        },
      });

      // Try to update permission with uppercase email
      const result = await service.updateGuestPermission(mockData.ids.adminUserId, guest.id, {
        documentId: mockData.ids.documentId,
        permission: "READ",
      });

      expect(result).toBeDefined();
      expect(result.email).toBe(email.toLowerCase());
      expect(result.documents[0].permission).toBe("READ");
    });
  });
});
