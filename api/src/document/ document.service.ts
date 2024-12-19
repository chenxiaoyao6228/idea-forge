import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { CreateDocumentDto, SearchDocumentDto, UpdateDocumentDto } from "./document.dto";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { DEFAULT_NEW_DOC_TITLE } from "@/_shared/constants/common";
import { DEFAULT_NEW_DOC_CONTENT } from "@/_shared/constants/common";
import { CreateDocumentResponse } from "shared";
import { MoveDocumentsDto } from "shared";

const POSITION_GAP = 1024; // 定义间隔值

@Injectable()
export class DocumentService {
  constructor(private prisma: PrismaService) {}

  async createDefault(ownerId: number) {
    return this.create(ownerId, {
      title: DEFAULT_NEW_DOC_TITLE,
      content: DEFAULT_NEW_DOC_CONTENT,
      parentId: null,
      sharedPassword: null,
    });
  }

  async create(ownerId: number, dto: CreateDocumentDto): Promise<CreateDocumentResponse> {
    const doc = await this.prisma.doc.create({
      data: {
        ownerId,
        title: dto.title,
        content: dto.content,
        parentId: dto.parentId,
        sharedPassword: dto.sharedPassword,
        isArchived: false,
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

  async getDirectoryTree(userId: number, parentId?: string | null) {
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
        position: true,
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
      orderBy: {
        position: "asc",
      },
    });

    const res = docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      parentId: doc.parentId || null,
      ownerId: userId,
      isStarred: doc.isStarred,
      isArchived: false,
      isLeaf: doc._count.children === 0,
      position: doc.position,
    }));

    return res;
  }

  private async checkNeedReorder(siblings: any[], newPosition: number): Promise<boolean> {
    if (siblings.length === 0) return false;

    // 检查是否接近最大值或最小值
    const minPosition = siblings[0].position;
    const maxPosition = siblings[siblings.length - 1].position;

    if (minPosition < 2 || maxPosition > Number.MAX_SAFE_INTEGER - POSITION_GAP) {
      return true;
    }

    // 检查相邻位置是否过近
    for (let i = 1; i < siblings.length; i++) {
      if (siblings[i].position - siblings[i - 1].position <= 2) {
        return true;
      }
    }

    return false;
  }

  private async reorderDocuments(ownerId: number, parentId: string | null) {
    const documents = await this.prisma.doc.findMany({
      where: {
        parentId,
        ownerId,
        isArchived: false,
      },
      orderBy: { position: "asc" },
    });

    // 重新分配位置
    await this.prisma.$transaction(
      documents.map((doc, index) =>
        this.prisma.doc.update({
          where: { id: doc.id },
          data: { position: (index + 1) * POSITION_GAP },
        }),
      ),
    );
  }

  async moveDocuments(ownerId: number, { id, targetId, dropPosition }: MoveDocumentsDto) {
    // 1. 验证源文档和目标文档
    const [sourceDoc, targetDoc] = await Promise.all([
      this.prisma.doc.findFirst({
        where: { id, ownerId, isArchived: false },
      }),
      this.prisma.doc.findFirst({
        where: { id: targetId, ownerId, isArchived: false },
        include: {
          children: {
            where: { isArchived: false },
          },
        },
      }),
    ]);

    if (!sourceDoc || !targetDoc) {
      throw new NotFoundException("Document not found");
    }

    // 1. 确定目标文档是否是叶子节点
    const isLeaf = targetDoc?.children?.length === 0;

    // 2. 确定目标 parentId
    let targetParentId: string | null;
    if (!isLeaf && dropPosition === 0) {
      // 如果目标是文件夹且 dropPosition 为 0，则移动到文件夹内
      targetParentId = targetId;
    } else {
      // 否则移动到目标文档所在层级
      targetParentId = targetDoc.parentId;
    }

    // 3. 防止循环引用
    if (targetParentId && (await this.isDescendant(id, targetParentId))) {
      throw new BadRequestException("Cannot move a document to its descendant");
    }

    // 4. 获取同级文档
    const siblings = await this.prisma.doc.findMany({
      where: {
        parentId: targetParentId,
        ownerId,
        isArchived: false,
        id: { not: id },
      },
      orderBy: { position: "asc" },
    });

    // 5. 计算新位置
    let newPosition: number;

    if (siblings.length === 0) {
      // 如果没有同级文档，使用基础间隔
      newPosition = POSITION_GAP;
    } else if (!isLeaf && dropPosition === 0) {
      // 移动到文件夹内，放到最后
      if (targetDoc.children?.length) {
        newPosition = targetDoc.children[targetDoc.children.length - 1].position + POSITION_GAP;
      } else {
        newPosition = POSITION_GAP;
      }
    } else {
      const targetIndex = siblings.findIndex((s) => s.id === targetId);

      if (dropPosition === -1) {
        // 放到目标位置前面
        if (targetIndex === 0) {
          newPosition = Math.floor(siblings[0].position / 2);
        } else {
          newPosition = Math.floor((siblings[targetIndex - 1].position + targetDoc.position) / 2);
        }
      } else {
        // dropPosition === 1，放到目标位置后面
        if (targetIndex === siblings.length - 1) {
          newPosition = targetDoc.position + POSITION_GAP;
        } else {
          newPosition = Math.floor((targetDoc.position + siblings[targetIndex + 1].position) / 2);
        }
      }
    }

    // 6. 检查是否需要重排序
    const needReorder = await this.checkNeedReorder(siblings, newPosition);
    if (needReorder) {
      await this.reorderDocuments(ownerId, targetParentId);
      // 重新计算位置
      return this.moveDocuments(ownerId, { id, targetId, dropPosition });
    }

    // 7. 更新文档位置
    await this.prisma.doc.update({
      where: { id },
      data: {
        parentId: targetParentId,
        position: newPosition,
      },
    });

    // 8. 返回更新后的树结构
    // 如果移动到了新的父节点，需要返回原父节点和新父节点的结构
    const oldParentId = sourceDoc.parentId;
    if (oldParentId !== targetParentId) {
      const [oldTree, newTree] = await Promise.all([
        oldParentId ? this.getDirectoryTree(ownerId, oldParentId) : this.getDirectoryTree(ownerId),
        targetParentId ? this.getDirectoryTree(ownerId, targetParentId) : this.getDirectoryTree(ownerId),
      ]);
      return {
        oldTree,
        newTree,
      };
    }

    return this.getDirectoryTree(ownerId, targetParentId);
  }

  private async isDescendant(parentId: string, childId: string): Promise<boolean> {
    const child = await this.prisma.doc.findUnique({
      where: { id: childId },
      select: { parentId: true },
    });

    if (!child || !child.parentId) return false;
    if (child.parentId === parentId) return true;

    return this.isDescendant(parentId, child.parentId);
  }
}
