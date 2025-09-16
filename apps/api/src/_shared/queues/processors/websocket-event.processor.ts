// WebSocket event processor for handling real-time business events
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { RealtimeGateway } from "../../socket/events/realtime.gateway";
import { WebsocketEvent } from "../../events/types/websocket.event";
import { BusinessEvents } from "../../socket/business-event.constant";
import { presentStar } from "../../../star/star.presenter";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";

@Processor("websocket-events")
export class WebsocketEventProcessor extends WorkerHost {
  constructor(
    private realtimeGateway: RealtimeGateway,
    private readonly prismaService: PrismaService,
  ) {
    super();
  }

  // Process incoming WebSocket events from the queue
  async process(job: Job<WebsocketEvent<any>>) {
    console.log("[websocket-event-processor]: Processing event:", job.data);
    const event = job.data;
    const { data, name, timestamp, actorId, workspaceId } = event;
    const server = this.realtimeGateway.server;

    try {
      switch (name) {
        case BusinessEvents.SUBSPACE_CREATE:
          await this.handleSubspaceCreateEvent(event, server);
          break;
        case BusinessEvents.SUBSPACE_UPDATE:
          await this.handleSubspaceUpdateEvent(event, server);
          break;
        case BusinessEvents.SUBSPACE_MOVE:
          await this.handleSubspaceMoveEvent(event, server);
          break;

        case BusinessEvents.SUBSPACE_MEMBER_ADDED:
          await this.handleSubspaceMemberAddedEvent(event, server);
          break;

        case BusinessEvents.SUBSPACE_MEMBERS_BATCH_ADDED:
          await this.handleSubspaceMembersBatchAddedEvent(event, server);
          break;

        case BusinessEvents.SUBSPACE_MEMBER_LEFT:
          await this.handleSubspaceMemberLeftEvent(event, server);
          break;

        case BusinessEvents.DOCUMENT_CREATE:
          await this.handleDocumentCreateEvent(event, server);
          break;
        case BusinessEvents.DOCUMENT_MOVE:
          await this.handleDocumentMoveEvent(event, server);
          break;
        case BusinessEvents.DOCUMENT_UPDATE:
          await this.handleDocumentEvent(event, server);
          break;
        case BusinessEvents.ENTITIES:
          await this.handleEntitiesEvent(event, server);
          break;
        case BusinessEvents.STAR_CREATE:
        case BusinessEvents.STAR_UPDATE: {
          const star = await this.prismaService.star.findUnique({
            where: { id: data.id },
          });
          if (!star) return;

          // Emit to user's room
          server.to(`user:${star.userId}`).emit(name, presentStar(star));
          break;
        }
        case BusinessEvents.STAR_DELETE: {
          // Emit to user's room
          server.to(`user:${data.userId}`).emit(name, {
            id: data.id,
          });
          break;
        }

        case BusinessEvents.DOCUMENT_ADD_USER:
          await this.handleDocumentAddUserEvent(event, server);
          break;
      }
    } catch (error) {
      console.error(`Error processing websocket event: ${event.name}`, error);
      throw error;
    }
  }

