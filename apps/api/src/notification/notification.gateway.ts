import { WebSocketGateway } from "@nestjs/websockets";
import { NotificationService } from "./notification.service";

/**
 * WebSocket gateway for real-time notification delivery
 * Notifications are broadcast through the existing websocket-events queue
 * and processed by NotificationEventProcessor
 */
@WebSocketGateway()
export class NotificationGateway {
  constructor(private readonly notificationService: NotificationService) {}

  // WebSocket events are handled through the event processor
  // No direct handlers needed here - notifications are pushed via Socket.io rooms
}
