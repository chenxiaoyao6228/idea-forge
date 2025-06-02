import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { RealtimeGateway } from "../../socket/events/realtime.gateway";
import { WebsocketEvent } from "../../events/types/websocket.event";
import { BusinessEvents } from "../../socket/business-event.constant";

@Processor("websocket-events")
export class WebsocketEventProcessor {
  constructor(private realtimeGateway: RealtimeGateway) {}

  @Process("websocket-event")
  async handleWebsocketEvent(job: Job<WebsocketEvent<any>>) {
    const event = job.data;
    const { data, name, timestamp, actorId, workspaceId } = event;

    const server = this.realtimeGateway.server;

    try {
      switch (name) {
        case BusinessEvents.SUBSPACE_CREATE:
          await this.handleSubspaceCreateEvent(event, server);
          break;
        case BusinessEvents.SUBSPACE_UPDATE:
          await this.handleSubspaceEvent(event, server);
          break;
        case BusinessEvents.SUBSPACE_MOVE:
          await this.handleSubspaceMoveEvent(event, server);
          break;
      }
    } catch (error) {
      console.error(`Error processing websocket event: ${event.name}`, error);
      throw error; // Let Bull handle retry
    }
  }

  private async handleSubspaceCreateEvent(event: WebsocketEvent<any>, server: any) {
    const { data, name, timestamp, actorId, workspaceId } = event;
    // Emit to workspace channel
    server.to(`workspace:${workspaceId}`).emit(name, this.formatEventMessage(name, data));

    // Emit to user channel if actor exists
    if (actorId) {
      server.to(`user:${actorId}`).emit(BusinessEvents.SUBSPACE_CREATE, this.formatEventMessage(BusinessEvents.SUBSPACE_CREATE, data));
    }

    // Emit join event to workspace channel
    server.to(`workspace:${workspaceId}`).emit(BusinessEvents.JOIN, this.formatEventMessage(BusinessEvents.JOIN, data));
  }

  private async handleSubspaceMoveEvent(event: WebsocketEvent<any>, server: any) {
    const { data, name, timestamp, actorId, workspaceId } = event;
    // Only emit to workspace channel for move events
    server.to(`workspace:${workspaceId}`).emit(name, this.formatEventMessage(name, data));
  }

  private async handleSubspaceEvent(event: WebsocketEvent<any>, server: any) {
    // Emit to workspace channel
    server.to(`workspace:${event.workspaceId}`).emit(
      BusinessEvents.SUBSPACE_UPDATE,
      this.formatEventMessage(BusinessEvents.SUBSPACE_UPDATE, {
        event: event.name,
        fetchIfMissing: true,
        subspaceIds: [{ id: event.data.id, updatedAt: event.data.updatedAt }],
      }),
    );

    // Emit to user channel if actor exists
    if (event.actorId) {
      server.to(`user:${event.actorId}`).emit(
        BusinessEvents.SUBSPACE_UPDATE,
        this.formatEventMessage(BusinessEvents.SUBSPACE_UPDATE, {
          event: event.name,
          fetchIfMissing: true,
          subspaceIds: [{ id: event.data.id, updatedAt: event.data.updatedAt }],
        }),
      );
    }
  }

  private formatEventMessage(type: BusinessEvents, data: any) {
    return {
      type,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
