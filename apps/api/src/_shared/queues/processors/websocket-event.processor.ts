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
    console.log("[websocket-event-processor]: Job ID:", job.id);
    const event = job.data;
    const { data, name, timestamp, actorId, workspaceId } = event;
    const server = this.realtimeGateway.server;

    if (!server) {
      console.error("[websocket-event-processor]: RealtimeGateway server is not available!");
      return;
    }

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

        case BusinessEvents.WORKSPACE_MEMBER_ADDED:
          await this.handleWorkspaceMemberAddedEvent(event, server);
          break;

        case BusinessEvents.WORKSPACE_MEMBERS_BATCH_ADDED:
          await this.handleWorkspaceMembersBatchAddedEvent(event, server);
          break;
        case BusinessEvents.WORKSPACE_MEMBER_ROLE_UPDATED:
          await this.handleWorkspaceMemberRoleUpdatedEvent(event, server);
          break;

        case BusinessEvents.WORKSPACE_MEMBER_LEFT:
          await this.handleWorkspaceMemberLeftEvent(event, server);
          break;

        case BusinessEvents.SUBSPACE_MEMBER_LEFT:
          await this.handleSubspaceMemberLeftEvent(event, server);
          break;

        case BusinessEvents.DOCUMENT_CREATE:
          await this.handleDocumentCreateEvent(event, server);
          break;
        case BusinessEvents.DOCUMENT_DELETE:
          await this.handleDocumentDeleteEvent(event, server);
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
        // TODO: refactor this
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

        // Document import events
        case BusinessEvents.DOCUMENT_IMPORT_PROGRESS:
        case BusinessEvents.DOCUMENT_IMPORT_COMPLETE:
        case BusinessEvents.DOCUMENT_IMPORT_ERROR:
          await this.handleDocumentImportEvent(event, server);
          break;

        case BusinessEvents.DOCUMENT_SHARED:
          await this.handleDocumentSharedEvent(event, server);
          break;
        case BusinessEvents.ACCESS_REVOKED:
          await this.handleAccessRevokedEvent(event, server);
          break;
        case BusinessEvents.GUEST_INVITED:
          await this.handleGuestInvitedEvent(event, server);
          break;
        case BusinessEvents.GUEST_ACCEPTED:
          await this.handleGuestAcceptedEvent(event, server);
          break;
        case BusinessEvents.GUEST_REMOVED:
          await this.handleGuestRemovedEvent(event, server);
          break;
        case BusinessEvents.GUEST_PROMOTED:
          await this.handleGuestPromotedEvent(event, server);
          break;
        case BusinessEvents.PERMISSION_INHERITANCE_CHANGED:
          await this.handlePermissionInheritanceChangedEvent(event, server);
          break;
        case BusinessEvents.PERMISSION_OVERRIDE_CREATED:
          await this.handlePermissionOverrideCreatedEvent(event, server);
          break;
        case BusinessEvents.PERMISSION_OVERRIDE_REMOVED:
          await this.handlePermissionOverrideRemovedEvent(event, server);
          break;
        case BusinessEvents.GROUP_PERMISSION_CHANGED:
          await this.handleGroupPermissionChangedEvent(event, server);
          break;
        case BusinessEvents.GUEST_PERMISSION_UPDATED:
          await this.handleGuestPermissionUpdatedEvent(event, server);
          break;
        case BusinessEvents.GUEST_PERMISSION_INHERITED:
          await this.handleGuestPermissionInheritedEvent(event, server);
          break;
        case BusinessEvents.PUBLIC_SHARE_CREATED:
          await this.handlePublicShareCreatedEvent(event, server);
          break;
        case BusinessEvents.PUBLIC_SHARE_UPDATED:
          await this.handlePublicShareUpdatedEvent(event, server);
          break;
        case BusinessEvents.PUBLIC_SHARE_REVOKED:
          await this.handlePublicShareRevokedEvent(event, server);
          break;

        // Notification events
        case BusinessEvents.NOTIFICATION_CREATE:
        case BusinessEvents.NOTIFICATION_UPDATE:
        case BusinessEvents.NOTIFICATION_ACTION_RESOLVED:
          await this.handleNotificationEvent(event, server);
          break;

        // Comment events
        case BusinessEvents.COMMENT_CREATED:
        case BusinessEvents.COMMENT_UPDATED:
        case BusinessEvents.COMMENT_RESOLVED:
        case BusinessEvents.COMMENT_UNRESOLVED:
        case BusinessEvents.COMMENT_REACTION_ADDED:
        case BusinessEvents.COMMENT_REACTION_REMOVED:
          await this.handleCommentEvent(event, server);
          break;

        case BusinessEvents.COMMENT_DELETED:
          await this.handleCommentDeletedEvent(event, server);
          break;
      }
    } catch (error) {
      console.error(`Error processing websocket event: ${event.name}`, error);
      throw error;
    }
  }

  private async handleDocumentAddUserEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId, actorId } = event;
    const { userId, docId, document, abilities, includeChildDocuments } = data;

    if (userId) {
      // Notify the affected user with their new abilities and document access
      server.to(`user:${userId}`).emit(BusinessEvents.DOCUMENT_ADD_USER, {
        userId,
        docId,
        document,
        abilities,
        includeChildDocuments,
      });
    }
  }

  private async handleDocumentSharedEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId, actorId } = event;
    const { docId, sharedUserId, guestEmail, document, permission, shareType, sharedByUserId } = data;

    // Handle regular user share
    if (sharedUserId) {
      // Notify the shared user about the document share
      server.to(`user:${sharedUserId}`).emit(BusinessEvents.DOCUMENT_SHARED, {
        docId,
        sharedUserId,
        document,
        permission,
        shareType,
        sharedByUserId,
      });
      return;
    }

    // Handle guest share
    if (guestEmail && docId) {
      // Find the user by email (case-insensitive)
      const user = await this.prismaService.user.findFirst({
        where: {
          email: {
            equals: guestEmail,
            mode: "insensitive",
          },
        },
      });

      if (user) {
        // Fetch the document if not provided
        let documentData = document;
        if (!documentData) {
          documentData = await this.prismaService.doc.findUnique({
            where: { id: docId },
          });
        }

        // Notify the guest user about the document share
        server.to(`user:${user.id}`).emit(BusinessEvents.DOCUMENT_SHARED, {
          docId,
          guestEmail,
          document: documentData,
          permission,
          sharedByUserId,
        });
      }
    }
  }

  private async handleAccessRevokedEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId, actorId } = event;
    const { docId, revokedUserId, revokedByUserId } = data;

    if (revokedUserId) {
      // Notify the user whose access was revoked
      server.to(`user:${revokedUserId}`).emit(BusinessEvents.ACCESS_REVOKED, {
        docId,
        revokedUserId,
        revokedByUserId,
      });
    }
  }

  private async handleDocumentCreateEvent(event: WebsocketEvent<any>, server: any) {
    const { docId, subspaceId, updatedAt } = event.data;
    // Find all users who have permissions for this document
    const permissions = await this.prismaService.documentPermission.findMany({
      where: {
        docId: docId,
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
        docIds: [
          {
            id: docId,
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
      docIds: [
        {
          id: docId,
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

  private async handleDocumentDeleteEvent(event: WebsocketEvent<any>, server: any) {
    const { docId, subspaceId, updatedAt } = event.data;

    // For deletion, we emit ENTITIES event with the subspace update
    // This triggers clients to refresh the navigation tree
    if (subspaceId) {
      // Emit to subspace room
      server.to(`subspace:${subspaceId}`).emit(BusinessEvents.ENTITIES, {
        event: BusinessEvents.DOCUMENT_DELETE,
        fetchIfMissing: false,
        documentIds: [],
        subspaceIds: [
          {
            id: subspaceId,
            updatedAt,
          },
        ],
        workspaceIds: [],
      });

      // Emit to workspace room
      server.to(`workspace:${event.workspaceId}`).emit(BusinessEvents.ENTITIES, {
        event: BusinessEvents.DOCUMENT_DELETE,
        fetchIfMissing: false,
        documentIds: [],
        subspaceIds: [
          {
            id: subspaceId,
            updatedAt,
          },
        ],
        workspaceIds: [],
      });
    }
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
            docIds: [{ id, updatedAt }],
            fetchIfMissing: true,
          });
        } else {
          // Emit to my docs room (per-user)
          server.to(`user:${actorId}`).emit(BusinessEvents.ENTITIES, {
            event: event.name,
            docIds: [{ id, updatedAt }],
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
    const { docIds, subspaceIds } = data;

    const eventData = {
      fetchIfMissing: true,
      docIds: docIds || [],
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

  // Handle workspace member added event (single user)
  private async handleWorkspaceMemberAddedEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId } = event;
    const { userId, role, member } = data;

    // Notify the added user about their workspace addition
    server.to(`user:${userId}`).emit(BusinessEvents.WORKSPACE_MEMBER_ADDED, {
      workspaceId,
      userId,
      role,
      member,
      memberAdded: true,
    });

    // Tell the added user to join the workspace room
    server.to(`user:${userId}`).emit(BusinessEvents.JOIN, {
      event: BusinessEvents.WORKSPACE_MEMBER_ADDED,
      workspaceId,
    });

    // Also notify existing workspace members about the new member
    server.to(`workspace:${workspaceId}`).emit(BusinessEvents.WORKSPACE_MEMBER_ADDED, {
      workspaceId,
      userId,
      role,
      member,
      memberAdded: true,
    });
  }

  // Handle workspace members batch added events
  private async handleWorkspaceMembersBatchAddedEvent(event: WebsocketEvent<any>, server: any) {
    console.log(`[DEBUG] Processing WORKSPACE_MEMBERS_BATCH_ADDED event:`, event);
    const { data, workspaceId } = event;
    const { addedMembers, totalAdded } = data;

    // Notify each added user individually about their workspace addition
    for (const memberInfo of addedMembers) {
      server.to(`user:${memberInfo.userId}`).emit(BusinessEvents.WORKSPACE_MEMBER_ADDED, {
        workspaceId,
        member: memberInfo.member,
        memberAdded: true,
      });

      // Tell the added user to join the workspace room
      server.to(`user:${memberInfo.userId}`).emit(BusinessEvents.JOIN, {
        event: BusinessEvents.WORKSPACE_MEMBERS_BATCH_ADDED,
        workspaceId,
      });
    }

    // Send single batch notification to workspace members to avoid multiple refreshes
    console.log(`[DEBUG] Emitting WORKSPACE_MEMBERS_BATCH_ADDED to workspace:${workspaceId}`);
    server.to(`workspace:${workspaceId}`).emit(BusinessEvents.WORKSPACE_MEMBERS_BATCH_ADDED, {
      workspaceId,
      totalAdded,
      membersBatchAdded: true,
    });
    console.log(`[DEBUG] Successfully emitted WORKSPACE_MEMBERS_BATCH_ADDED event`);
  }

  private async handleWorkspaceMemberRoleUpdatedEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId } = event;
    const { userId, role, member, abilities } = data;

    if (userId) {
      server.to(`user:${userId}`).emit(BusinessEvents.WORKSPACE_MEMBER_ROLE_UPDATED, {
        workspaceId,
        userId,
        role,
        member,
        abilities,
      });
    }

    server.to(`workspace:${workspaceId}`).emit(BusinessEvents.WORKSPACE_MEMBER_ROLE_UPDATED, {
      workspaceId,
      userId,
      role,
      member,
    });
  }

  // Handle workspace member left events
  private async handleWorkspaceMemberLeftEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId } = event;
    const { userId, workspaceName, userRole, removedBy } = data;

    // Emit to the removed user's channel so they can react immediately
    server.to(`user:${userId}`).emit(BusinessEvents.WORKSPACE_MEMBER_LEFT, {
      workspaceId,
      userId,
      workspaceName,
      userRole,
      removedBy,
      memberLeft: true,
    });

    // Also emit to workspace channel so remaining members are aware
    server.to(`workspace:${workspaceId}`).emit(BusinessEvents.WORKSPACE_MEMBER_LEFT, {
      workspaceId,
      userId,
      workspaceName,
      userRole,
      removedBy,
      memberLeft: true,
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

    const permissions = await this.prismaService.documentPermission.findMany({
      where: {
        docId: document.id,
      },
    });

    // Handle DIRECT and GROUP permissions
    for (const permission of permissions) {
      if (permission.inheritedFromType === "DIRECT") {
        channels.push(`user:${permission.userId}`);
      } else if (permission.inheritedFromType === "GROUP") {
        channels.push(`group:${permission.inheritedFromId}`);
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

  // Handle guest invited event
  private async handleGuestInvitedEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId } = event;
    const { guestId, guestEmail, invitedByUserId } = data;

    // Find the user by email (case-insensitive) to notify them
    const user = await this.prismaService.user.findFirst({
      where: {
        email: {
          equals: guestEmail,
          mode: "insensitive",
        },
      },
    });

    if (user) {
      // Notify the invited user to refresh their workspace list
      server.to(`user:${user.id}`).emit(BusinessEvents.GUEST_INVITED, {
        guestId,
        workspaceId,
        guestEmail,
        invitedByUserId,
      });

      // Tell the user to join the workspace room
      server.to(`user:${user.id}`).emit(BusinessEvents.JOIN, {
        event: BusinessEvents.GUEST_INVITED,
        workspaceId,
      });
    }
  }

  // Handle guest accepted event
  private async handleGuestAcceptedEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId } = event;
    const { guestId, userId, guestEmail } = data;

    // Notify workspace room (admins) to refresh guest list
    server.to(`workspace:${workspaceId}`).emit(BusinessEvents.GUEST_ACCEPTED, {
      guestId,
      userId,
      workspaceId,
      guestEmail,
    });
  }

  // Handle guest removed event
  private async handleGuestRemovedEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId } = event;
    const { guestId, userId, removedByUserId } = data;

    // Notify the removed guest to switch workspace
    if (userId) {
      server.to(`user:${userId}`).emit(BusinessEvents.GUEST_REMOVED, {
        guestId,
        workspaceId,
        removedByUserId,
      });
    }

    // Notify workspace room (admins) to refresh guest list
    server.to(`workspace:${workspaceId}`).emit(BusinessEvents.GUEST_REMOVED, {
      guestId,
      userId,
      workspaceId,
      removedByUserId,
    });
  }

  // Handle guest promoted event
  private async handleGuestPromotedEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId } = event;
    const { guestId, userId, promotedByUserId, newRole } = data;

    // Notify the promoted user to refresh workspace list and switch to member view
    if (userId) {
      server.to(`user:${userId}`).emit(BusinessEvents.GUEST_PROMOTED, {
        guestId,
        workspaceId,
        promotedByUserId,
        newRole,
      });
    }

    // Notify workspace room (members/admins) to refresh member/guest lists
    server.to(`workspace:${workspaceId}`).emit(BusinessEvents.GUEST_PROMOTED, {
      guestId,
      userId,
      workspaceId,
      promotedByUserId,
      newRole,
    });
  }

  /**
   * Handle permission inheritance changed event (batched)
   * Notifies users about permission changes on documents they have access to
   */
  private async handlePermissionInheritanceChangedEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId } = event;
    const { batchSequence, batchIndex, totalBatches, affectedDocuments, affectedUserIds, changeType, parentDocId, parentDocTitle } = data;

    // Notify each affected user about permission changes (with batch metadata)
    for (const userId of affectedUserIds) {
      server.to(`user:${userId}`).emit(BusinessEvents.PERMISSION_INHERITANCE_CHANGED, {
        batchSequence, // For client ordering
        batchIndex, // Current batch number
        totalBatches, // Total batches to expect
        affectedDocuments, // Max 50 documents
        changeType,
        parentDocId,
        parentDocTitle,
      });
    }
  }

  /**
   * Handle permission override created event
   * Notifies user when they receive a direct permission that overrides inherited permission
   */
  private async handlePermissionOverrideCreatedEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId } = event;
    const { userId, docId, document, permission, overriddenPermission, parentDocId, parentDocTitle } = data;

    // Notify the user about their permission override
    server.to(`user:${userId}`).emit(BusinessEvents.PERMISSION_OVERRIDE_CREATED, {
      docId,
      document,
      permission,
      overriddenPermission,
      parentDocId,
      parentDocTitle,
    });
  }

  /**
   * Handle permission override removed event
   * Notifies user when their direct permission is removed and inherited permission is restored
   */
  private async handlePermissionOverrideRemovedEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId } = event;
    const { userId, docId, document, restoredPermission, parentDocId, parentDocTitle } = data;

    // Notify the user that their permission was restored to inherited
    server.to(`user:${userId}`).emit(BusinessEvents.PERMISSION_OVERRIDE_REMOVED, {
      docId,
      document,
      restoredPermission,
      parentDocId,
      parentDocTitle,
    });
  }

  /**
   * Handle group permission changed event
   * Notifies group members about permission changes
   */
  private async handleGroupPermissionChangedEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId } = event;
    const { userId, groupId, docId, document, permission, includesChildren } = data;

    // Notify the user about group permission change
    server.to(`user:${userId}`).emit(BusinessEvents.GROUP_PERMISSION_CHANGED, {
      groupId,
      docId,
      document,
      permission,
      includesChildren,
    });
  }

  /**
   * Handle guest permission updated event
   * Notifies linked guest user AND the actor (admin) who made the change
   */
  private async handleGuestPermissionUpdatedEvent(event: WebsocketEvent<any>, server: any) {
    const { data, actorId } = event;
    const { guestId, userId, docId, document, permission, isOverride, guestEmail, guestName } = data;

    const eventPayload = {
      guestId,
      docId,
      document,
      permission,
      isOverride,
      guestEmail,
      guestName,
    };

    // Emit to the linked guest user (if exists)
    if (userId) {
      server.to(`user:${userId}`).emit(BusinessEvents.GUEST_PERMISSION_UPDATED, eventPayload);
    }

    // ALSO emit to the admin who made the change (for guest-sharing-tab update)
    if (actorId && actorId !== userId) {
      server.to(`user:${actorId}`).emit(BusinessEvents.GUEST_PERMISSION_UPDATED, eventPayload);
    }
  }

  /**
   * Handle guest permission inherited event (batched)
   * Notifies newly activated guest about child documents they can now access
   */
  private async handleGuestPermissionInheritedEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId } = event;
    const { guestId, userId, batchSequence, batchIndex, totalBatches, newlyAccessibleDocIds } = data;

    if (userId) {
      server.to(`user:${userId}`).emit(BusinessEvents.GUEST_PERMISSION_INHERITED, {
        guestId,
        batchSequence, // For client ordering
        batchIndex, // Current batch
        totalBatches, // Total batches
        newlyAccessibleDocIds, // Max 50 document IDs per batch
      });
    }
  }

  /**
   * Handle public share created event
   * Notifies document collaborators that a public share was created
   */
  private async handlePublicShareCreatedEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId, actorId } = event;
    const { publicShare, docId, createdByUserId } = data;

    // Find all users who have permissions for this document
    const permissions = await this.prismaService.documentPermission.findMany({
      where: { docId },
      select: { userId: true },
    });

    // Deduplicate user IDs
    const userIds = Array.from(new Set(permissions.map((p) => p.userId).filter(Boolean)));

    // Notify all users with document access
    for (const userId of userIds) {
      server.to(`user:${userId}`).emit(BusinessEvents.PUBLIC_SHARE_CREATED, {
        publicShare,
        docId,
        createdByUserId,
      });
    }
  }

  /**
   * Handle public share updated event
   * Notifies document collaborators that public share settings changed
   */
  private async handlePublicShareUpdatedEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId, actorId } = event;
    const { publicShare, docId, updatedByUserId } = data;

    // Find all users who have permissions for this document
    const permissions = await this.prismaService.documentPermission.findMany({
      where: { docId },
      select: { userId: true },
    });

    // Deduplicate user IDs
    const userIds = Array.from(new Set(permissions.map((p) => p.userId).filter(Boolean)));

    // Notify all users with document access
    for (const userId of userIds) {
      server.to(`user:${userId}`).emit(BusinessEvents.PUBLIC_SHARE_UPDATED, {
        publicShare,
        docId,
        updatedByUserId,
      });
    }
  }

  /**
   * Handle public share revoked event
   * Notifies document collaborators that public access was revoked
   */
  private async handlePublicShareRevokedEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId, actorId } = event;
    const { docId, revokedByUserId } = data;

    // Find all users who have permissions for this document
    const permissions = await this.prismaService.documentPermission.findMany({
      where: { docId },
      select: { userId: true },
    });

    // Deduplicate user IDs
    const userIds = Array.from(new Set(permissions.map((p) => p.userId).filter(Boolean)));

    // Notify all users with document access
    for (const userId of userIds) {
      server.to(`user:${userId}`).emit(BusinessEvents.PUBLIC_SHARE_REVOKED, {
        docId,
        revokedByUserId,
      });
    }
  }

  /**
   * Handle notification events
   * Routes notification events to the recipient user's room
   */
  private async handleNotificationEvent(event: WebsocketEvent<any>, server: any) {
    const { name, data } = event;
    const { payload } = data;

    if (!payload || !payload.userId) {
      console.warn("[websocket-event-processor]: Notification event missing payload or userId", event);
      return;
    }

    // Emit notification event to the recipient user's room
    server.to(`user:${payload.userId}`).emit(name, data);
  }

  private async handleDocumentImportEvent(event: WebsocketEvent<any>, server: any) {
    const { name, data, actorId } = event;

    // Emit import event to the user who initiated the import
    server.to(`user:${actorId}`).emit(name, data);
  }

  /**
   * Handle comment events (create, update, resolve, unresolve, reactions)
   * Broadcasts to all users who have permissions for the document
   */
  private async handleCommentEvent(event: WebsocketEvent<any>, server: any) {
    const { name, data } = event;
    const { documentId, payload } = data;

    if (!documentId) {
      console.warn("[websocket-event-processor]: Comment event missing documentId", event);
      return;
    }

    const channels = await this.getDocumentEventChannels(event, { id: documentId });
    server.to(channels).emit(name, payload);
  }

  /**
   * Handle comment deleted event
   * Broadcasts to all users who have permissions for the document
   */
  private async handleCommentDeletedEvent(event: WebsocketEvent<any>, server: any) {
    const { name, data } = event;
    const { documentId, payload } = data;

    if (!documentId) {
      console.warn("[websocket-event-processor]: Comment deleted event missing documentId", event);
      return;
    }

    // Find all users who have permissions for this document
    const permissions = await this.prismaService.documentPermission.findMany({
      where: {
        docId: documentId,
      },
      select: { userId: true },
    });

    // Deduplicate user IDs
    const userIds = Array.from(new Set(permissions.map((p) => p.userId).filter(Boolean)));

    // Emit to all users who have permissions for the document
    for (const userId of userIds) {
      server.to(`user:${userId}`).emit(name, payload);
    }

    // Also emit to document channel for any connected clients viewing this document
    server.to(`document:${documentId}`).emit(name, payload);
  }
}
