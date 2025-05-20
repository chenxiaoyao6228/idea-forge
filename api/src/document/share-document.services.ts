import { ApiException } from "@/_shared/exceptions/api.exception";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CommonSharedDocumentResponse, DocSharesResponse, Permission, RemoveShareDto, ShareDocumentDto, UpdateSharePermissionDto } from "contracts";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { type ExtendedPrismaClient, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";

@Injectable()
export class ShareDocumentService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient) {}

  async getSharedDocuments(userId: number): Promise<CommonSharedDocumentResponse[]> {
    // const docs = await this.prisma.doc.findMany({
    //   where: {
    //     sharedWith: { some: { userId } },
    //   },
    //   include: {
    //     sharedWith: {
    //       where: { userId },
    //       select: { permission: true },
    //     },
    //     owner: {
    //       select: {
    //         displayName: true,
    //         email: true,
    //       },
    //     },
    //     coverImage: true,
    //   },
    //   orderBy: {
    //     updatedAt: "desc",
    //   },
    // });

    // return docs.map((doc) => ({
    //   ...doc,
    //   permission: doc.sharedWith[0].permission as Permission,
    // }));
    return [];
  }

  async shareDocument(userId: number, dto: ShareDocumentDto) {
    const doc = await this.prisma.doc.findFirst({
      where: { id: dto.docId, authorId: userId },
    });

    if (!doc) throw new ApiException(ErrorCodeEnum.DocumentNotFound);

    const targetUser = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (!targetUser) throw new ApiException(ErrorCodeEnum.UserNotFound);

    if (targetUser.id === userId) {
      throw new ApiException(ErrorCodeEnum.CannotShareWithYourself);
    }

    const existingShare = await this.prisma.docShare.findFirst({
      where: { docId: dto.docId, userId: targetUser.id },
    });

    if (existingShare) {
      throw new ApiException(ErrorCodeEnum.DocumentAlreadyShared);
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

  async getDocShares(id: string, userId: number) {
    return [];
  }

  async removeShare(id: string, userId: number, dto: RemoveShareDto) {
    const doc = await this.prisma.doc.findFirst({
      where: { id, authorId: userId },
    });

    if (!doc) throw new NotFoundException("Document not found");

    await this.prisma.docShare.deleteMany({
      where: { docId: id, userId: dto.targetUserId },
    });

    return this.getDocShares(id, userId);
  }

  async updateSharePermission(id: string, userId: number, dto: UpdateSharePermissionDto) {
    const doc = await this.prisma.doc.findFirst({
      where: { id, authorId: userId },
    });

    if (!doc) throw new NotFoundException("Document not found");

    await this.prisma.docShare.updateMany({
      where: { docId: id, userId: dto.userId },
      data: { permission: dto.permission },
    });

    return this.getDocShares(id, userId);
  }
}
