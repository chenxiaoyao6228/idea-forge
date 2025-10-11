import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { DocPermissionResolveService } from "@/permission/document-permission.service";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { GetOrCreateShareDto, UpdateShareDto, RevokeShareDto, ListSharesDto } from "./public-share.dto";
import { NavigationTreeNode, ExpirationDuration } from "@idea/contracts";
import { presentPublicShare } from "./public-share.presenter";
import { Prisma, PermissionLevel } from "@prisma/client";
import { BusinessEvents } from "@/_shared/socket/business-event.constant";
import { generateUuid } from "@/_shared/utils/uuid";
import { isbot } from "isbot";

@Injectable()
export class PublicShareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly docPermissionService: DocPermissionResolveService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  /**
   * Emit WebSocket event for public share actions
   */
  private async emitPublicShareEvent(name: BusinessEvents, data: any, workspaceId: string, userId: string) {
    await this.eventPublisher.publishWebsocketEvent({
      name,
      workspaceId,
      actorId: userId,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Verify user has MANAGE permission on document
   */
  private async verifyManagePermission(userId: string, documentId: string) {
    const doc = await this.prisma.doc.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        parentId: true,
        subspaceId: true,
        workspaceId: true,
      },
    });

    if (!doc) {
      throw new NotFoundException("Document not found");
    }

    const permissionResult = await this.docPermissionService.resolveUserPermissionForDocument(userId, doc);

    if (permissionResult.level !== PermissionLevel.MANAGE) {
      throw new ForbiddenException("Only users with MANAGE permission can create public shares");
    }

    return doc;
  }

  /**
   * Get or create a public share (upsert pattern)
   */
  async getOrCreateShare(userId: string, dto: GetOrCreateShareDto) {
    const { documentId, workspaceId, duration = "NEVER" } = dto;

    // Check workspace allowPublicSharing setting
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { allowPublicSharing: true },
    });

    if (!workspace) {
      throw new NotFoundException("Workspace not found");
    }

    if (!workspace.allowPublicSharing) {
      throw new ForbiddenException("Public sharing is disabled for this workspace");
    }

    // Verify user has MANAGE permission
    const doc = await this.verifyManagePermission(userId, documentId);

    if (doc.workspaceId !== workspaceId) {
      throw new BadRequestException("Document does not belong to specified workspace");
    }

    // Calculate expiration
    const expiresAt = this.calculateExpiresAt(duration);

    // Check if share already exists
    const existingShare = await this.prisma.publicShare.findUnique({
      where: { docId: documentId },
      include: {
        doc: true,
        workspace: true,
        author: true,
      },
    });

    if (existingShare) {
      // If share was revoked, un-revoke it (reactivate)
      if (existingShare.revokedAt) {
        const reactivatedShare = await this.prisma.publicShare.update({
          where: { id: existingShare.id },
          data: {
            revokedAt: null,
            expiresAt,
            published: true,
          },
          include: {
            doc: true,
            workspace: true,
            author: true,
          },
        });

        // Emit WebSocket event for reactivation
        await this.emitPublicShareEvent(
          BusinessEvents.PUBLIC_SHARE_CREATED,
          {
            docId: reactivatedShare.docId,
            shareId: reactivatedShare.id,
            token: reactivatedShare.token,
            url: presentPublicShare(reactivatedShare).url,
            expiresAt: reactivatedShare.expiresAt,
            createdBy: {
              id: reactivatedShare.author.id,
              email: reactivatedShare.author.email,
              displayName: reactivatedShare.author.displayName,
            },
          },
          workspaceId,
          userId,
        );

        return {
          data: presentPublicShare(reactivatedShare),
          created: true,
        };
      }

      // Share already exists and is active, return it
      return {
        data: presentPublicShare(existingShare),
        created: false,
      };
    }

    // Create new share
    const share = await this.prisma.publicShare.create({
      data: {
        docId: documentId,
        workspaceId: workspaceId,
        authorId: userId,
        token: this.generateToken(),
        published: true,
        expiresAt,
      },
      include: {
        doc: true,
        workspace: true,
        author: true,
      },
    });

    // Emit WebSocket event
    await this.emitPublicShareEvent(
      BusinessEvents.PUBLIC_SHARE_CREATED,
      {
        docId: share.docId,
        shareId: share.id,
        token: share.token,
        url: presentPublicShare(share).url,
        expiresAt: share.expiresAt,
        createdBy: {
          id: share.author.id,
          email: share.author.email,
          displayName: share.author.displayName,
        },
      },
      workspaceId,
      userId,
    );

    return {
      data: presentPublicShare(share),
      created: true,
    };
  }

  /**
   * Update share settings
   */
  async updateShare(userId: string, shareId: string, dto: UpdateShareDto) {
    const share = await this.prisma.publicShare.findUnique({
      where: { id: shareId },
      select: { authorId: true, docId: true, workspaceId: true },
    });

    if (!share) {
      throw new NotFoundException("Share not found");
    }

    // Verify user has MANAGE permission on the document
    await this.verifyManagePermission(userId, share.docId);

    // Build update data
    const updateData: Prisma.PublicShareUpdateInput = {};

    if (dto.duration !== undefined) {
      updateData.expiresAt = this.calculateExpiresAt(dto.duration);
    }

    if (dto.urlId !== undefined) {
      updateData.urlId = dto.urlId;
    }

    if (dto.allowIndexing !== undefined) {
      updateData.allowIndexing = dto.allowIndexing;
    }

    const updatedShare = await this.prisma.publicShare.update({
      where: { id: shareId },
      data: updateData,
      include: {
        doc: true,
        workspace: true,
        author: true,
      },
    });

    // Emit WebSocket event
    await this.emitPublicShareEvent(
      BusinessEvents.PUBLIC_SHARE_UPDATED,
      {
        docId: updatedShare.docId,
        shareId: updatedShare.id,
        token: updatedShare.token,
        expiresAt: updatedShare.expiresAt,
        updatedBy: {
          id: userId,
          email: updatedShare.author.email,
          displayName: updatedShare.author.displayName,
        },
      },
      share.workspaceId,
      userId,
    );

    return {
      data: presentPublicShare(updatedShare),
    };
  }

  /**
   * Revoke a share (soft delete)
   */
  async revokeShare(userId: string, dto: RevokeShareDto) {
    const share = await this.prisma.publicShare.findUnique({
      where: { id: dto.id },
      select: { authorId: true, docId: true, workspaceId: true, token: true },
    });

    if (!share) {
      throw new NotFoundException("Share not found");
    }

    // Verify user has MANAGE permission on the document
    await this.verifyManagePermission(userId, share.docId);

    await this.prisma.publicShare.update({
      where: { id: dto.id },
      data: {
        revokedAt: new Date(),
      },
    });

    // Get user info for event
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true },
    });

    // Emit WebSocket event
    await this.emitPublicShareEvent(
      BusinessEvents.PUBLIC_SHARE_REVOKED,
      {
        docId: share.docId,
        shareId: dto.id,
        token: share.token,
        revokedBy: {
          id: user?.id || userId,
          email: user?.email || "",
          displayName: user?.displayName,
        },
      },
      share.workspaceId,
      userId,
    );

    return {
      success: true,
    };
  }

  /**
   * List user's shares (paginated)
   */
  async listShares(userId: string, dto: ListSharesDto) {
    const { limit = 20, page = 1, sortBy = "createdAt", sortOrder = "desc", query } = dto;

    const where: Prisma.PublicShareWhereInput = {
      published: true,
      revokedAt: null,
      doc: {
        deletedAt: null,
      },
      ...(query && {
        doc: {
          title: {
            contains: query,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      }),
    };

    // Only show shares for documents the user can manage
    // Note: This is a simplified check. For better performance,
    // we should implement a more efficient permission check
    const [shares, total] = await Promise.all([
      this.prisma.publicShare.findMany({
        where,
        include: {
          doc: true,
          workspace: true,
          author: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.publicShare.count({ where }),
    ]);

    // Filter shares based on user's MANAGE permission
    const sharesWithPermission: typeof shares = [];
    for (const share of shares) {
      try {
        const doc = {
          id: share.doc.id,
          parentId: share.doc.parentId,
          subspaceId: share.doc.subspaceId,
          workspaceId: share.doc.workspaceId,
        };
        const permissionResult = await this.docPermissionService.resolveUserPermissionForDocument(userId, doc);
        if (permissionResult.level === PermissionLevel.MANAGE) {
          sharesWithPermission.push(share);
        }
      } catch (error) {
        // Skip shares where user doesn't have permission
        // Error is caught and we don't add the share to the result
      }
    }

    return {
      pagination: { page, limit, total: sharesWithPermission.length },
      data: sharesWithPermission.map((share) => presentPublicShare(share)),
    };
  }

  /**
   * Get single share by ID
   */
  async getShareById(userId: string, shareId: string) {
    const share = await this.prisma.publicShare.findUnique({
      where: { id: shareId },
      include: {
        doc: true,
        workspace: true,
        author: true,
      },
    });

    if (!share) {
      throw new NotFoundException("Share not found");
    }

    // Verify user has MANAGE permission on the document
    await this.verifyManagePermission(userId, share.docId);

    return {
      data: presentPublicShare(share),
    };
  }

  /**
   * Get single share by document ID
   */
  async getShareByDocId(userId: string, docId: string) {
    const share = await this.prisma.publicShare.findUnique({
      where: { docId },
      include: {
        doc: true,
        workspace: true,
        author: true,
      },
    });

    if (!share) {
      return null;
    }

    // Verify user has MANAGE permission on the document
    await this.verifyManagePermission(userId, docId);

    return presentPublicShare(share);
  }

  /**
   * Public access: Get document by token or slug
   */
  async getPublicDocument(tokenOrSlug: string, request: any) {
    // Find share by token OR urlId
    const share = await this.prisma.publicShare.findFirst({
      where: {
        OR: [{ token: tokenOrSlug }, { urlId: tokenOrSlug }],
      },
      include: {
        doc: {
          include: {
            workspace: true,
            coverImage: true,
          },
        },
        workspace: true,
        author: true,
      },
    });

    if (!share) {
      throw new NotFoundException("Share not found");
    }

    // Check revocation
    if (share.revokedAt) {
      throw new ForbiddenException(`This link was revoked on ${share.revokedAt.toISOString()}`);
    }

    // Check expiration
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new ForbiddenException(`This link expired on ${share.expiresAt.toISOString()}`);
    }

    // Check document state (Q9.1 - deleted/archived)
    if (share.doc.deletedAt) {
      throw new NotFoundException("This document has been deleted");
    }

    if (share.doc.archivedAt) {
      throw new ForbiddenException("This document has been archived");
    }

    // Track view (with bot filtering)
    await this.trackView(share.id, request);

    // Build hierarchical navigation tree
    const navigationTree = await this.buildNavigationTree(share.docId);

    // Return sanitized document
    return {
      share: {
        id: share.id,
        permission: share.permission,
        viewCount: share.views,
      },
      doc: {
        id: share.doc.id,
        title: share.doc.title,
        content: share.doc.content,
        icon: share.doc.icon,
        coverImage: share.doc.coverImage,
        workspace: {
          id: share.workspace.id,
          name: share.workspace.name,
          avatar: share.workspace.avatar,
        },
      },
      navigationTree,
    };
  }

  /**
   * Public access: Get nested child document
   */
  async getPublicNestedDocument(token: string, documentId: string, request: any) {
    // Find parent share by token
    const share = await this.prisma.publicShare.findUnique({
      where: { token },
      include: {
        doc: true,
        workspace: true,
        author: true,
      },
    });

    if (!share) {
      throw new NotFoundException("Share not found");
    }

    // Validate share (same checks as getPublicDocument)
    if (share.revokedAt) {
      throw new ForbiddenException(`This link was revoked on ${share.revokedAt.toISOString()}`);
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new ForbiddenException(`This link expired on ${share.expiresAt.toISOString()}`);
    }

    // Check if documentId is descendant of share.docId
    const isDescendant = await this.isDescendantOf(documentId, share.docId);
    if (!isDescendant) {
      throw new NotFoundException("Document not found in this share");
    }

    // Fetch the child document
    const childDoc = await this.prisma.doc.findUnique({
      where: { id: documentId },
      include: {
        workspace: true,
        coverImage: true,
      },
    });

    if (!childDoc) {
      throw new NotFoundException("Document not found");
    }

    // Check document state
    if (childDoc.deletedAt) {
      throw new NotFoundException("This document has been deleted");
    }

    if (childDoc.archivedAt) {
      throw new ForbiddenException("This document has been archived");
    }

    // Track view
    await this.trackView(share.id, request);

    // Build hierarchical navigation tree from the root share document
    // (not from the current child - we want the full tree for navigation)
    const navigationTree = await this.buildNavigationTree(share.docId);

    return {
      share: {
        id: share.id,
        permission: share.permission,
        viewCount: share.views,
      },
      doc: {
        id: childDoc.id,
        title: childDoc.title,
        content: childDoc.content,
        icon: childDoc.icon,
        coverImage: childDoc.coverImage,
        workspace: {
          id: childDoc.workspace.id,
          name: childDoc.workspace.name,
          avatar: childDoc.workspace.avatar,
        },
      },
      navigationTree,
    };
  }

  private generateToken(): string {
    return generateUuid();
  }

  /**
   * Helper: Calculate expiration date from duration
   */
  private calculateExpiresAt(duration: ExpirationDuration): Date | null {
    if (duration === "NEVER") return null;
    const now = new Date();
    switch (duration) {
      case "ONE_HOUR":
        return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

      case "ONE_DAY":
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day

      case "ONE_WEEK":
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      case "ONE_MONTH":
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      default:
        return null;
    }
  }

  /**
   * Helper: Track view with bot filtering
   */
  private async trackView(shareId: string, request: any) {
    // Bot filtering using isbot library
    const userAgent = request.headers?.["user-agent"] || "";

    if (isbot(userAgent)) {
      return; // Don't count bot views
    }

    // Atomic increment
    await this.prisma.publicShare.update({
      where: { id: shareId },
      data: {
        views: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });
  }

  /**
   * Helper: Check if document is descendant of ancestor
   */
  private async isDescendantOf(childId: string, ancestorId: string): Promise<boolean> {
    // If same document, it's technically a descendant (or the document itself)
    if (childId === ancestorId) return true;

    const child = await this.prisma.doc.findUnique({
      where: { id: childId },
      select: { parentId: true },
    });

    if (!child || !child.parentId) return false;

    // Recursive check up the tree
    return this.isDescendantOf(child.parentId, ancestorId);
  }

  /**
   * Helper: Build hierarchical navigation tree from root document
   * Returns nested structure: { id, title, icon, parentId, children: [...] }
   */
  private async buildNavigationTree(docId: string): Promise<NavigationTreeNode> {
    // Fetch current document
    const doc = await this.prisma.doc.findUnique({
      where: { id: docId },
      select: {
        id: true,
        title: true,
        icon: true,
        parentId: true,
      },
    });

    if (!doc) {
      throw new NotFoundException("Document not found");
    }

    // Fetch all direct children (not deleted, not archived)
    const children = await this.prisma.doc.findMany({
      where: {
        parentId: docId,
        deletedAt: null,
        archivedAt: null,
      },
      select: {
        id: true,
        title: true,
        icon: true,
        parentId: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Recursively build tree for each child
    const childrenTrees = await Promise.all(children.map((child) => this.buildNavigationTree(child.id)));

    return {
      id: doc.id,
      title: doc.title,
      icon: doc.icon,
      parentId: doc.parentId,
      children: childrenTrees || [],
    };
  }
}
