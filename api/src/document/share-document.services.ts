import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  CommonSharedDocumentResponse,
  DocSharesResponse,
  Permission,
  RemoveShareDto,
  ShareDocumentDto,
  UpdateSharePermissionDto,
} from "shared/dist/types/src/contracts/document";

@Injectable()
export class ShareDocumentService {
  constructor(private prisma: PrismaService) {}

  async getSharedDocuments(userId: number): Promise<CommonSharedDocumentResponse[]> {
    const docs = await this.prisma.doc.findMany({
      where: {
        sharedWith: { some: { userId } },
      },
      include: {
        sharedWith: {
          where: { userId },
          select: { permission: true },
        },
        owner: {
          select: {
            displayName: true,
            email: true,
          },
        },
        coverImage: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return docs.map((doc) => ({
      ...doc,
      permission: doc.sharedWith[0].permission as Permission,
    }));
  }

  async shareDocument(userId: number, dto: ShareDocumentDto) {
    const doc = await this.prisma.doc.findFirst({
      where: { id: dto.docId, ownerId: userId },
    });

    if (!doc) throw new NotFoundException("Document not found");

    const targetUser = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (!targetUser) throw new NotFoundException("User not found");

    if (targetUser.id === userId) {
      throw new BadRequestException("Cannot share with yourself");
    }

    const existingShare = await this.prisma.docShare.findFirst({
      where: { docId: dto.docId, userId: targetUser.id },
    });

    if (existingShare) {
      throw new BadRequestException("Document already shared with this user");
    }

    await this.prisma.docShare.create({
      data: {
        docId: dto.docId,
        userId: targetUser.id,
        permission: dto.permission,
        authorId: userId,
      },
    });

    return this.getDocShares(dto.docId, userId);
  }

  async getDocShares(id: string, userId: number): Promise<DocSharesResponse> {
    const doc = await this.prisma.doc.findFirst({
      where: { id, ownerId: userId },
      include: {
        sharedWith: {
          include: {
            sharedTo: {
              select: {
                id: true,
                email: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!doc) throw new NotFoundException("Document not found");

    return doc.sharedWith.map((share) => ({
      id: share.sharedTo.id,
      email: share.sharedTo.email,
      displayName: share.sharedTo.displayName,
      permission: share.permission as Permission,
    }));
  }

  async removeShare(id: string, userId: number, dto: RemoveShareDto) {
    const doc = await this.prisma.doc.findFirst({
      where: { id, ownerId: userId },
    });

    if (!doc) throw new NotFoundException("Document not found");

    await this.prisma.docShare.deleteMany({
      where: { docId: id, userId: dto.targetUserId },
    });

    return this.getDocShares(id, userId);
  }

  async updateSharePermission(id: string, userId: number, dto: UpdateSharePermissionDto) {
    const doc = await this.prisma.doc.findFirst({
      where: { id, ownerId: userId },
    });

    if (!doc) throw new NotFoundException("Document not found");

    await this.prisma.docShare.updateMany({
      where: { docId: id, userId: dto.userId },
      data: { permission: dto.permission },
    });

    return this.getDocShares(id, userId);
  }
}
