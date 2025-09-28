import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { InviteGuestDto, BatchInviteGuestsDto, UpdateGuestPermissionDto, GetWorkspaceGuestsDto, RemoveGuestFromDocumentDto } from "./guest-collaborators.dto";
import { GuestCollaboratorResponse, WorkspaceGuestsResponse } from "@idea/contracts";

@Injectable()
export class GuestCollaboratorsService {
  constructor(private readonly prisma: PrismaService) {}

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
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
    }

    // Create or update document permission for guest
    const existingPermission = await this.prisma.documentPermission.findFirst({
      where: {
        guestCollaboratorId: guest.id, // Use guestCollaboratorId for guest permissions
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
      // Create new permission
      await this.prisma.documentPermission.create({
        data: {
          guestCollaboratorId: guest.id, // Use guestCollaboratorId for guest permissions
          docId: documentId,
          permission,
          inheritedFromType: "GUEST",
          priority: 7,
          createdById: userId,
        },
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
        });

        if (!existingGuest) {
          console.warn(`Guest with ID ${guestData.guestId} not found, skipping`);
          continue;
        }

        // Check if guest already has access to this document
        const existingPermission = await this.prisma.documentPermission.findFirst({
          where: {
            guestCollaboratorId: guestData.guestId, // Use guestCollaboratorId for guest permissions
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
          // Create new document permission
          await this.prisma.documentPermission.create({
            data: {
              guestCollaboratorId: guestData.guestId, // Use guestCollaboratorId for guest permissions
              docId: documentId,
              permission: guestData.permission,
              inheritedFromType: "GUEST",
              priority: 7,
              createdById: userId,
            },
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
    const guestIds = guests.map((g) => g.id);
    const allPermissions = await this.prisma.documentPermission.findMany({
      where: {
        guestCollaboratorId: { in: guestIds },
        inheritedFromType: "GUEST",
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

    // Check if user has permission to modify guest permissions
    const userPermission = await this.prisma.documentPermission.findFirst({
      where: {
        docId: documentId,
        userId: userId,
        permission: { in: ["EDIT", "MANAGE"] },
      },
    });

    if (!userPermission) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    // Check if permission record exists before updating
    const existingPermission = await this.prisma.documentPermission.findFirst({
      where: {
        guestCollaboratorId: guestId, // Use guestCollaboratorId for guest permissions
        docId: documentId,
        inheritedFromType: "GUEST",
      },
    });

    if (!existingPermission) {
      throw new ApiException(ErrorCodeEnum.ResourceNotFound);
    }

    // Update guest permission
    await this.prisma.documentPermission.updateMany({
      where: {
        guestCollaboratorId: guestId, // Use guestCollaboratorId for guest permissions
        docId: documentId,
        inheritedFromType: "GUEST",
      },
      data: {
        permission,
      },
    });

    // Get the updated document permission
    const updatedPermission = await this.prisma.documentPermission.findFirst({
      where: {
        guestCollaboratorId: guestId, // Use guestCollaboratorId for guest permissions
        docId: documentId,
        inheritedFromType: "GUEST",
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

    if (!updatedPermission) {
      throw new ApiException(ErrorCodeEnum.ResourceNotFound);
    }

    // Return guest with only the current document permission
    return {
      id: guest.id,
      email: guest.email,
      name: guest.name,
      status: guest.status,
      expireAt: guest.expireAt,
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
        role: "ADMIN",
      },
    });

    if (!workspaceMember) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    // Remove guest and all their permissions
    await this.prisma.$transaction(async (tx) => {
      // Remove all document permissions for this guest
      await tx.documentPermission.deleteMany({
        where: {
          userId: guestId,
          inheritedFromType: "GUEST",
        },
      });

      // Remove the guest
      await tx.guestCollaborator.delete({
        where: { id: guestId },
      });
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
    await this.prisma.documentPermission.deleteMany({
      where: {
        guestCollaboratorId: guestId, // Use guestCollaboratorId for guest permissions
        docId: documentId,
        inheritedFromType: "GUEST",
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
    const permissions = await this.prisma.documentPermission.findMany({
      where: {
        guestCollaboratorId: guestId,
        inheritedFromType: "GUEST",
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
      include: { workspace: true },
    });

    if (!document) {
      throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    }

    // Get document permissions for guests
    const guestPermissions = await this.prisma.documentPermission.findMany({
      where: {
        docId: documentId,
        inheritedFromType: "GUEST",
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

    // Get unique guest IDs from the permissions
    const guestIds = [...new Set(guestPermissions.map((p) => p.guestCollaboratorId).filter(Boolean))];

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

    // Create a map of guest permissions by guest ID
    const permissionsByGuestId = new Map<string, typeof guestPermissions>();
    guestPermissions.forEach((permission) => {
      if (permission.guestCollaboratorId) {
        if (!permissionsByGuestId.has(permission.guestCollaboratorId)) {
          permissionsByGuestId.set(permission.guestCollaboratorId, []);
        }
        permissionsByGuestId.get(permission.guestCollaboratorId)!.push(permission);
      }
    });

    return guests.map((guest) => {
      const permissions = permissionsByGuestId.get(guest.id) || [];

      return {
        id: guest.id,
        email: guest.email,
        name: guest.name,
        status: guest.status,
        expireAt: guest.expireAt,
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
  }
}
