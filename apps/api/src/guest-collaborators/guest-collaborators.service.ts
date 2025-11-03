import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import {
  InviteGuestDto,
  InviteGuestToWorkspaceDto,
  BatchInviteGuestsDto,
  UpdateGuestPermissionDto,
  GetWorkspaceGuestsDto,
  RemoveGuestFromDocumentDto,
  PromoteGuestToMemberDto,
} from "./guest-collaborators.dto";
import { GuestCollaboratorResponse, WorkspaceGuestsResponse, PromoteGuestToMemberResponse, WorkspaceRole, PermissionLevel } from "@idea/contracts";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { BusinessEvents } from "@/_shared/socket/business-event.constant";
import { WorkspaceService } from "@/workspace/workspace.service";
import { EventDeduplicator } from "@/_shared/queues/helpers/event-deduplicator";
import { EventBatcher } from "@/_shared/queues/helpers/event-batcher";

@Injectable()
export class GuestCollaboratorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisherService,
    private readonly eventDeduplicator: EventDeduplicator,
    @Inject(forwardRef(() => WorkspaceService))
    private readonly workspaceService: WorkspaceService,
  ) {}

  async inviteGuestToWorkspace(userId: string, dto: InviteGuestToWorkspaceDto): Promise<GuestCollaboratorResponse> {
    const { workspaceId, email, name } = dto;

    // Verify user is workspace admin
    const workspaceMember = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        role: {
          in: ["ADMIN", "OWNER"],
        },
      },
    });

    if (!workspaceMember) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    // Check if guest email matches existing user (case-insensitive)
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    });

    // Check if guest already exists in workspace
    let guest = await this.prisma.guestCollaborator.findUnique({
      where: {
        email_workspaceId: {
          email,
          workspaceId,
        },
      },
    });

    if (guest) {
      // Handle existing guest scenarios
      if (guest.status === "PENDING" || guest.status === "ACTIVE") {
        throw new ApiException(ErrorCodeEnum.UserAlreadyInWorkspace, 400, "Guest already invited");
      }

      // Re-invite if expired or revoked
      if (guest.status === "EXPIRED" || guest.status === "REVOKED") {
        guest = await this.prisma.guestCollaborator.update({
          where: { id: guest.id },
          data: {
            status: "PENDING",
            expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            userId: existingUser?.id ?? undefined,
            name: name || guest.name,
            lastVisitedAt: null,
          },
        });
      }
    } else {
      // Create new guest
      guest = await this.prisma.guestCollaborator.create({
        data: {
          email,
          name: name || null,
          workspaceId,
          invitedById: userId,
          userId: existingUser?.id ?? undefined,
          status: "PENDING",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lastVisitedAt: null,
        },
      });
    }

    // Publish WebSocket event
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.GUEST_INVITED,
      workspaceId,
      actorId: userId,
      data: {
        guestId: guest.id,
        guestEmail: guest.email,
        invitedByUserId: userId,
      },
      timestamp: new Date().toISOString(),
    });

    // If guest is existing user, send targeted event
    if (existingUser) {
      // TODO: Send targeted WebSocket event to userId
    }

    // TODO: Send invitation email

    return this.getGuestWithDocuments(guest.id);
  }

  async acceptWorkspaceInvitation(userId: string, guestId: string): Promise<{ message: string }> {
    // Verify guest exists
    const guest = await this.prisma.guestCollaborator.findUnique({
      where: { id: guestId },
      include: {
        user: true,
        workspace: true,
      },
    });

    if (!guest) {
      throw new ApiException(ErrorCodeEnum.ResourceNotFound);
    }

    // Verify user's email matches guest's email
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.email.toLowerCase() !== guest.email.toLowerCase()) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied, 403, "Email does not match guest invitation");
    }

    // Check guest status
    if (guest.status !== "PENDING") {
      throw new ApiException(ErrorCodeEnum.WorkspaceInvitationExpired, 400, "Invitation is not pending");
    }

    // Check expiration
    if (guest.expireAt < new Date()) {
      throw new ApiException(ErrorCodeEnum.WorkspaceInvitationExpired, 400, "Invitation has expired");
    }

    // Update guest status, link to user, and migrate permissions in transaction
    await this.prisma.$transaction(async (tx) => {
      // Update guest status and link to user
      await tx.guestCollaborator.update({
        where: { id: guestId },
        data: {
          status: "ACTIVE",
          userId,
        },
      });

      // Migrate GUEST permissions to DIRECT permissions for inheritance
      // This allows the newly activated user to access child documents
      await tx.documentPermission.updateMany({
        where: {
          guestCollaboratorId: guestId,
          inheritedFromType: "GUEST",
        },
        data: {
          userId: userId,
          inheritedFromType: "DIRECT",
          priority: 1,
          // guestCollaboratorId is kept for audit trail
        },
      });
    });

    // Get all migrated permissions to find documents with children
    const migratedPermissions = await this.prisma.documentPermission.findMany({
      where: {
        guestCollaboratorId: guestId,
        userId: userId,
        inheritedFromType: "DIRECT",
      },
      include: {
        doc: {
          select: {
            id: true,
            title: true,
            workspaceId: true,
          },
        },
      },
    });

    // Publish WebSocket event
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.GUEST_ACCEPTED,
      workspaceId: guest.workspaceId,
      actorId: userId,
      data: {
        guestId,
        userId,
        guestEmail: guest.email,
      },
      timestamp: new Date().toISOString(),
    });

    // For each migrated permission, check for child documents and publish inheritance events
    for (const perm of migratedPermissions) {
      // Query all child documents recursively
      const childDocuments = await this.prisma.$queryRaw<Array<{ id: string; title: string }>>`
        WITH RECURSIVE child_docs AS (
          -- Base case: direct children
          SELECT id, title, "parentId"
          FROM "Doc"
          WHERE "parentId" = ${perm.docId}

          UNION ALL

          -- Recursive case: children of children
          SELECT d.id, d.title, d."parentId"
          FROM "Doc" d
          INNER JOIN child_docs cd ON d."parentId" = cd.id
        )
        SELECT id, title FROM child_docs
        LIMIT 1000
      `;

      if (childDocuments.length > 0) {
        // Batch child document IDs (max 50 per batch)
        const batches = EventBatcher.batchDocuments(childDocuments.map((c) => c.id));

        for (const batch of batches) {
          await this.eventDeduplicator.deduplicate(
            BusinessEvents.GUEST_PERMISSION_INHERITED,
            {
              userId: userId,
              docId: perm.docId, // Use parent doc ID as dedup key
              guestId,
              batchSequence: batch.batchSequence,
              batchIndex: batch.batchIndex,
              totalBatches: batch.totalBatches,
              newlyAccessibleDocIds: batch.data,
            },
            async (finalEvent) => {
              await this.eventPublisher.publishWebsocketEvent({
                name: BusinessEvents.GUEST_PERMISSION_INHERITED,
                workspaceId: guest.workspaceId,
                actorId: userId,
                data: finalEvent,
                timestamp: new Date().toISOString(),
              });
            },
          );
        }
      }
    }

    return { message: "Invitation accepted successfully" };
  }

  async inviteGuestToDocument(userId: string, dto: InviteGuestDto): Promise<GuestCollaboratorResponse> {
    const { documentId, email, permission } = dto;

    // Verify user has access to the document and workspace
    const document = await this.prisma.doc.findUnique({
      where: { id: documentId },
      include: { workspace: true },
    });

    if (!document) {
      throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    }

    // Check if guest email matches existing user (case-insensitive)
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    });

    // Check if guest already exists in workspace
    let guest = await this.prisma.guestCollaborator.findUnique({
      where: {
        email_workspaceId: {
          email,
          workspaceId: document.workspaceId,
        },
      },
    });

    // Create guest if doesn't exist
    if (!guest) {
      guest = await this.prisma.guestCollaborator.create({
        data: {
          email,
          workspaceId: document.workspaceId,
          invitedById: userId,
          userId: existingUser?.id ?? undefined,
          status: "PENDING",
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          lastVisitedAt: null,
        },
      });
    }

    // Create or update document permission for guest
    // If guest is linked to a user account, create DIRECT permission (inheritable)
    // Otherwise create GUEST permission (non-inheritable until they sign up)
    const isLinkedGuest = !!guest.userId;

    if (isLinkedGuest) {
      // Guest has linked account - use DIRECT permission for inheritance
      const existingPermission = await this.prisma.documentPermission.findFirst({
        where: {
          userId: guest.userId,
          docId: documentId,
          inheritedFromType: "DIRECT",
          guestCollaboratorId: guest.id, // Must match to avoid duplicates
        },
      });

      if (existingPermission) {
        // Update existing permission
        await this.prisma.documentPermission.update({
          where: { id: existingPermission.id },
          data: {
            permission,
            priority: 1,
          },
        });
      } else {
        // Create new DIRECT permission (inheritable)
        await this.prisma.documentPermission.create({
          data: {
            userId: guest.userId, // Use userId for inheritance
            guestCollaboratorId: guest.id, // Track guest origin for audit
            docId: documentId,
            permission,
            inheritedFromType: "DIRECT",
            priority: 1,
            createdById: userId,
          },
        });
      }
    } else {
      // Guest not linked - use GUEST permission (no inheritance)
      const existingPermission = await this.prisma.documentPermission.findFirst({
        where: {
          guestCollaboratorId: guest.id,
          docId: documentId,
          inheritedFromType: "GUEST",
        },
      });

      if (existingPermission) {
        // Update existing permission
        await this.prisma.documentPermission.update({
          where: { id: existingPermission.id },
          data: {
            permission,
            priority: 7, // Guest permissions have lowest priority
          },
        });
      } else {
        // Create new GUEST permission (non-inheritable)
        await this.prisma.documentPermission.create({
          data: {
            guestCollaboratorId: guest.id,
            docId: documentId,
            permission,
            inheritedFromType: "GUEST",
            priority: 7,
            createdById: userId,
          },
        });
      }
    }

    // Publish WebSocket event for document sharing
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.DOCUMENT_SHARED,
      workspaceId: document.workspaceId,
      actorId: userId,
      data: {
        docId: documentId,
        guestId: guest.id,
        guestEmail: guest.email,
        permission,
        sharedByUserId: userId,
      },
      timestamp: new Date().toISOString(),
    });

    // If guest is existing user in the system, also send guest invited event
    if (existingUser) {
      await this.eventPublisher.publishWebsocketEvent({
        name: BusinessEvents.GUEST_INVITED,
        workspaceId: document.workspaceId,
        actorId: userId,
        data: {
          guestId: guest.id,
          guestEmail: guest.email,
          invitedByUserId: userId,
          documentId, // Include document context
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Return guest with document permissions
    return this.getGuestWithDocuments(guest.id);
  }

  async batchInviteGuestsToDocument(userId: string, dto: BatchInviteGuestsDto): Promise<GuestCollaboratorResponse[]> {
    const { documentId, guests } = dto;

    // Verify user has access to the document and workspace
    const document = await this.prisma.doc.findUnique({
      where: { id: documentId },
      include: { workspace: true },
    });

    if (!document) {
      throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    }

    // Process each guest in the batch
    const results: GuestCollaboratorResponse[] = [];

    for (const guestData of guests) {
      try {
        // Check if guest exists
        const existingGuest = await this.prisma.guestCollaborator.findUnique({
          where: { id: guestData.guestId },
          include: { user: true },
        });

        if (!existingGuest) {
          console.warn(`Guest with ID ${guestData.guestId} not found, skipping`);
          continue;
        }

        // Check if guest is linked to user account
        const isLinkedGuest = !!existingGuest.userId;

        if (isLinkedGuest) {
          // Guest has linked account - use DIRECT permission for inheritance
          const existingPermission = await this.prisma.documentPermission.findFirst({
            where: {
              userId: existingGuest.userId,
              docId: documentId,
              inheritedFromType: "DIRECT",
              guestCollaboratorId: guestData.guestId,
            },
          });

          if (existingPermission) {
            // Update existing permission
            await this.prisma.documentPermission.update({
              where: { id: existingPermission.id },
              data: { permission: guestData.permission, priority: 1 },
            });
          } else {
            // Create new DIRECT permission (inheritable)
            await this.prisma.documentPermission.create({
              data: {
                userId: existingGuest.userId,
                guestCollaboratorId: guestData.guestId,
                docId: documentId,
                permission: guestData.permission,
                inheritedFromType: "DIRECT",
                priority: 1,
                createdById: userId,
              },
            });
          }
        } else {
          // Guest not linked - use GUEST permission (no inheritance)
          const existingPermission = await this.prisma.documentPermission.findFirst({
            where: {
              guestCollaboratorId: guestData.guestId,
              docId: documentId,
              inheritedFromType: "GUEST",
            },
          });

          if (existingPermission) {
            // Update existing permission
            await this.prisma.documentPermission.update({
              where: { id: existingPermission.id },
              data: { permission: guestData.permission },
            });
          } else {
            // Create new GUEST permission (non-inheritable)
            await this.prisma.documentPermission.create({
              data: {
                guestCollaboratorId: guestData.guestId,
                docId: documentId,
                permission: guestData.permission,
                inheritedFromType: "GUEST",
                priority: 7,
                createdById: userId,
              },
            });
          }
        }

        // Publish WebSocket event for document sharing
        await this.eventPublisher.publishWebsocketEvent({
          name: BusinessEvents.DOCUMENT_SHARED,
          workspaceId: document.workspaceId,
          actorId: userId,
          data: {
            docId: documentId,
            guestId: existingGuest.id,
            guestEmail: existingGuest.email,
            permission: guestData.permission,
            sharedByUserId: userId,
          },
          timestamp: new Date().toISOString(),
        });

        // If guest is existing user, also send guest invited event
        if (existingGuest.user) {
          await this.eventPublisher.publishWebsocketEvent({
            name: BusinessEvents.GUEST_INVITED,
            workspaceId: document.workspaceId,
            actorId: userId,
            data: {
              guestId: existingGuest.id,
              guestEmail: existingGuest.email,
              invitedByUserId: userId,
              documentId, // Include document context
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Get the updated guest with documents
        const guestWithDocuments = await this.getGuestWithDocuments(guestData.guestId);
        results.push(guestWithDocuments);
      } catch (error) {
        console.error(`Failed to process guest ${guestData.guestId}:`, error);
        // Continue with other guests even if one fails
      }
    }

    return results;
  }

  async getWorkspaceGuests(userId: string, dto: GetWorkspaceGuestsDto): Promise<WorkspaceGuestsResponse> {
    const { workspaceId, page = 1, limit = 10 } = dto;

    const { data: guests, pagination } = await (this.prisma.guestCollaborator as any).paginateWithApiFormat({
      where: { workspaceId },
      page,
      limit,
      orderBy: { createdAt: "desc" },
      include: {
        invitedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    // Get document permissions for all these guests
    // Include both DIRECT (linked) and GUEST (unlinked) permissions
    const guestIds = guests.map((g) => g.id);
    const allPermissions = await this.prisma.documentPermission.findMany({
      where: {
        guestCollaboratorId: { in: guestIds },
        OR: [{ inheritedFromType: "DIRECT" }, { inheritedFromType: "GUEST" }],
      },
      include: {
        doc: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group permissions by guest ID
    const permissionsByGuestId = new Map<string, typeof allPermissions>();
    allPermissions.forEach((permission) => {
      if (permission.guestCollaboratorId) {
        if (!permissionsByGuestId.has(permission.guestCollaboratorId)) {
          permissionsByGuestId.set(permission.guestCollaboratorId, []);
        }
        permissionsByGuestId.get(permission.guestCollaboratorId)!.push(permission);
      }
    });

    const data = guests.map((guest) => {
      const permissions = permissionsByGuestId.get(guest.id) || [];

      return {
        id: guest.id,
        email: guest.email,
        name: guest.name,
        status: guest.status,
        expireAt: guest.expireAt,
        lastVisitedAt: guest.lastVisitedAt,
        createdAt: guest.createdAt,
        updatedAt: guest.updatedAt,
        invitedBy: guest.invitedBy,
        documents: permissions.map((permission) => ({
          documentId: permission.docId,
          documentTitle: permission.doc.title,
          permission: permission.permission,
          createdAt: permission.createdAt,
        })),
      };
    });

    return {
      pagination,
      data,
    };
  }

  async updateGuestPermission(userId: string, guestId: string, dto: UpdateGuestPermissionDto): Promise<GuestCollaboratorResponse> {
    const { documentId, permission } = dto;

    // Verify guest exists and user has permission to modify
    const guest = await this.prisma.guestCollaborator.findUnique({
      where: { id: guestId },
      include: {
        workspace: true,
        invitedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    if (!guest) {
      throw new ApiException(ErrorCodeEnum.ResourceNotFound);
    }

    // Check if guest is linked (may have DIRECT or GUEST permission)
    const isLinkedGuest = !!guest.userId;

    // Find existing permission (check both DIRECT and GUEST types)
    const existingPermission = isLinkedGuest
      ? await this.prisma.documentPermission.findFirst({
          where: {
            userId: guest.userId,
            docId: documentId,
            inheritedFromType: "DIRECT",
            guestCollaboratorId: guestId,
          },
        })
      : await this.prisma.documentPermission.findFirst({
          where: {
            guestCollaboratorId: guestId,
            docId: documentId,
            inheritedFromType: "GUEST",
          },
        });

    let updatedPermission: any;

    if (existingPermission) {
      // Update existing permission
      await this.prisma.documentPermission.update({
        where: { id: existingPermission.id },
        data: { permission },
      });

      // Get the updated permission
      updatedPermission = await this.prisma.documentPermission.findUnique({
        where: { id: existingPermission.id },
        include: {
          doc: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });
    } else {
      // No existing permission - create new one (for overrides or first-time grants)
      // For linked guests, create DIRECT permission (inheritable)
      // For unlinked guests, create GUEST permission (non-inheritable)
      updatedPermission = await this.prisma.documentPermission.create({
        data: isLinkedGuest
          ? {
              userId: guest.userId,
              guestCollaboratorId: guestId,
              docId: documentId,
              permission,
              inheritedFromType: "DIRECT",
              priority: 1,
              createdById: userId,
            }
          : {
              guestCollaboratorId: guestId,
              docId: documentId,
              permission,
              inheritedFromType: "GUEST",
              priority: 7,
              createdById: userId,
            },
        include: {
          doc: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });
    }

    if (!updatedPermission) {
      throw new ApiException(ErrorCodeEnum.ResourceNotFound);
    }

    // Publish GUEST_PERMISSION_UPDATED event (with deduplication)
    // Publish to the linked guest user (if exists) AND the admin who made the change
    const eventData = {
      guestId,
      docId: documentId,
      document: updatedPermission.doc,
      permission: updatedPermission.permission,
      isOverride: existingPermission !== null, // True if updating existing permission
    };

    // Notify the linked guest user if they exist
    if (guest.userId) {
      await this.eventDeduplicator.deduplicate(
        BusinessEvents.GUEST_PERMISSION_UPDATED,
        {
          userId: guest.userId,
          ...eventData,
        },
        async (finalEvent) => {
          await this.eventPublisher.publishWebsocketEvent({
            name: BusinessEvents.GUEST_PERMISSION_UPDATED,
            workspaceId: guest.workspace.id,
            actorId: userId,
            data: finalEvent,
            timestamp: new Date().toISOString(),
          });
        },
      );
    }

    // ALSO notify the admin who made the change (for guest-sharing-tab update)
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.GUEST_PERMISSION_UPDATED,
      workspaceId: guest.workspace.id,
      actorId: userId, // The admin making the change
      data: {
        ...eventData,
        guestEmail: guest.email, // Include email for display
        guestName: guest.name,
      },
      timestamp: new Date().toISOString(),
    });

    // Return guest with only the current document permission
    return {
      id: guest.id,
      email: guest.email,
      name: guest.name,
      status: guest.status,
      expireAt: guest.expireAt,
      lastVisitedAt: guest.lastVisitedAt,
      createdAt: guest.createdAt,
      updatedAt: guest.updatedAt,
      invitedBy: {
        id: guest.invitedBy.id,
        email: guest.invitedBy.email,
        displayName: guest.invitedBy.displayName,
      },
      documents: [
        {
          documentId: updatedPermission.docId,
          documentTitle: updatedPermission.doc.title,
          permission: updatedPermission.permission,
          createdAt: updatedPermission.createdAt,
        },
      ],
    };
  }

  async removeGuestFromWorkspace(userId: string, guestId: string): Promise<void> {
    // Verify guest exists and user has permission to remove
    const guest = await this.prisma.guestCollaborator.findUnique({
      where: { id: guestId },
      include: { workspace: true },
    });

    if (!guest) {
      throw new ApiException(ErrorCodeEnum.ResourceNotFound);
    }

    // Check if user has workspace admin permission
    const workspaceMember = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId: guest.workspaceId,
        userId: userId,
        role: {
          in: ["ADMIN", "OWNER"],
        },
      },
    });

    if (!workspaceMember) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    // Remove guest and all their permissions
    await this.prisma.$transaction(async (tx) => {
      // Remove all document permissions for this guest
      // Include both DIRECT (linked) and GUEST (unlinked) permissions
      await tx.documentPermission.deleteMany({
        where: {
          guestCollaboratorId: guestId,
          OR: [{ inheritedFromType: "DIRECT" }, { inheritedFromType: "GUEST" }],
        },
      });

      // Remove the guest
      await tx.guestCollaborator.delete({
        where: { id: guestId },
      });
    });

    // Publish WebSocket event to notify guest and workspace members
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.GUEST_REMOVED,
      workspaceId: guest.workspaceId,
      actorId: userId,
      data: {
        guestId,
        userId: guest.userId,
        removedByUserId: userId,
      },
      timestamp: new Date().toISOString(),
    });
  }

  async removeGuestFromDocument(userId: string, guestId: string, dto: RemoveGuestFromDocumentDto): Promise<void> {
    const { documentId } = dto;

    // Verify guest exists
    const guest = await this.prisma.guestCollaborator.findUnique({
      where: { id: guestId },
    });

    if (!guest) {
      throw new ApiException(ErrorCodeEnum.ResourceNotFound);
    }

    // Remove guest permission for this document
    // Handle both DIRECT (linked) and GUEST (unlinked) permissions
    await this.prisma.documentPermission.deleteMany({
      where: {
        guestCollaboratorId: guestId,
        docId: documentId,
        OR: [{ inheritedFromType: "DIRECT" }, { inheritedFromType: "GUEST" }],
      },
    });
  }

  private async getGuestWithDocuments(guestId: string): Promise<GuestCollaboratorResponse> {
    const guest = await this.prisma.guestCollaborator.findUnique({
      where: { id: guestId },
      include: {
        invitedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    if (!guest) {
      throw new ApiException(ErrorCodeEnum.ResourceNotFound);
    }

    // Get document permissions for this guest
    // Include both DIRECT (linked) and GUEST (unlinked) permissions
    const permissions = await this.prisma.documentPermission.findMany({
      where: {
        guestCollaboratorId: guestId,
        OR: [{ inheritedFromType: "DIRECT" }, { inheritedFromType: "GUEST" }],
      },
      include: {
        doc: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      id: guest.id,
      email: guest.email,
      name: guest.name,
      status: guest.status,
      expireAt: guest.expireAt,
      lastVisitedAt: guest.lastVisitedAt,
      createdAt: guest.createdAt,
      updatedAt: guest.updatedAt,
      invitedBy: guest.invitedBy,
      documents: permissions.map((permission) => ({
        documentId: permission.docId,
        documentTitle: permission.doc.title,
        permission: permission.permission,
        createdAt: permission.createdAt,
      })),
    };
  }

  async getGuestsOfDocument(documentId: string): Promise<GuestCollaboratorResponse[]> {
    // Verify user has access to the document
    const document = await this.prisma.doc.findUnique({
      where: { id: documentId },
      include: { workspace: true, parent: { select: { id: true, parentId: true } } },
    });

    if (!document) {
      throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    }

    // Get DIRECT guest permissions on this document (both linked and unlinked)
    const directGuestPermissions = await this.prisma.documentPermission.findMany({
      where: {
        docId: documentId,
        guestCollaboratorId: { not: null },
        OR: [{ inheritedFromType: "DIRECT" }, { inheritedFromType: "GUEST" }],
      },
      include: {
        doc: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get INHERITED guest permissions from parent chain (only for linked guests with DIRECT permissions)
    const inheritedGuestPermissions: typeof directGuestPermissions = [];

    if (document.parentId) {
      // Walk up parent chain to find guest permissions
      let currentParentId: string | null = document.parentId;
      const visited = new Set<string>();
      const inheritedGuestIds = new Set<string>();

      while (currentParentId && !visited.has(currentParentId) && visited.size < 25) {
        visited.add(currentParentId);

        // Get guest permissions on parent (only DIRECT permissions, as those are inheritable)
        const parentGuestPerms = await this.prisma.documentPermission.findMany({
          where: {
            docId: currentParentId,
            guestCollaboratorId: { not: null },
            inheritedFromType: "DIRECT", // Only DIRECT permissions inherit
          },
          include: {
            doc: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        });

        // Add to inherited list if not already seen
        for (const perm of parentGuestPerms) {
          if (perm.guestCollaboratorId && !inheritedGuestIds.has(perm.guestCollaboratorId)) {
            inheritedGuestIds.add(perm.guestCollaboratorId);
            inheritedGuestPermissions.push(perm);
          }
        }

        // Move to next parent
        const parentDoc = await this.prisma.doc.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        });
        currentParentId = parentDoc?.parentId || null;
      }
    }

    // Merge direct and inherited permissions (similar to member shares)
    // Track which guests have BOTH direct and inherited permissions (override case)
    const directGuestMap = new Map(directGuestPermissions.map((p) => [p.guestCollaboratorId, p]));
    const inheritedGuestMap = new Map(inheritedGuestPermissions.map((p) => [p.guestCollaboratorId, p]));

    // Get all unique guest IDs
    const guestIds = [...new Set([...directGuestMap.keys(), ...inheritedGuestMap.keys()].filter(Boolean))];

    if (guestIds.length === 0) {
      return [];
    }

    // Fetch guest collaborator data for these IDs
    const guests = await this.prisma.guestCollaborator.findMany({
      where: {
        id: { in: guestIds as string[] },
        workspaceId: document.workspaceId,
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    return guests.map((guest) => {
      const directPermission = directGuestMap.get(guest.id);
      const inheritedPermission = inheritedGuestMap.get(guest.id);

      // Determine permission state
      const hasDirectPermission = !!directPermission;
      const hasInheritedPermission = !!inheritedPermission;
      const isOverride = hasDirectPermission && hasInheritedPermission; // Guest has BOTH

      // Effective permission (direct wins if both exist)
      const effectivePermission = hasDirectPermission ? directPermission.permission : inheritedPermission?.permission;

      // Permission source info
      const permissionSource = hasDirectPermission
        ? {
            source: "direct" as const,
            sourceDocId: directPermission.docId,
            sourceDocTitle: directPermission.doc.title,
            level: directPermission.permission,
          }
        : hasInheritedPermission
          ? {
              source: "inherited" as const,
              sourceDocId: inheritedPermission.docId,
              sourceDocTitle: inheritedPermission.doc.title,
              level: inheritedPermission.permission,
            }
          : undefined;

      // Parent permission source (for override tooltip)
      const parentPermissionSource =
        isOverride && inheritedPermission
          ? {
              source: "inherited" as const,
              sourceDocId: inheritedPermission.docId,
              sourceDocTitle: inheritedPermission.doc.title,
              level: inheritedPermission.permission,
            }
          : undefined;

      // Documents array (for backward compatibility)
      const permissions = [directPermission, inheritedPermission].filter(Boolean) as typeof directGuestPermissions;
      const documents = permissions.map((permission) => ({
        documentId: permission.docId,
        documentTitle: permission.doc.title,
        permission: permission.permission,
        createdAt: permission.createdAt,
      }));

      return {
        id: guest.id,
        email: guest.email,
        name: guest.name,
        status: guest.status,
        expireAt: guest.expireAt,
        lastVisitedAt: guest.lastVisitedAt,
        createdAt: guest.createdAt,
        updatedAt: guest.updatedAt,
        invitedBy: guest.invitedBy,
        permission: effectivePermission, // Effective permission level
        isInherited: hasInheritedPermission && !hasDirectPermission, // True only if ONLY inherited
        hasParentPermission: isOverride, // True if has both direct and inherited (override case)
        permissionSource, // Current permission source
        parentPermissionSource, // Parent permission source (for overrides)
        documents, // Backward compatibility
      };
    });
  }

  /**
   * Promote a guest collaborator to workspace member
   * Migrates permissions and cleans up guest record
   */
  async promoteGuestToMember(adminId: string, guestId: string, dto: PromoteGuestToMemberDto): Promise<PromoteGuestToMemberResponse> {
    const role = (dto.role as WorkspaceRole) || WorkspaceRole.MEMBER;

    // 1. Validation - Verify guest exists and belongs to workspace
    const guest = await this.prisma.guestCollaborator.findUnique({
      where: { id: guestId },
      include: { user: true, workspace: true },
    });

    if (!guest) {
      throw new ApiException(ErrorCodeEnum.ResourceNotFound);
    }

    if (!guest.userId) {
      throw new ApiException(ErrorCodeEnum.GuestNotLinkedToUser);
    }

    // Verify user is not already a workspace member
    const existingMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: guest.workspaceId, userId: guest.userId } },
    });

    if (existingMember) {
      throw new ApiException(ErrorCodeEnum.UserAlreadyInWorkspace);
    }

    // 2. Permission migration in transaction
    await this.prisma.$transaction(async (tx) => {
      // Fetch guest permissions (both DIRECT and GUEST types)
      const guestPermissions = await tx.documentPermission.findMany({
        where: {
          guestCollaboratorId: guestId,
          OR: [{ inheritedFromType: "DIRECT" }, { inheritedFromType: "GUEST" }],
        },
        include: { doc: true },
      });

      // Migrate permissions
      for (const perm of guestPermissions) {
        // Determine if workspace member would have lower access
        // WORKSPACE_MEMBER and WORKSPACE_ADMIN both get READ by default
        const workspaceMemberLevel = PermissionLevel.READ;

        if (this.comparePermissionLevels(perm.permission, workspaceMemberLevel) > 0) {
          // Guest has higher permission - convert/keep as DIRECT
          await tx.documentPermission.update({
            where: { id: perm.id },
            data: {
              userId: guest.userId,
              guestCollaboratorId: null,
              inheritedFromType: "DIRECT",
              priority: 1,
            },
          });
        } else {
          // Workspace access is sufficient - delete guest permission
          await tx.documentPermission.delete({ where: { id: perm.id } });
        }
      }

      // Delete guest record
      await tx.guestCollaborator.delete({ where: { id: guestId } });
    });

    // 3. Add as workspace member (outside transaction)
    await this.workspaceService.addWorkspaceMember(guest.workspaceId, guest.userId, role, adminId);

    // 4. Emit WebSocket event
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.GUEST_PROMOTED,
      workspaceId: guest.workspaceId,
      actorId: adminId,
      data: {
        guestId,
        userId: guest.userId,
        promotedByUserId: adminId,
        newRole: role,
      },
      timestamp: new Date().toISOString(),
    });

    return { message: "Guest promoted to member successfully" };
  }

  /**
   * Compare permission levels
   * Returns: >0 if a > b, 0 if equal, <0 if a < b
   */
  private comparePermissionLevels(a: PermissionLevel, b: PermissionLevel): number {
    const levels = {
      [PermissionLevel.NONE]: 0,
      [PermissionLevel.READ]: 1,
      [PermissionLevel.COMMENT]: 2,
      [PermissionLevel.EDIT]: 3,
      [PermissionLevel.MANAGE]: 4,
    };

    return levels[a] - levels[b];
  }
}
