import { Injectable, NotFoundException } from "@nestjs/common";
import { type ExtendedPrismaClient, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";
import { Inject } from "@nestjs/common";
import { presentDocShare } from "./doc-share.presenter";
import { DocShareInfoDto, CreateShareDto, UpdateShareDto, RevokeShareDto, ShareListRequestDto, ListSharedWithMeDto, ListSharedByMeDto } from "./doc-share.dto";
import { DocShare, Prisma } from "@prisma/client";

type DocShareWithRelations = DocShare & {
  doc: {
    id: string;
    title: string;
    workspace: {
      id: string;
      name: string;
      description: string | null;
      avatar: string | null;
    };
    subspace: {
      id: string;
      name: string;
      description: string | null;
      avatar: string | null;
    } | null;
  };
  author: {
    id: number;
    email: string;
    displayName: string | null;
  };
  sharedTo: {
    id: number;
    email: string;
    displayName: string | null;
  };
};

@Injectable()
export class DocShareService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient) {}

  async getShareInfo(userId: string, dto: DocShareInfoDto) {
    const { id, documentId } = dto;
    const shares: DocShareWithRelations[] = [];

    const share = await this.prisma.docShare.findFirst({
      where: id
        ? {
            id,
            revokedAt: null,
          }
        : {
            docId: documentId,
            revokedAt: null,
          },
      include: {
        doc: {
          include: {
            workspace: true,
            subspace: true,
          },
        },
        author: true,
        sharedTo: true,
      },
    });

    if (share) {
      shares.push(share as DocShareWithRelations);
    }

    if (documentId) {
      const document = await this.prisma.doc.findUnique({
        where: { id: documentId },
        include: {
          workspace: true,
          subspace: true,
        },
      });

      if (!document) {
        throw new NotFoundException("Document not found");
      }

      // Check for parent document shares
      if (document.parentId) {
        const parentShare = await this.prisma.docShare.findFirst({
          where: {
            docId: document.parentId,
            revokedAt: null,
            includeChildDocuments: true,
            published: true,
          },
          include: {
            doc: {
              include: {
                workspace: true,
                subspace: true,
              },
            },
            author: true,
            sharedTo: true,
          },
        });

        if (parentShare) {
          shares.push(parentShare as DocShareWithRelations);
        }
      }
    }

    if (!shares.length) {
      return { status: 204 };
    }

    return {
      data: {
        shares: shares.map(presentDocShare),
      },
    };
  }

  async listShares(userId: string, dto: ShareListRequestDto) {
    const { limit = 20, page = 1, sortBy = "createdAt", sortOrder = "desc", query } = dto;

    const where = {
      authorId: userId,
      published: true,
      revokedAt: null,
      ...(query && {
        doc: {
          title: {
            contains: query,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      }),
    };

    const [shares, total] = await Promise.all([
      this.prisma.docShare.findMany({
        where,
        include: {
          doc: {
            include: {
              workspace: true,
              subspace: true,
            },
          },
          author: true,
          sharedTo: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.docShare.count({ where }),
    ]);

    return {
      pagination: { page, limit, total },
      data: shares.map((share) => presentDocShare(share as DocShareWithRelations)),
    };
  }

  async createShare(userId: string, dto: CreateShareDto) {
    const { documentId, published = false, urlId, includeChildDocuments = false } = dto;

    const document = await this.prisma.doc.findUnique({
      where: { id: documentId },
      include: {
        workspace: true,
      },
    });

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    const share = await this.prisma.docShare.create({
      data: {
        docId: documentId,
        authorId: userId,
        userId: userId,
        published,
        includeChildDocuments,
        urlId,
      },
      include: {
        doc: {
          include: {
            workspace: true,
            subspace: true,
          },
        },
        author: true,
        sharedTo: true,
      },
    });

    return {
      data: presentDocShare(share as DocShareWithRelations),
    };
  }

  async updateShare(userId: string, dto: UpdateShareDto) {
    const { id, includeChildDocuments, published, urlId, allowIndexing } = dto;

    const share = await this.prisma.docShare.findUnique({
      where: { id },
      include: {
        doc: {
          include: {
            workspace: true,
            subspace: true,
          },
        },
        author: true,
        sharedTo: true,
      },
    });

    if (!share) {
      throw new NotFoundException("Share not found");
    }

    if (share.authorId !== userId) {
      throw new NotFoundException("Not authorized to update this share");
    }

    const updatedShare = await this.prisma.docShare.update({
      where: { id },
      data: {
        includeChildDocuments,
        published,
        urlId,
      },
      include: {
        doc: {
          include: {
            workspace: true,
            subspace: true,
          },
        },
        author: true,
        sharedTo: true,
      },
    });

    return {
      data: presentDocShare(updatedShare as DocShareWithRelations),
    };
  }

  async revokeShare(userId: string, dto: RevokeShareDto) {
    const { id } = dto;

    const share = await this.prisma.docShare.findUnique({
      where: { id },
    });

    if (!share) {
      throw new NotFoundException("Share not found");
    }

    if (share.authorId !== userId) {
      throw new NotFoundException("Not authorized to revoke this share");
    }

    await this.prisma.docShare.update({
      where: { id },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      success: true,
    };
  }

  async listSharedWithMe(userId: string, dto: ListSharedWithMeDto) {
    const { page = 1, limit = 10, query } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.DocShareWhereInput = {
      userId: userId,
      revokedAt: null,
      published: true,
      ...(query && {
        doc: {
          title: {
            contains: query,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      }),
    };

    const [total, shares] = await Promise.all([
      this.prisma.docShare.count({ where }),
      this.prisma.docShare.findMany({
        where,
        skip,
        take: limit,
        include: {
          doc: {
            select: {
              id: true,
              title: true,
              workspace: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  avatar: true,
                },
              },
              subspace: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  avatar: true,
                },
              },
            },
          },
          author: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          sharedTo: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    if (!shares.length) {
      return { status: 204 };
    }

    return {
      pagination: {
        page,
        limit,
        total,
      },
      data: shares.map((share) => presentDocShare(share as DocShareWithRelations)),
    };
  }

  async listSharedByMe(userId: string, dto: ListSharedByMeDto) {
    const { page = 1, limit = 10, query } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.DocShareWhereInput = {
      authorId: userId,
      revokedAt: null,
      ...(query && {
        doc: {
          title: {
            contains: query,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      }),
    };

    const [total, shares] = await Promise.all([
      this.prisma.docShare.count({ where }),
      this.prisma.docShare.findMany({
        where,
        skip,
        take: limit,
        include: {
          doc: {
            select: {
              id: true,
              title: true,
              workspace: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  avatar: true,
                },
              },
              subspace: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  avatar: true,
                },
              },
            },
          },
          author: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          sharedTo: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    return {
      pagination: {
        page,
        limit,
        total,
      },
      data: shares,
    };
  }
}
