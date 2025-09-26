import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { InviteGuestDto, UpdateGuestPermissionDto, GetWorkspaceGuestsDto, RemoveGuestFromDocumentDto } from "./guest-collaborators.dto";
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

    // Check if user has permission to invite guests to this document
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
    // First, try to find existing permission
    const existingPermission = await this.prisma.documentPermission.findFirst({
      where: {
        userId: null,
        guestId: guest.id,
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
          docId: documentId,
          guestId: guest.id,
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

  async getWorkspaceGuests(userId: string, dto: GetWorkspaceGuestsDto): Promise<WorkspaceGuestsResponse> {
    const { workspaceId, page = 1, limit = 10 } = dto;

    // Verify user has access to workspace
    const workspaceMember = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
      },
    });

    if (!workspaceMember) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    // Get total count
    const total = await this.prisma.guestCollaborator.count({
      where: { workspaceId },
    });

    // Get guests with pagination
    const guests = await this.prisma.guestCollaborator.findMany({
      where: { workspaceId },
      include: {
        invitedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        documentPermissions: {
          include: {
            doc: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const data = guests.map((guest) => ({
      id: guest.id,
      email: guest.email,
      name: guest.name,
      status: guest.status,
      expireAt: guest.expireAt,
      createdAt: guest.createdAt,
      updatedAt: guest.updatedAt,
      invitedBy: guest.invitedBy,
      documents: guest.documentPermissions.map((dp) => ({
        documentId: dp.docId,
        documentTitle: dp.doc.title,
        permission: dp.permission,
        createdAt: dp.createdAt,
      })),
    }));

    return {
      pagination: {
        page,
        limit,
        total,
      },
      data,
    };
  }

  async updateGuestPermission(userId: string, guestId: string, dto: UpdateGuestPermissionDto): Promise<GuestCollaboratorResponse> {
    const { documentId, permission } = dto;

    // Verify guest exists and user has permission to modify
    const guest = await this.prisma.guestCollaborator.findUnique({
      where: { id: guestId },
      include: { workspace: true },
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

    // Update guest permission
    await this.prisma.documentPermission.updateMany({
      where: {
        guestId,
        docId: documentId,
        inheritedFromType: "GUEST",
      },
      data: {
        permission,
      },
    });

    return this.getGuestWithDocuments(guestId);
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
        where: { guestId },
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

    // Check if user has permission to modify document permissions
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

    // Remove guest permission for this document
    await this.prisma.documentPermission.deleteMany({
      where: {
        guestId,
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
        documentPermissions: {
          include: {
            doc: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!guest) {
      throw new ApiException(ErrorCodeEnum.ResourceNotFound);
    }

    return {
      id: guest.id,
      email: guest.email,
      name: guest.name,
      status: guest.status,
      expireAt: guest.expireAt,
      createdAt: guest.createdAt,
      updatedAt: guest.updatedAt,
      invitedBy: guest.invitedBy,
      documents: guest.documentPermissions.map((dp) => ({
        documentId: dp.docId,
        documentTitle: dp.doc.title,
        permission: dp.permission,
        createdAt: dp.createdAt,
      })),
    };
  }
}
