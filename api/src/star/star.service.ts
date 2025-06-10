import { Injectable } from "@nestjs/common";
import { CreateStarDto } from "./star.dto";
import { UpdateStarDto } from "./star.dto";
import { PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";
import { Inject } from "@nestjs/common";
import { ExtendedPrismaClient } from "@/_shared/database/prisma/prisma.extension";
import { presentStar } from "./star.presenter";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { BusinessEvents } from "@/_shared/socket/business-event.constant";
import { WebsocketEvent } from "@/_shared/events/types/websocket.event";
import { InjectQueue } from "@nestjs/bull";
import fractionalIndex from "fractional-index";
import { Queue } from "bull";

@Injectable()
export class StarService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prismaService: ExtendedPrismaClient,
    @InjectQueue("websocket-events") private readonly websocketQueue: Queue,
  ) {}

  private async emitStarEvent(name: BusinessEvents, data: any, userId: string) {
    const event: WebsocketEvent = {
      name,
      workspaceId: data.workspaceId,
      actorId: userId.toString(),
      data,
      timestamp: new Date().toISOString(),
    };

    await this.websocketQueue.add("websocket-event", event);
  }

  async create(createStarDto: CreateStarDto, userId: string) {
    const { docId, subspaceId } = createStarDto;

    // Check if user has access to the document or subspace
    if (docId) {
      const doc = await this.prismaService.doc.findUnique({
        where: { id: docId },
        include: {
          workspace: {
            include: {
              members: {
                where: { userId },
              },
            },
          },
        },
      });

      if (!doc || doc.workspace.members.length === 0) {
        throw new ApiException(ErrorCodeEnum.DocNotFoundOrNoAccess);
      }
    }

    if (subspaceId) {
      const subspace = await this.prismaService.subspace.findUnique({
        where: { id: subspaceId },
        include: {
          workspace: {
            include: {
              members: {
                where: { userId },
              },
            },
          },
        },
      });

      if (!subspace || subspace.workspace.members.length === 0) {
        throw new ApiException(ErrorCodeEnum.SubspaceNotFoundOrNoAccess);
      }
    }

    // Check if star already exists
    const existingStar = await this.prismaService.star.findFirst({
      where: {
        userId,
        docId: docId || null,
        subspaceId: subspaceId || null,
      },
    });

    if (existingStar) {
      throw new ApiException(ErrorCodeEnum.StarAlreadyExists);
    }

    const star = await this.prismaService.star.create({
      data: {
        userId,
        docId,
        subspaceId,
      },
    });

    await this.emitStarEvent(BusinessEvents.STAR_CREATE, star, userId);

    return {
      data: presentStar(star),
      policies: [], // placeholder for policies
    };
  }

  private async reorderStarredItems(userId: string): Promise<Record<string, string | null>> {
    // Fetch user's starred items with their current order
    const starredItems = await this.prismaService.star.findMany({
      where: { userId },
      orderBy: [{ index: "asc" }, { updatedAt: "desc" }],
    });

    // Get referenced documents for timestamp-based ordering
    const referencedDocIds = starredItems.map((item) => item.docId).filter((id): id is string => id !== null);

    const referencedDocs =
      referencedDocIds.length > 0
        ? await this.prismaService.doc.findMany({
            where: { id: { in: referencedDocIds } },
            select: {
              id: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: "desc" },
          })
        : [];

    // Create a lookup map for document timestamps
    const docTimestampMap = new Map(referencedDocs.map((doc) => [doc.id, doc.updatedAt.getTime()]));

    // Sort items based on document timestamps
    const sortedItems = starredItems.sort((a, b) => {
      if (!a.docId || !b.docId) return 0;

      const timeA = docTimestampMap.get(a.docId) ?? 0;
      const timeB = docTimestampMap.get(b.docId) ?? 0;

      return timeB - timeA;
    });

    // Assign new order positions
    const orderUpdates: Promise<any>[] = [];
    let lastOrderPosition: string | null = null;

    for (const item of sortedItems) {
      if (item.index === null) {
        const newOrderPosition = fractionalIndex(lastOrderPosition, null);
        orderUpdates.push(
          this.prismaService.star.update({
            where: { id: item.id },
            data: { index: newOrderPosition },
          }),
        );
        item.index = newOrderPosition;
      }
      lastOrderPosition = item.index;
    }

    // Apply all order updates in parallel
    if (orderUpdates.length > 0) {
      await Promise.all(orderUpdates);
    }

    // Create order position mapping
    return Object.fromEntries(sortedItems.map((item) => [item.id, item.index]));
  }

  async findAll(userId: string) {
    // Fetch starred items with current ordering
    const starredItems = await this.prismaService.star.findMany({
      where: { userId },
      orderBy: [{ index: "asc" }, { updatedAt: "desc" }],
    });

    // Check if any items need reordering
    const needsReordering = starredItems.some((item) => item.index === null);

    if (needsReordering) {
      // Get updated order positions
      const orderPositions = await this.reorderStarredItems(userId);

      // Update items with new order positions
      starredItems.forEach((item) => {
        item.index = orderPositions[item.id];
      });
    }

    return {
      data: {
        stars: starredItems.map(presentStar),
      },
      policies: [], // placeholder for policies
    };
  }

  async update(id: string, updateStarDto: UpdateStarDto, userId: string) {
    const star = await this.prismaService.star.findUnique({
      where: { id },
    });

    if (!star || star.userId !== userId) {
      throw new ApiException(ErrorCodeEnum.StarNotFound);
    }

    const updatedStar = await this.prismaService.star.update({
      where: { id },
      data: {
        index: updateStarDto.index,
      },
    });

    await this.emitStarEvent(BusinessEvents.STAR_UPDATE, updatedStar, userId);

    return {
      data: presentStar(updatedStar),
      policies: [], // placeholder for policies
    };
  }

  async findOne(id: string) {
    const star = await this.prismaService.star.findUnique({
      where: { id },
    });
    if (!star) {
      throw new ApiException(ErrorCodeEnum.StarNotFound);
    }
    return presentStar(star);
  }

  async remove(id: string, userId: string) {
    const star = await this.prismaService.star.findUnique({
      where: { id },
    });

    if (!star || star.userId !== userId) {
      throw new ApiException(ErrorCodeEnum.StarNotFound);
    }

    await this.prismaService.star.delete({
      where: { id },
    });

    await this.emitStarEvent(BusinessEvents.STAR_DELETE, { id, userId }, userId);

    return { success: true };
  }
}
