import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { Server } from "socket.io";
import type { NotificationWebSocketEvent } from "@idea/contracts";

/**
 * Processes notification events from the websocket-events queue
 * Broadcasts notifications to users via Socket.io rooms
 *
 * Follows the existing pattern from websocket-event.processor.ts
 * Room pattern: `user:${userId}` for targeted delivery
 */
@Processor("websocket-events")
export class NotificationEventProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationEventProcessor.name);
  private server: Server | null = null;

  /**
   * Set the Socket.io server instance (injected by the WebSocket module)
   */
  setServer(server: Server) {
    this.server = server;
    this.logger.log("Socket.io server connected to NotificationEventProcessor");
  }

  async process(job: Job): Promise<void> {
    const { name, data } = job.data;

    // Only process notification-related events
    if (!this.isNotificationEvent(name)) {
      return;
    }

    try {
      await this.handleNotificationEvent(name, data);
    } catch (error) {
      this.logger.error(`Failed to process notification event ${name}:`, error);
      throw error;
    }
  }

  /**
   * Check if event is a notification event
   */
  private isNotificationEvent(eventName: string): boolean {
    return eventName.startsWith("notification.");
  }

  /**
   * Handle notification events and broadcast to appropriate rooms
   */
  private async handleNotificationEvent(eventName: string, data: any): Promise<void> {
    if (!this.server) {
      this.logger.warn("Socket.io server not available, skipping notification broadcast");
      return;
    }

    // Extract userId from notification data
    const userId = data.payload?.userId || data.userId;
    if (!userId) {
      this.logger.warn(`No userId in notification event ${eventName}, skipping`);
      return;
    }

    // Construct WebSocket event following the contract schema
    const wsEvent: NotificationWebSocketEvent = {
      type: eventName as any, // e.g., 'notification.create', 'notification.update'
      payload: data.payload || data,
    };

    // Broadcast to user's room
    const room = `user:${userId}`;
    this.server.to(room).emit("notification", wsEvent);

    this.logger.debug(`Broadcasted ${eventName} to room ${room}`);
  }
}
