import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { RealtimeGateway } from "../../socket/events/realtime.gateway";
import { SubspaceEvent } from "../../events/types/subspace.event";
import { BusinessEvents } from "../../socket/business-event.constant";
@Processor("websocket-events")
export class WebsocketEventProcessor {
  constructor(private realtimeGateway: RealtimeGateway) {}

  @Process("websocket-event")
  async handleWebsocketEvent(job: Job<SubspaceEvent>) {
    const event = job.data;
    const server = this.realtimeGateway.server;

    try {
      switch (event.name) {
        case "subspace.create":
        case "subspace.update":
          await this.handleSubspaceEvent(event, server);
          break;

        case "subspace.move":
          await this.handleSubspaceMoveEvent(event, server);
          break;
      }
    } catch (error) {
      console.error(`Error processing websocket event: ${event.name}`, error);
      throw error; // Let Bull handle retry
    }
  }

  private async handleSubspaceEvent(event: SubspaceEvent, server: any) {
    const channels = this.getSubspaceEventChannels(event);

    // Emit to workspace channel
    server.to(`workspace:${event.workspaceId}`).emit(
      BusinessEvents.SUBSPACE_UPDATE,
      this.formatEventMessage(BusinessEvents.SUBSPACE_UPDATE, {
        event: event.name,
        fetchIfMissing: true,
        subspaceIds: [{ id: event.subspaceId, updatedAt: event.updatedAt }],
      }),
    );

    // Emit to user channel if actor exists
    if (event.actorId) {
      server.to(`user:${event.actorId}`).emit(
        BusinessEvents.SUBSPACE_UPDATE,
        this.formatEventMessage(BusinessEvents.SUBSPACE_UPDATE, {
          event: event.name,
          fetchIfMissing: true,
          subspaceIds: [{ id: event.subspaceId, updatedAt: event.updatedAt }],
        }),
      );
    }
  }

  private async handleSubspaceMoveEvent(event: SubspaceEvent, server: any) {
    // Only emit to workspace channel for move events
    server.to(`workspace:${event.workspaceId}`).emit(
      BusinessEvents.SUBSPACE_REORDER,
      this.formatEventMessage(BusinessEvents.SUBSPACE_REORDER, {
        subspaceId: event.subspaceId,
        index: event.data?.index,
      }),
    );
  }

  private getSubspaceEventChannels(event: SubspaceEvent): string[] {
    const channels: string[] = [];
    if (event.actorId) {
      channels.push(`user:${event.actorId}`);
    }
    if (event.workspaceId) {
      channels.push(`workspace:${event.workspaceId}`);
    }
    return channels;
  }

  private formatEventMessage(type: BusinessEvents, data: any) {
    return {
      type,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
