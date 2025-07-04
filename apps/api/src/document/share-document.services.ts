import { ApiException } from "@/_shared/exceptions/api.exception";
import { Injectable, NotFoundException } from "@nestjs/common";
import { CommonSharedDocumentResponse, RemoveShareDto, ShareDocumentDto, UpdateSharePermissionDto } from "@idea/contracts";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";

@Injectable()
export class ShareDocumentService {
  constructor(private readonly prismaService: PrismaService) {}

  async getSharedDocuments(userId: string): Promise<CommonSharedDocumentResponse[]> {
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

  async shareDocument(userId: string, dto: ShareDocumentDto) {
    // const doc = await this.prismaService.doc.findFirst({
    //   where: { id: dto.docId, authorId: userId },
    // });
    // if (!doc) throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    // const targetUser = await this.prismaService.user.findFirst({
    //   where: { email: dto.email },
    // });
    // if (!targetUser) throw new ApiException(ErrorCodeEnum.UserNotFound);
    // if (targetUser.id === userId) {
    //   throw new ApiException(ErrorCodeEnum.CannotShareWithYourself);
    // }
    // const existingShare = await this.prismaService.docShare.findFirst({
    //   where: { docId: dto.docId, userId: targetUser.id },
    // });
    // if (existingShare) {
    //   throw new ApiException(ErrorCodeEnum.DocumentAlreadyShared);
    // }
    // await this.prismaService.docShare.create({
    //   data: {
    //     docId: dto.docId,
    //     userId: targetUser.id,
    //     permission: dto.permission,
    //     authorId: userId,
    //   },
    // });
    // return this.getDocShares(dto.docId, userId);
  }

  async getDocShares(id: string, userId: string) {
    return [];
  }

  async removeShare(id: string, userId: string, dto: RemoveShareDto) {
    const doc = await this.prismaService.doc.findFirst({
      where: { id, authorId: userId },
    });

    if (!doc) throw new NotFoundException("Document not found");

    await this.prismaService.docShare.deleteMany({
      where: { docId: id, userId: dto.targetUserId },
    });

    return this.getDocShares(id, userId);
  }

  async updateSharePermission(id: string, userId: string, dto: UpdateSharePermissionDto) {
    const doc = await this.prismaService.doc.findFirst({
      where: { id, authorId: userId },
    });

    if (!doc) throw new NotFoundException("Document not found");

    await this.prismaService.docShare.updateMany({
      where: { docId: id, userId: dto.userId },
      data: { permission: dto.permission },
    });

    return this.getDocShares(id, userId);
  }
}
