import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { CreateSubscriptionRequest, SubscriptionEventType, type Subscription } from "@idea/contracts";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { BusinessEvents } from "@/_shared/socket/business-event.constant";

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  /**
   * Create a subscription or restore if soft-deleted
   */
  async createSubscription(userId: string, request: CreateSubscriptionRequest): Promise<Subscription> {
    const { documentId, subspaceId, event } = request;

    // Check if subscription already exists (including soft-deleted)
    const existing = await this.prisma.subscription.findFirst({
      where: {
        userId,
        documentId: documentId || null,
        subspaceId: subspaceId || null,
      },
    });

    if (existing) {
      // If soft-deleted, restore it
      if (existing.deletedAt) {
        const restored = await this.prisma.subscription.update({
          where: { id: existing.id },
          data: { deletedAt: null, event },
        });

        // Get workspaceId for WebSocket event
        const workspaceId = await this.getWorkspaceIdForSubscription(restored.documentId, restored.subspaceId);

        // Emit WebSocket event for real-time UI updates
        await this.eventPublisher.publishWebsocketEvent({
          name: BusinessEvents.SUBSCRIPTION_CREATED,
          workspaceId,
          actorId: userId,
          data: {
            subscription: restored,
          },
          timestamp: new Date().toISOString(),
        });

        return restored as Subscription;
      }
      // Already subscribed and active
      return existing as Subscription;
    }

    // Create new subscription
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        documentId: documentId || null,
        subspaceId: subspaceId || null,
        event,
      },
    });

    // Get workspaceId for WebSocket event
    const workspaceId = await this.getWorkspaceIdForSubscription(subscription.documentId, subscription.subspaceId);

    // Emit WebSocket event for real-time UI updates
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.SUBSCRIPTION_CREATED,
      workspaceId,
      actorId: userId,
      data: {
        subscription,
      },
      timestamp: new Date().toISOString(),
    });

    return subscription as Subscription;
  }

  /**
   * Delete subscription (soft delete)
   */
  async deleteSubscription(subscriptionId: string, userId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException("Subscription not found");
    }

    if (subscription.userId !== userId) {
      throw new BadRequestException("You can only delete your own subscriptions");
    }

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { deletedAt: new Date() },
    });

    // Get workspaceId for WebSocket event
    const workspaceId = await this.getWorkspaceIdForSubscription(subscription.documentId, subscription.subspaceId);

    // Emit WebSocket event for real-time UI updates
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.SUBSCRIPTION_DELETED,
      workspaceId,
      actorId: userId,
      data: {
        subscriptionId,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * List user subscriptions
   */
  async listUserSubscriptions(userId: string, documentId?: string, subspaceId?: string): Promise<{ subscriptions: Subscription[]; total: number }> {
    const where: any = {
      userId,
      deletedAt: null, // Exclude soft-deleted
    };

    if (documentId) {
      where.documentId = documentId;
    }

    if (subspaceId) {
      where.subspaceId = subspaceId;
    }

    const [subscriptions, total] = await Promise.all([this.prisma.subscription.findMany({ where }), this.prisma.subscription.count({ where })]);

    return {
      subscriptions: subscriptions as Subscription[],
      total,
    };
  }

  /**
   * Get single subscription
   */
  async getSubscription(subscriptionId: string, userId: string): Promise<Subscription> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException("Subscription not found");
    }

    if (subscription.userId !== userId) {
      throw new BadRequestException("You can only view your own subscriptions");
    }

    return subscription as Subscription;
  }

  /**
   * Auto-subscribe a user to a document when they edit it
   */
  async autoSubscribeCollaborator(userId: string, documentId: string): Promise<void> {
    // Check if already subscribed
    const existing = await this.prisma.subscription.findFirst({
      where: {
        userId,
        documentId,
        deletedAt: null,
      },
    });

    if (existing) {
      return; // Already subscribed
    }

    // Create subscription
    await this.prisma.subscription.create({
      data: {
        userId,
        documentId,
        event: SubscriptionEventType.DOCUMENT_UPDATE,
      },
    });
  }

  /**
   * Auto-subscribe all collaborators to a document (first publish)
   */
  async autoSubscribeAllCollaborators(documentId: string): Promise<void> {
    // Find all users who have edited this document
    const collaborators = await this.prisma.doc.findUnique({
      where: { id: documentId },
      select: {
        authorId: true,
        createdById: true,
        lastModifiedById: true,
      },
    });

    if (!collaborators) {
      return;
    }

    const userIds = Array.from(new Set([collaborators.authorId, collaborators.createdById, collaborators.lastModifiedById]));

    // Subscribe each collaborator
    for (const userId of userIds) {
      await this.autoSubscribeCollaborator(userId, documentId);
    }
  }

  /**
   * Get all subscribers for a document (for notification filtering)
   */
  async getSubscribersForDocument(documentId: string): Promise<string[]> {
    const document = await this.prisma.doc.findUnique({
      where: { id: documentId },
      select: { subspaceId: true },
    });

    if (!document) {
      return [];
    }

    // Find subscriptions for this document OR its subspace
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        OR: [{ documentId }, { subspaceId: document.subspaceId || undefined }],
        deletedAt: null,
      },
      select: { userId: true },
    });

    return subscriptions.map((sub) => sub.userId);
  }

  /**
   * Get workspaceId for a subscription (used for WebSocket events)
   */
  private async getWorkspaceIdForSubscription(documentId: string | null, subspaceId: string | null): Promise<string> {
    if (documentId) {
      const doc = await this.prisma.doc.findUnique({
        where: { id: documentId },
        select: { workspaceId: true },
      });
      return doc?.workspaceId || "";
    }

    if (subspaceId) {
      const subspace = await this.prisma.subspace.findUnique({
        where: { id: subspaceId },
        select: { workspaceId: true },
      });
      return subspace?.workspaceId || "";
    }

    return "";
  }
}
