import { Injectable, BadRequestException, Inject } from "@nestjs/common";
import { CreateDocumentDto, DocumentPagerDto, UpdateDocumentDto } from "./document.dto";
import { CommonDocumentResponse, CreateDocumentResponse, UpdateCoverDto } from "contracts";
import { MoveDocumentsDto } from "contracts";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { Cron } from "@nestjs/schedule";
import { type ExtendedPrismaClient, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";

const POSITION_GAP = 1024; // Define position gap

@Injectable()
export class DocumentService {
  private static isCleanupRunning = false;
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient) {}

  async list(userId: number, dto: DocumentPagerDto) {
    const { isArchived, isStarred, subspaceId, parentId, page, limit, sortBy, sortOrder, visibility } = dto;

    const where: any = {
      AND: [
        isStarred ? { isStarred } : {},
        isArchived ? { isArchived } : {},
        subspaceId ? { subspaceId } : {},
        parentId === "null" ? { parentId: null } : parentId ? { parentId } : {},
        visibility ? { visibility } : {},
        {
          OR: [
            { authorId: userId },
            {
              DocShare: {
                some: { userId },
              },
            },
            {
              workspace: {
                members: {
                  some: { userId },
                },
              },
            },
          ],
        },
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.doc.findMany({
        where,
        orderBy: { [sortBy || "createdAt"]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              children: {
                where: { isArchived: false },
              },
            },
          },
        },
      }),
      this.prisma.doc.count({ where }),
    ]);

    const data = items.map((doc) => ({
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

    return {
      pagination: { page, limit, total },
      data,
    };
  }

  async createDefault(authorId: number) {
    // return this.create(authorId, {
    //   title: DEFAULT_NEW_DOC_TITLE,
    //   content: DEFAULT_NEW_DOC_CONTENT,
    //   parentId: null,
    // });
  }

  async create(authorId: number, dto: CreateDocumentDto): Promise<CreateDocumentResponse> {
    const doc = await this.prisma.doc.create({
      data: { ...dto, authorId },
    });

    return {
      ...doc,
      isLeaf: true,
      icon: null,
    };
  }

  async findAll(authorId: number) {
    return this.prisma.doc.findMany({
      where: {
        authorId,
        isArchived: false,
      },
    });
  }

  async findOne(id: string, userId: number) {
    // try {
    //   const doc = await this.prisma.doc.findFirst({
    //     where: {
    //       id,
    //       OR: [
    //         { authorId: userId },
    //         {
    //           sharedWith: {
    //             some: {
    //               userId,
    //             },
    //           },
    //         },
    //       ],
    //       isArchived: false,
    //     },
    //     select: {
    //       id: true,
    //       title: true,
    //       isStarred: true,
    //       parentId: true,
    //       position: true,
    //       createdAt: true,
    //       updatedAt: true,
    //       isArchived: true,
    //       content: true,
    //       icon: true,
    //       authorId: true,
    //       coverImage: {
    //         select: {
    //           scrollY: true,
    //           url: true,
    //         },
    //       },
    //       sharedWith: {
    //         where: {
    //           userId,
    //         },
    //         select: {
    //           permission: true,
    //         },
    //       },
    //     },
    //   });
    //   if (!doc) throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    //   const isMyDoc = doc.authorId === userId;
    //   return {
    //     ...pick(doc, ["id", "authorId", "title", "isStarred", "parentId", "position", "createdAt", "updatedAt", "isArchived", "content", "icon"]),
    //     coverImage: doc.coverImage
    //       ? {
    //           scrollY: doc.coverImage.scrollY,
    //           url: doc.coverImage.url,
    //         }
    //       : null,
    //     permission: isMyDoc ? "EDIT" : (doc.sharedWith[0]?.permission as Permission),
    //   };
    // } catch (error) {
    //   console.error(error);
    //   throw error;
    // }
  }

  async update(id: string, userId: number, dto: UpdateDocumentDto) {
    // return [];
    // const doc = await this.prisma.doc.findFirst({
    //   where: {
    //     id,
    //     OR: [
    //       { authorId: userId },
    //       {
    //         sharedWith: {
    //           some: {
    //             userId,
    //             permission: "EDIT",
    //           },
    //         },
    //       },
    //     ],
    //   },
    //   include: {
    //     sharedWith: {
    //       where: {
    //         userId,
    //       },
    //       select: {
    //         permission: true,
    //       },
    //     },
    //   },
    // });
    // if (!doc) {
    //   throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    // }
    // if (doc.authorId !== userId && (!doc.sharedWith[0] || doc.sharedWith[0].permission !== "EDIT")) {
    //   throw new ApiException(ErrorCodeEnum.DocumentAccessDenied);
    // }
    // const res = await this.prisma.doc.update({
    //   where: { id },
    //   data: {
    //     ...dto,
    //     parentId: dto.parentId === undefined ? null : dto.parentId,
    //   },
    // });
    // return omit(res, ["contentBinary"]);
  }

  async remove(id: string, authorId: number) {
    await this.findOne(id, authorId);

    // Find and archive all child documents recursively
    await this.archiveChildren(id, authorId);

    // Delete all shares for this document
    await this.prisma.docShare.deleteMany({
      where: { docId: id },
    });

    // Archive the document itself
    return this.prisma.doc.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  async archiveChildren(parentId: string, authorId: number) {
    const children = await this.prisma.doc.findMany({
      where: {
        parentId,
        authorId,
        isArchived: false,
      },
    });

    for (const child of children) {
      await this.archiveChildren(child.id, authorId); // Recursively archive child documents

      // Delete shares for child document
      await this.prisma.docShare.deleteMany({
        where: { docId: child.id },
      });

      await this.prisma.doc.update({
        where: { id: child.id },
        data: { isArchived: true },
      });
    }
  }

  async findLatestOrCreate(authorId: number) {
    // let doc = await this.prisma.doc.findFirst({
    //   where: {
    //     authorId,
    //     isArchived: false,
    //   },
    //   orderBy: {
    //     updatedAt: "desc",
    //   },
    // });
    // if (!doc) {
    //   // Create a new document if none exists
    //   doc = await this.prisma.doc.create({
    //     data: {
    //       title: "Untitled",
    //       authorId,
    //       content: "",
    //       position: 0,
    //     },
    //   });
    // }
    // return doc;
  }

  async countByUser(authorId: number) {
    return this.prisma.doc.count({
      where: { authorId },
    });
  }

  async loadChildren(userId: number, parentId?: string | null): Promise<CommonDocumentResponse[]> {
    const docs = await this.prisma.doc.findMany({
      where: {
        authorId: userId,
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
        where: { id: currentParentId, authorId: userId, isArchived: false },
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

  private async reorderDocuments(authorId: number, parentId: string | null) {
    const documents = await this.prisma.doc.findMany({
      where: {
        parentId,
        authorId,
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

  async moveDocuments(authorId: number, { id, targetId, dropPosition }: MoveDocumentsDto) {
    // 1. Validate source and target documents
    const [sourceDoc, targetDoc] = await Promise.all([
      this.prisma.doc.findFirst({
        where: { id, authorId, isArchived: false },
      }),
      this.prisma.doc.findFirst({
        where: { id: targetId, authorId, isArchived: false },
        include: {
          children: {
            where: { isArchived: false },
          },
        },
      }),
    ]);

    if (!sourceDoc || !targetDoc) {
      throw new ApiException(ErrorCodeEnum.DocumentNotFound);
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
      throw new ApiException(ErrorCodeEnum.DocumentCircularReference);
    }

    // 4. Get sibling documents
    const siblings = await this.prisma.doc.findMany({
      where: {
        parentId: targetParentId,
        authorId,
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
      await this.reorderDocuments(authorId, targetParentId);
      // Recalculate position
      return this.moveDocuments(authorId, { id, targetId, dropPosition });
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
        oldParentId ? this.loadChildren(authorId, oldParentId) : this.loadChildren(authorId),
        targetParentId ? this.loadChildren(authorId, targetParentId) : this.loadChildren(authorId),
      ]);
      return {
        oldTree,
        newTree,
      };
    }

    return this.loadChildren(authorId, targetParentId);
  }
  async duplicate(userId: number, id: string) {
    // // Find original document with children
    // const originalDoc = await this.prisma.doc.findFirst({
    //   where: {
    //     id,
    //     authorId: userId,
    //     isArchived: false,
    //   },
    //   include: {
    //     coverImage: true,
    //     children: {
    //       where: { isArchived: false },
    //       include: {
    //         coverImage: true,
    //       },
    //     },
    //   },
    // });
    // if (!originalDoc) {
    //   throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    // }
    // // Get siblings to calculate position
    // const siblings = await this.prisma.doc.findMany({
    //   where: {
    //     parentId: originalDoc.parentId,
    //     authorId: userId,
    //     isArchived: false,
    //   },
    //   orderBy: { position: "desc" },
    //   take: 1,
    // });
    // const newPosition = siblings.length > 0 ? siblings[0].position + POSITION_GAP : POSITION_GAP;
    // // Create duplicate document
    // const duplicatedDoc = await this.prisma.doc.create({
    //   data: {
    //     title: `${originalDoc.title} (copy)`,
    //     // FIXME: the content is not sync with the contentBinary
    //     content: originalDoc.content,
    //     contentBinary: originalDoc.contentBinary,
    //     authorId: userId,
    //     parentId: originalDoc.parentId,
    //     position: newPosition,
    //     icon: originalDoc.icon,
    //     isArchived: false,
    //     isStarred: false,
    //   },
    // });
    // // Duplicate cover image if exists
    // if (originalDoc.coverImage) {
    //   await this.prisma.coverImage.create({
    //     data: {
    //       docId: duplicatedDoc.id,
    //       url: originalDoc.coverImage.url,
    //       scrollY: originalDoc.coverImage.scrollY,
    //       isPreset: originalDoc.coverImage.isPreset,
    //     },
    //   });
    // }
    // // Recursively duplicate children
    // if (originalDoc.children.length > 0) {
    //   await this.duplicateChildren(originalDoc.children, duplicatedDoc.id, userId);
    // }
    // return {
    //   ...duplicatedDoc,
    //   isLeaf: originalDoc.children.length === 0,
    //   icon: duplicatedDoc.icon,
    // };
  }

  private async duplicateChildren(children: any[], newParentId: string, userId: number, positionOffset = 0) {
    // for (const child of children) {
    //   // Create duplicate of child
    //   const duplicatedChild = await this.prisma.doc.create({
    //     data: {
    //       title: child.title,
    //       content: child.content,
    //       contentBinary: child.contentBinary,
    //       authorId: userId,
    //       parentId: newParentId,
    //       position: child.position + positionOffset,
    //       icon: child.icon,
    //       isArchived: false,
    //       isStarred: false,
    //     },
    //   });
    //   // Duplicate child's cover image if exists
    //   if (child.coverImage) {
    //     await this.prisma.coverImage.create({
    //       data: {
    //         docId: duplicatedChild.id,
    //         url: child.coverImage.url,
    //         scrollY: child.coverImage.scrollY,
    //         isPreset: child.coverImage.isPreset,
    //       },
    //     });
    //   }
    // Recursively duplicate this child's children
    //   const grandchildren = await this.prisma.doc.findMany({
    //     where: {
    //       parentId: child.id,
    //       isArchived: false,
    //     },
    //     include: {
    //       coverImage: true,
    //     },
    //   });
    //   if (grandchildren.length > 0) {
    //     await this.duplicateChildren(grandchildren, duplicatedChild.id, userId);
    //   }
    // }
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
    // 1. verify doc and cover exist
    const doc = await this.prisma.doc.findFirst({
      where: { id: docId, authorId: userId },
      include: { coverImage: true },
    });
    if (!doc) throw new ApiException(ErrorCodeEnum.DocumentNotFound);

    // 2. if no cover, create new cover
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

    // 3. update existing cover
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
    // 1. verify doc and cover exist
    const doc = await this.prisma.doc.findFirst({
      where: { id: docId, authorId: userId },
      include: { coverImage: true },
    });
    if (!doc || !doc.coverImage) throw new ApiException(ErrorCodeEnum.DocumentCoverNotFound);

    // 2. delete cover
    return await this.prisma.coverImage.delete({
      where: { docId },
    });
  }

  async getTrash(userId: number) {
    return await this.prisma.doc.findMany({
      where: {
        authorId: userId,
        isArchived: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        icon: true,
      },
    });
  }

  async restore(id: string, userId: number) {
    // Verify document exists and belongs to user
    const doc = await this.prisma.doc.findFirst({
      where: {
        id,
        authorId: userId,
        isArchived: true,
      },
      include: {
        parent: true, // Include parent document info
      },
    });

    if (!doc) throw new ApiException(ErrorCodeEnum.DocumentNotFound);

    // Check if parent is archived
    const shouldMoveToRoot = doc.parent?.isArchived;

    // Restore document and all its children
    await this.restoreChildren(id, userId);

    return await this.prisma.doc.update({
      where: { id },
      data: {
        isArchived: false,
        // If parent is archived, move document to root
        parentId: shouldMoveToRoot ? null : doc.parentId,
        // If moving to root, append to end of root documents
        ...(shouldMoveToRoot && {
          position: (await this.getLastPositionInRoot(userId)) + POSITION_GAP,
        }),
      },
    });
  }

  // Helper function to get the last position in root
  private async getLastPositionInRoot(userId: number): Promise<number> {
    const lastDoc = await this.prisma.doc.findFirst({
      where: {
        authorId: userId,
        parentId: null,
        isArchived: false,
      },
      orderBy: {
        position: "desc",
      },
      select: {
        position: true,
      },
    });

    return lastDoc?.position || 0;
  }

  private async restoreChildren(parentId: string, userId: number) {
    const children = await this.prisma.doc.findMany({
      where: {
        parentId,
        authorId: userId,
        isArchived: true,
      },
    });

    for (const child of children) {
      await this.restoreChildren(child.id, userId);
      await this.prisma.doc.update({
        where: { id: child.id },
        data: { isArchived: false },
      });
    }
  }

  async permanentDelete(id: string, userId: number) {
    // Verify document exists and belongs to user
    const doc = await this.prisma.doc.findFirst({
      where: {
        id,
        authorId: userId,
        isArchived: true,
      },
      include: {
        coverImage: true,
      },
    });

    if (!doc) throw new ApiException(ErrorCodeEnum.DocumentNotFound);

    // Delete all children recursively
    await this.permanentDeleteChildren(id, userId);

    // Delete document's cover image if exists
    if (doc.coverImage) {
      await this.prisma.coverImage.delete({
        where: { docId: id },
      });
    }

    // Delete document's shares
    await this.prisma.docShare.deleteMany({
      where: { docId: id },
    });

    // Finally delete the document
    return await this.prisma.doc.delete({
      where: { id },
    });
  }

  private async permanentDeleteChildren(parentId: string, userId: number) {
    const children = await this.prisma.doc.findMany({
      where: {
        parentId,
        authorId: userId,
      },
      include: {
        coverImage: true,
      },
    });

    for (const child of children) {
      await this.permanentDeleteChildren(child.id, userId);

      // Delete child's cover image if exists
      if (child.coverImage) {
        await this.prisma.coverImage.delete({
          where: { docId: child.id },
        });
      }

      // Delete child's shares
      await this.prisma.docShare.deleteMany({
        where: { docId: child.id },
      });

      // Delete the child document
      await this.prisma.doc.delete({
        where: { id: child.id },
      });
    }
  }

  async emptyTrash(userId: number) {
    // Get all archived documents
    const archivedDocs = await this.prisma.doc.findMany({
      where: {
        authorId: userId,
        isArchived: true,
      },
      include: {
        coverImage: true,
      },
    });

    // Delete all archived documents and their related data
    for (const doc of archivedDocs) {
      await this.permanentDelete(doc.id, userId);
    }

    return { success: true };
  }

  @Cron("0 0 * * *") // every day at 00:00
  async cleanupExpiredDocuments() {
    if (DocumentService.isCleanupRunning) {
      console.log("[Cleanup] Task already running, skipping...");
      return;
    }

    DocumentService.isCleanupRunning = true;
    console.log("[Cleanup] Task started at:", new Date().toISOString());

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await this.prisma.$transaction(async (tx) => {
        const expiredDocs = await tx.doc.findMany({
          where: {
            isArchived: true,
            updatedAt: {
              lt: thirtyDaysAgo,
            },
          },
          include: {
            coverImage: true,
          },
          orderBy: {
            updatedAt: "asc",
          },
          take: 10,
        });

        console.log(`[Cleanup] Found ${expiredDocs.length} expired documents`);

        for (const doc of expiredDocs) {
          try {
            const existingDoc = await tx.doc.findUnique({
              where: { id: doc.id },
              include: { coverImage: true },
            });

            if (!existingDoc) {
              console.log(`[Cleanup] Document ${doc.id} no longer exists`);
              continue;
            }

            if (existingDoc.coverImage) {
              await tx.coverImage.delete({
                where: { docId: doc.id },
              });
            }

            await tx.docShare.deleteMany({
              where: { docId: doc.id },
            });

            await tx.doc.delete({
              where: { id: doc.id },
            });

            console.log(`[Cleanup] Successfully deleted document ${doc.id}`);
            await new Promise((resolve) => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`[Cleanup] Error processing document ${doc.id}:`, error);
          }
        }
      });
    } catch (error) {
      console.error("[Cleanup] Task error:", error);
    } finally {
      DocumentService.isCleanupRunning = false;
      console.log("[Cleanup] Task completed at:", new Date().toISOString());
    }
  }
}
