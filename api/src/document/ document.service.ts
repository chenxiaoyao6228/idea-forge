import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateDocumentDto, SearchDocumentDto, UpdateDocumentDto } from "./document.dto";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { DEFAULT_NEW_DOC_TITLE } from "@/_shared/constants/common";
import { DEFAULT_NEW_DOC_CONTENT } from "@/_shared/constants/common";
import { CreateDocumentResponse } from "shared";

@Injectable()
export class DocumentService {
  constructor(private prisma: PrismaService) {}

  async createDefault(ownerId: number) {
    return this.prisma.doc.create({
      data: {
        title: DEFAULT_NEW_DOC_TITLE,
        content: DEFAULT_NEW_DOC_CONTENT,
        ownerId,
        isArchived: false,
      },
    });
  }

  async create(ownerId: number, dto: CreateDocumentDto): Promise<CreateDocumentResponse> {
    const doc = await this.prisma.doc.create({
      data: {
        ownerId,
        isArchived: false,
        title: dto.title,
        content: dto.content,
        parentId: dto.parentId,
        sharedPassword: dto.sharedPassword,
        isStarred: false,
      },
    });

    return {
      ...doc,
      isLeaf: true,
    };
  }

  async findAll(ownerId: number) {
    return this.prisma.doc.findMany({
      where: {
        ownerId,
        isArchived: false,
      },
    });
  }

  async findOne(id: string, ownerId: number) {
    const doc = await this.prisma.doc.findFirst({
      where: {
        id,
        ownerId,
        isArchived: false,
      },
      include: {
        coverImage: true,
        children: true,
      },
    });

    if (!doc) throw new NotFoundException("Document not found");
    return doc;
  }

  async update(id: string, ownerId: number, dto: UpdateDocumentDto) {
    await this.findOne(id, ownerId); // 验证文档存在且属于该用户

    return this.prisma.doc.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, ownerId: number) {
    await this.findOne(id, ownerId);

    // Find and archive all child documents recursively
    await this.archiveChildren(id, ownerId);

    // Archive the document itself
    return this.prisma.doc.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  async archiveChildren(parentId: string, ownerId: number) {
    const children = await this.prisma.doc.findMany({
      where: {
        parentId,
        ownerId,
        isArchived: false,
      },
    });

    for (const child of children) {
      await this.archiveChildren(child.id, ownerId); // Recursively archive child documents
      await this.prisma.doc.update({
        where: { id: child.id },
        data: { isArchived: true },
      });
    }
  }

  async findLatest(ownerId: number) {
    const doc = await this.prisma.doc.findFirst({
      where: {
        ownerId,
        isArchived: false,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    console.log("doc", doc);
    return doc;
  }

  async countByUser(ownerId: number) {
    return this.prisma.doc.count({
      where: { ownerId },
    });
  }

  async searchDocuments(ownerId: number, { keyword, sort, order, page, limit }: SearchDocumentDto) {
    const skip = (page - 1) * limit;
    const documents = await this.prisma.doc.findMany({
      where: {
        ownerId,
        OR: [{ title: { contains: keyword, mode: "insensitive" } }, { content: { contains: keyword, mode: "insensitive" } }],
      },
      orderBy: {
        [sort]: order,
      },
      skip,
      take: limit,
    });

    const total = await this.prisma.doc.count({
      where: {
        OR: [{ title: { contains: keyword, mode: "insensitive" } }, { content: { contains: keyword, mode: "insensitive" } }],
      },
    });

    return { documents, total };
  }

  async getDirectoryTree(userId: number, parentId?: string) {
    const docs = await this.prisma.doc.findMany({
      where: {
        ownerId: userId,
        isArchived: false,
        parentId: parentId || null,
      },
      select: {
        id: true,
        title: true,
        isStarred: true,
        parentId: true,
        // 查询是否有子文档，但不加载子文档内容
        _count: {
          select: {
            children: {
              where: {
                isArchived: false,
              },
            },
          },
        },
      },
    });

    return docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      parentId: doc.parentId || null,
      ownerId: userId,
      isStarred: doc.isStarred,
      isArchived: false,
      isLeaf: doc._count.children === 0,
    }));
  }
}
