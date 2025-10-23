import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Injectable, Logger } from "@nestjs/common";
import type {
  CommentDto,
  CommentCreatedEvent,
  CommentUpdatedEvent,
  CommentResolvedEvent,
  CommentUnresolvedEvent,
  CommentDeletedEvent,
  ReactionAddedEvent,
  ReactionRemovedEvent,
} from "@idea/contracts";

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5000",
    credentials: true,
  },
  namespace: "/",
})
export class CommentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CommentGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Subscribe to comment updates for a document
   */
  @SubscribeMessage("comment:subscribe")
  handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { documentId: string }) {
    const room = `document:${data.documentId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to ${room}`);
    return { success: true };
  }

  /**
   * Unsubscribe from comment updates for a document
   */
  @SubscribeMessage("comment:unsubscribe")
  handleUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { documentId: string }) {
    const room = `document:${data.documentId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} unsubscribed from ${room}`);
    return { success: true };
  }

  /**
   * Emit comment created event to all clients viewing the document
   */
  emitCommentCreated(documentId: string, comment: CommentDto) {
    const event: CommentCreatedEvent = {
      type: "comment.created",
      payload: comment,
    };

    this.server.to(`document:${documentId}`).emit("comment.created", event);
    this.logger.log(`Emitted comment.created for document ${documentId}, comment ${comment.id}`);
  }

  /**
   * Emit comment updated event
   */
  emitCommentUpdated(documentId: string, comment: CommentDto) {
    const event: CommentUpdatedEvent = {
      type: "comment.updated",
      payload: comment,
    };

    this.server.to(`document:${documentId}`).emit("comment.updated", event);
    this.logger.log(`Emitted comment.updated for document ${documentId}, comment ${comment.id}`);
  }

  /**
   * Emit comment resolved event
   */
  emitCommentResolved(documentId: string, comment: CommentDto) {
    const event: CommentResolvedEvent = {
      type: "comment.resolved",
      payload: comment,
    };

    this.server.to(`document:${documentId}`).emit("comment.resolved", event);
    this.logger.log(`Emitted comment.resolved for document ${documentId}, comment ${comment.id}`);
  }

  /**
   * Emit comment unresolved event
   */
  emitCommentUnresolved(documentId: string, comment: CommentDto) {
    const event: CommentUnresolvedEvent = {
      type: "comment.unresolved",
      payload: comment,
    };

    this.server.to(`document:${documentId}`).emit("comment.unresolved", event);
    this.logger.log(`Emitted comment.unresolved for document ${documentId}, comment ${comment.id}`);
  }

  /**
   * Emit comment deleted event
   */
  emitCommentDeleted(documentId: string, commentId: string) {
    const event: CommentDeletedEvent = {
      type: "comment.deleted",
      payload: {
        id: commentId,
        documentId,
      },
    };

    this.server.to(`document:${documentId}`).emit("comment.deleted", event);
    this.logger.log(`Emitted comment.deleted for document ${documentId}, comment ${commentId}`);
  }

  /**
   * Emit reaction added event
   */
  emitReactionAdded(documentId: string, commentId: string, emoji: string, userId: string) {
    const event: ReactionAddedEvent = {
      type: "comment.reaction_added",
      payload: {
        commentId,
        emoji,
        userId,
      },
    };

    this.server.to(`document:${documentId}`).emit("comment.reaction_added", event);
    this.logger.log(`Emitted reaction_added for comment ${commentId}, emoji ${emoji}`);
  }

  /**
   * Emit reaction removed event
   */
  emitReactionRemoved(documentId: string, commentId: string, emoji: string, userId: string) {
    const event: ReactionRemovedEvent = {
      type: "comment.reaction_removed",
      payload: {
        commentId,
        emoji,
        userId,
      },
    };

    this.server.to(`document:${documentId}`).emit("comment.reaction_removed", event);
    this.logger.log(`Emitted reaction_removed for comment ${commentId}, emoji ${emoji}`);
  }
}