  private async handleDocumentAddUserEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId, actorId } = event;
    const { userId, documentId, document, abilities, includeChildDocuments } = data;

    if (userId) {
      // Notify the affected user with their new abilities and document access
      server.to(`user:${userId}`).emit(BusinessEvents.DOCUMENT_ADD_USER, {
        userId,
        documentId,
        document,
        abilities,
        includeChildDocuments,
      });
    }
  }

  private async handleDocumentCreateEvent(event: WebsocketEvent<any>, server: any) {
    const { documentId, subspaceId, updatedAt } = event.data;
    // Find all users who have permissions for this document
    const permissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        resourceType: "DOCUMENT",
        resourceId: documentId,
      },
      select: { userId: true },
    });
    // Deduplicate user IDs
    const userIds = Array.from(new Set(permissions.map((p) => p.userId).filter(Boolean)));

    // Emit to all users who have permissions
    for (const userId of userIds) {
      server.to(`user:${userId}`).emit(BusinessEvents.ENTITIES, {
        event: BusinessEvents.DOCUMENT_CREATE,
        fetchIfMissing: true,
        documentIds: [
          {
            id: documentId,
            updatedAt,
          },
        ],
        subspaceIds: subspaceId
          ? [
              {
                id: subspaceId,
                updatedAt,
              },
            ]
          : [],
      });
    }
    // Emit to workspace channel
    server.to(`workspace:${event.workspaceId}`).emit(BusinessEvents.ENTITIES, {
      event: BusinessEvents.DOCUMENT_CREATE,
      fetchIfMissing: true,
      documentIds: [
        {
          id: documentId,
          updatedAt,
        },
      ],
      subspaceIds: subspaceId
        ? [
            {
              id: subspaceId,
              updatedAt,
            },
          ]
        : [],
    });
  }

  // Handle document move events
  private async handleDocumentMoveEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId, actorId } = event;
    const { affectedDocuments, subspaceIds, myDocsChanged } = data;

    // Emit document updates
    if (affectedDocuments?.length > 0) {
      affectedDocuments.forEach(({ id, updatedAt, subspaceId }) => {
        if (subspaceId) {
          // Emit to relevant subspace rooms
          server.to(`subspace:${subspaceId}`).emit(BusinessEvents.ENTITIES, {
            event: event.name,
            documentIds: [{ id, updatedAt }],
            fetchIfMissing: true,
          });
        } else {
          // Emit to my docs room (per-user)
          server.to(`user:${actorId}`).emit(BusinessEvents.ENTITIES, {
            event: event.name,
            documentIds: [{ id, updatedAt }],
            fetchIfMissing: true,
          });
        }
      });
    }

    // Emit subspace structure updates
    if (subspaceIds?.length > 0) {
      subspaceIds.forEach(({ id }) => {
        server.to(`subspace:${id}`).emit(BusinessEvents.ENTITIES, {
          event: event.name,
          subspaceIds: [{ id }],
          fetchIfMissing: true,
        });
      });
    }
  }

  // Handle document-related events (update)
  private async handleDocumentEvent(event: WebsocketEvent<any>, server: any) {
    const { data } = event;
    const { document } = data;

    // Determine target channels based on document visibility and permissions
    const channels = await this.getDocumentEventChannels(event, document);

    // Emit document update event to target channels
    server.to(channels).emit(BusinessEvents.DOCUMENT_UPDATE, data);
  }

  // Handle entities update events (documents and subspaces)
  private async handleEntitiesEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId, actorId } = event;
    const { documentIds, subspaceIds } = data;

    const eventData = {
      fetchIfMissing: true,
      documentIds: documentIds || [],
      subspaceIds: subspaceIds || [],
      event: event.name,
    };

    // Emit to workspace room
    server.to(`workspace:${workspaceId}`).emit(BusinessEvents.ENTITIES, eventData);

    // Emit to actor's user room
    if (actorId) {
      server.to(`user:${actorId}`).emit(BusinessEvents.ENTITIES, eventData);
    }

    // Emit to relevant subspace rooms
    if (subspaceIds?.length > 0) {
      subspaceIds.forEach(({ id }) => {
        server.to(`subspace:${id}`).emit(BusinessEvents.ENTITIES, eventData);
      });
    }
  }

  // Handle subspace creation events
  private async handleSubspaceCreateEvent(event: WebsocketEvent<any>, server: any) {
    const { data, name, timestamp, actorId, workspaceId } = event;

    // Determine target channels based on subspace type and permissions
    const channels = this.getSubspaceEventChannels(event, data.subspace);

    // Emit subspace creation event
    server.to(channels).emit(name, data);

    // Emit join event to notify clients to join the new subspace room
    server.to(channels).emit(BusinessEvents.JOIN, {
      event: name,
      subspaceId: data.id,
    });
  }

  // Handle subspace update events
  private async handleSubspaceUpdateEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId, actorId } = event;
    const { subspace } = data;

    // Emit to workspace room
    server.to(`workspace:${workspaceId}`).emit(BusinessEvents.SUBSPACE_UPDATE, {
      event: event.name,
      subspace,
    });
  }

  // Handle subspace movement events
  private async handleSubspaceMoveEvent(event: WebsocketEvent<any>, server: any) {
    const { data, name, workspaceId } = event;
    // Only emit to workspace room for movement events
    server.to(`workspace:${workspaceId}`).emit(name, data);
  }

  // Handle subspace member added events
  private async handleSubspaceMemberAddedEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId } = event;
    const { subspaceId, userId, member } = data;

    /*
     * option1: send to workspace room
     * option2: send to subspace room + user room
     */

    // const channels = this.getSubspaceEventChannels(event, data);

    // Notify the added user specifically
    server.to(`user:${userId}`).emit(BusinessEvents.SUBSPACE_MEMBER_ADDED, {
      subspaceId,
      userId,
      member,
    });

    // Notify workspace members about the new member(user already in the subspace)
    server.to(`subspace:${subspaceId}`).emit(BusinessEvents.SUBSPACE_MEMBER_ADDED, {
      subspaceId,
      userId,
      member,
    });
  }

  private async handleSubspaceMembersBatchAddedEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId } = event;
    const { subspaceId, addedUsers, addedGroups, totalAdded } = data;

    // Notify each added user individually about their addition
    for (const userInfo of addedUsers) {
      server.to(`user:${userInfo.userId}`).emit(BusinessEvents.SUBSPACE_MEMBER_ADDED, {
        subspaceId,
        member: userInfo.member,
        memberAdded: true,
      });

      // Tell the added user to join the subspace room
      server.to(`user:${userInfo.userId}`).emit(BusinessEvents.JOIN, {
        event: BusinessEvents.SUBSPACE_MEMBERS_BATCH_ADDED,
        subspaceId,
      });
    }

    // Handle group additions
    for (const groupInfo of addedGroups) {
      for (const memberInfo of groupInfo.members) {
        server.to(`user:${memberInfo.userId}`).emit(BusinessEvents.SUBSPACE_MEMBER_ADDED, {
          subspaceId,
          member: memberInfo.member,
          memberAdded: true,
          addedViaGroup: groupInfo.groupId,
        });

        // Tell the added user to join the subspace room
        server.to(`user:${memberInfo.userId}`).emit(BusinessEvents.JOIN, {
          event: BusinessEvents.SUBSPACE_MEMBERS_BATCH_ADDED,
          subspaceId,
        });
      }
    }

    // Send single batch notification to workspace members to avoid multiple refreshes
    server.to(`workspace:${workspaceId}`).emit(BusinessEvents.SUBSPACE_MEMBERS_BATCH_ADDED, {
      subspaceId,
      totalAdded,
      membersBatchAdded: true,
    });
  }

  // Handle subspace member left events
  private async handleSubspaceMemberLeftEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId } = event;
    const { subspaceId, userId, removedBy, batchRemoval } = data;

    // Notify all workspace members about the member leaving
    // Only send to workspace room to avoid duplicate events (subspace members are also workspace members)
    server.to(`workspace:${workspaceId}`).emit(BusinessEvents.SUBSPACE_MEMBER_LEFT, {
      subspaceId,
      userId,
      memberLeft: true,
      removedBy,
      batchRemoval,
    });
  }

  // Determine target channels for document events based on visibility and permissions
  private async getDocumentEventChannels(event: WebsocketEvent<any>, document: any): Promise<string[]> {
    const channels: string[] = [];

    if (event.actorId) {
      channels.push(`user:${event.actorId}`);
    }

    // Determine rooms based on document visibility
    if (document.visibility === "PRIVATE") {
      // Private documents only sent to specific rooms
      if (document.subspaceId) {
        channels.push(`subspace:${document.subspaceId}`);
      }
    } else {
      // Public documents sent to workspace room
      channels.push(`workspace:${event.workspaceId}`);
    }

    const permissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        resourceType: "DOCUMENT",
        resourceId: document.id,
      },
    });

    // Handle DIRECT and GROUP permissions
    for (const permission of permissions) {
      if (permission.sourceType === "DIRECT") {
        channels.push(`user:${permission.userId}`);
      } else if (permission.sourceType === "GROUP") {
        channels.push(`group:${permission.sourceId}`);
      }
    }

    return channels;
  }

  // Determine target channels for subspace events based on type and permissions
  private getSubspaceEventChannels(event: WebsocketEvent<any>, subspace: any): string[] {
    const channels: string[] = [];

    // Determine notification channels based on subspace type
    switch (subspace.type) {
      case "PRIVATE":
      case "PERSONAL":
        // For private/personal subspaces, only notify the creator
        if (event.actorId) {
          channels.push(`user:${event.actorId}`);
        }
        break;

      case "INVITE_ONLY":
      case "PUBLIC":
      case "WORKSPACE_WIDE":
        // For invite-only, public, and workspace-wide subspaces, notify all workspace members
        channels.push(`workspace:${event.workspaceId}`);
        break;

      default:
        // Fallback: notify workspace members for unknown types
        channels.push(`workspace:${event.workspaceId}`);
        break;
    }

    return channels;
  }
}
