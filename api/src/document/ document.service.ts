import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { CreateDocumentDto, SearchDocumentDto, UpdateDocumentDto } from "./document.dto";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { DEFAULT_NEW_DOC_TITLE } from "@/_shared/constants/common";
import { DEFAULT_NEW_DOC_CONTENT } from "@/_shared/constants/common";
import { CommonDocumentResponse, CreateDocumentResponse, DetailDocumentResponse, Permission, UpdateCoverDto } from "shared";
import { MoveDocumentsDto } from "shared";
import { FileService } from "@/file-store/file-store.service";
import { pick } from "lodash";
const POSITION_GAP = 1024; // Define position gap

@Injectable()
export class DocumentService {
  constructor(
    private prisma: PrismaService,
    private fileService: FileService,
  ) {}

  async createDefault(ownerId: number) {
    return this.create(ownerId, {
      title: DEFAULT_NEW_DOC_TITLE,
      content: DEFAULT_NEW_DOC_CONTENT,
      parentId: null,
    });
  }

  async create(ownerId: number, dto: CreateDocumentDto): Promise<CreateDocumentResponse> {
    const doc = await this.prisma.doc.create({
      data: {
        ownerId,
        title: dto.title,
        content: dto.content,
        parentId: dto.parentId,
        isArchived: false,
        isStarred: false,
      },
    });

    return {
      ...doc,
      isLeaf: true,
      icon: null,
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

  async findOne(id: string, userId: number): Promise<DetailDocumentResponse> {
    try {
      const doc = await this.prisma.doc.findFirst({
        where: {
          id,
          OR: [
            { ownerId: userId },
            {
              sharedWith: {
                some: {
                  userId,
                },
              },
            },
          ],
          isArchived: false,
        },
        select: {
          id: true,
          title: true,
          isStarred: true,
          parentId: true,
          position: true,
          createdAt: true,
          updatedAt: true,
          isArchived: true,
          content: true,
          icon: true,
          ownerId: true,
          coverImage: {
            select: {
              scrollY: true,
              url: true,
            },
          },
          sharedWith: {
            where: {
              userId,
            },
            select: {
              permission: true,
            },
          },
        },
      });

      if (!doc) throw new NotFoundException("Document not found");

      const isMyDoc = doc.ownerId === userId;

      return {
        ...pick(doc, ["id", "ownerId", "title", "isStarred", "parentId", "position", "createdAt", "updatedAt", "isArchived", "content", "icon"]),
        coverImage: doc.coverImage
          ? {
              scrollY: doc.coverImage.scrollY,
              url: doc.coverImage.url,
            }
          : null,
        permission: isMyDoc ? "EDIT" : (doc.sharedWith[0]?.permission as Permission),
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async update(id: string, userId: number, dto: UpdateDocumentDto) {
    const doc = await this.prisma.doc.findFirst({
      where: {
        id,
        OR: [
          { ownerId: userId },
          {
            sharedWith: {
              some: {
                userId,
                permission: "EDIT",
              },
            },
          },
        ],
      },
      include: {
        sharedWith: {
          where: {
            userId,
          },
          select: {
            permission: true,
          },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException("Document not found");
    }

    if (doc.ownerId !== userId && (!doc.sharedWith[0] || doc.sharedWith[0].permission !== "EDIT")) {
      throw new ForbiddenException("You don't have permission to edit this document");
    }

    return this.prisma.doc.update({
      where: { id },
      data: {
        ...dto,
        parentId: dto.parentId === undefined ? null : dto.parentId,
      },
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

  async findLatestOrCreate(ownerId: number) {
    let doc = await this.prisma.doc.findFirst({
      where: {
        ownerId,
        isArchived: false,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!doc) {
      // Create a new document if none exists
      doc = await this.prisma.doc.create({
        data: {
          title: "Untitled",
          ownerId,
          content: "",
          position: 0,
        },
      });
    }

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

  async loadChildren(userId: number, parentId?: string | null): Promise<CommonDocumentResponse[]> {
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
        icon: true,
        parentId: true,
        position: true,
        createdAt: true,
        updatedAt: true,
        isArchived: true,
        _count: { select: { children: { where: { isArchived: false } } } },
      },
      orderBy: { position: "asc" },
    });

    return docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      isStarred: doc.isStarred,
      position: doc.position,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      isArchived: doc.isArchived,
      isLeaf: doc._count.children === 0,
      parentId: doc.parentId || null,
      icon: doc.icon || null,
    }));
  }

  async getNestedTree(userId: number, parentId?: string | null): Promise<CommonDocumentResponse[]> {
    // Get all ancestors up to root
    const ancestors: (string | null)[] = [];
    let currentParentId = parentId;

    while (currentParentId) {
      const parent = await this.prisma.doc.findFirst({
        where: { id: currentParentId, ownerId: userId, isArchived: false },
        select: { id: true, parentId: true },
      });
      if (!parent) break;
      ancestors.unshift(parent.id);
      currentParentId = parent.parentId;
    }

    // Get trees for each level starting from root
    const trees: CommonDocumentResponse[] = [];
    let currentParent: string | null = null;

    for (let i = 0; i <= ancestors.length; i++) {
      const children = await this.loadChildren(userId, currentParent);
      trees.push(...children);
      currentParent = ancestors[i];
    }

    return trees;
  }

  private async checkNeedReorder(siblings: any[], newPosition: number): Promise<boolean> {
    if (siblings.length === 0) return false;

    // Check if close to max or min values
    const minPosition = siblings[0].position;
    const maxPosition = siblings[siblings.length - 1].position;

    if (minPosition < 2 || maxPosition > Number.MAX_SAFE_INTEGER - POSITION_GAP) {
      return true;
    }

    // Check if adjacent positions are too close
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

    // Reassign positions
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
    // 1. Validate source and target documents
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

    // 1. Determine if target document is a leaf node
    const isLeaf = targetDoc?.children?.length === 0;

    // 2. Determine target parentId
    let targetParentId: string | null;
    if (dropPosition === 0) {
      targetParentId = targetId;
    } else {
      // Otherwise move to the same level as target document
      targetParentId = targetDoc.parentId;
    }

    // 3. Prevent circular references
    if (targetParentId && (await this.isDescendant(id, targetParentId))) {
      throw new BadRequestException("Cannot move a document to its descendant");
    }

    // 4. Get sibling documents
    const siblings = await this.prisma.doc.findMany({
      where: {
        parentId: targetParentId,
        ownerId,
        isArchived: false,
        id: { not: id },
      },
      orderBy: { position: "asc" },
    });

    // 5. Calculate new position
    let newPosition: number;

    if (siblings.length === 0) {
      // If no siblings, use base gap
      newPosition = POSITION_GAP;
    } else if (!isLeaf && dropPosition === 0) {
      // Moving inside folder, place at end
      if (targetDoc.children?.length) {
        newPosition = targetDoc.children[targetDoc.children.length - 1].position + POSITION_GAP;
      } else {
        newPosition = POSITION_GAP;
      }
    } else {
      const targetIndex = siblings.findIndex((s) => s.id === targetId);

      if (dropPosition === -1) {
        // Place before target position
        if (targetIndex === 0) {
          newPosition = Math.floor(siblings[0].position / 2);
        } else {
          newPosition = Math.floor((siblings[targetIndex - 1].position + targetDoc.position) / 2);
        }
      } else {
        // dropPosition === 1, place after target position
        if (targetIndex === siblings.length - 1) {
          newPosition = targetDoc.position + POSITION_GAP;
        } else {
          newPosition = Math.floor((targetDoc.position + siblings[targetIndex + 1].position) / 2);
        }
      }
    }

    // 6. Check if reordering is needed
    const needReorder = await this.checkNeedReorder(siblings, newPosition);
    if (needReorder) {
      await this.reorderDocuments(ownerId, targetParentId);
      // Recalculate position
      return this.moveDocuments(ownerId, { id, targetId, dropPosition });
    }

    // 7. Update document position
    await this.prisma.doc.update({
      where: { id },
      data: {
        parentId: targetParentId,
        position: newPosition,
      },
    });

    /*
     * 8. Return updated tree structure
     * If moved to a new parent, return structure of both old and new parent nodes
     * 1. Performance optimization:
     * Returning entire tree for large document trees would return unnecessary data
     * Only returning changed parts (old and new position subtrees) minimizes data transfer
     * Frontend only needs to update actually changed parts, not entire tree structure
     * 2. State preservation:
     * Frontend tree may have loaded multiple child levels, returning entire new tree would lose loaded states
     * By only updating changed parts, can maintain expand states and loaded children of other nodes
     */
    const oldParentId = sourceDoc.parentId;
    if (oldParentId !== targetParentId) {
      const [oldTree, newTree] = await Promise.all([
        oldParentId ? this.loadChildren(ownerId, oldParentId) : this.loadChildren(ownerId),
        targetParentId ? this.loadChildren(ownerId, targetParentId) : this.loadChildren(ownerId),
      ]);
      return {
        oldTree,
        newTree,
      };
    }

    return this.loadChildren(ownerId, targetParentId);
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

  async updateCover(docId: string, userId: number, dto: UpdateCoverDto) {
    // 1. 验证文档和封面存在
    const doc = await this.prisma.doc.findFirst({
      where: { id: docId, ownerId: userId },
      include: { coverImage: true },
    });
    if (!doc) throw new NotFoundException();

    // 2. 如果没有封面，创建新封面
    if (!doc.coverImage) {
      if (!dto.url) throw new BadRequestException("URL is required for new cover");
      return this.prisma.coverImage.create({
        data: {
          url: dto.url,
          scrollY: dto.scrollY || 0,
          docId: docId,
          isPreset: dto.isPreset || false,
        },
      });
    }

    // 3. 更新现有封面
    return this.prisma.coverImage.update({
      where: { docId },
      data: {
        ...(dto.url && { url: dto.url }),
        ...(dto.scrollY !== undefined && { scrollY: dto.scrollY }),
        ...(dto.isPreset !== undefined && { isPreset: dto.isPreset }),
      },
    });
  }

  async removeCover(docId: string, userId: number) {
    // 1. 验证文档和封面存在
    const doc = await this.prisma.doc.findFirst({
      where: { id: docId, ownerId: userId },
      include: { coverImage: true },
    });
    if (!doc || !doc.coverImage) throw new NotFoundException();

    // 2. 删除封面
    return await this.prisma.coverImage.delete({
      where: { docId },
    });
  }
}
