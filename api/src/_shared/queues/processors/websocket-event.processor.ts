// WebSocket event processor for handling real-time business events
import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { RealtimeGateway } from "../../socket/events/realtime.gateway";
import { WebsocketEvent } from "../../events/types/websocket.event";
import { BusinessEvents } from "../../socket/business-event.constant";

@Processor("websocket-events")
export class WebsocketEventProcessor {
  constructor(private realtimeGateway: RealtimeGateway) {}

  // Process incoming WebSocket events from the queue
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
          await this.handleSubspaceUpdateEvent(event, server);
          break;
        case BusinessEvents.SUBSPACE_MOVE:
          await this.handleSubspaceMoveEvent(event, server);
          break;
        case BusinessEvents.DOCUMENT_UPDATE:
          await this.handleDocumentEvent(event, server);
          break;
        case BusinessEvents.ENTITIES:
          await this.handleEntitiesEvent(event, server);
          break;
      }
    } catch (error) {
      console.error(`Error processing websocket event: ${event.name}`, error);
      throw error;
    }
  }

  // Handle document-related events (update)
  private async handleDocumentEvent(event: WebsocketEvent<any>, server: any) {
    const { data } = event;
    const { document } = data;

    // Determine target channels based on document visibility and permissions
    const channels = this.getDocumentEventChannels(event, document);

    // Emit document update event to target channels
    server.to(channels).emit(BusinessEvents.DOCUMENT_UPDATE, this.formatEventMessage(BusinessEvents.DOCUMENT_UPDATE, data));
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
    server.to(`workspace:${workspaceId}`).emit(BusinessEvents.ENTITIES, this.formatEventMessage(BusinessEvents.ENTITIES, eventData));

    // Emit to actor's user room
    if (actorId) {
      server.to(`user:${actorId}`).emit(BusinessEvents.ENTITIES, this.formatEventMessage(BusinessEvents.ENTITIES, eventData));
    }

    // Emit to relevant subspace rooms
    if (subspaceIds?.length > 0) {
      subspaceIds.forEach(({ id }) => {
        server.to(`subspace:${id}`).emit(BusinessEvents.ENTITIES, this.formatEventMessage(BusinessEvents.ENTITIES, eventData));
      });
    }
  }

  // Handle subspace creation events
  private async handleSubspaceCreateEvent(event: WebsocketEvent<any>, server: any) {
    const { data, name, timestamp, actorId, workspaceId } = event;

    // Determine target channels based on subspace type and permissions
    const channels = this.getSubspaceEventChannels(event, data);

    // Emit subspace creation event
    server.to(channels).emit(name, this.formatEventMessage(name, data));

    // Emit join event to notify clients to join the new subspace room
    server.to(channels).emit(
      BusinessEvents.JOIN,
      this.formatEventMessage(BusinessEvents.JOIN, {
        event: name,
        subspaceId: data.id,
      }),
    );
  }

  // Handle subspace update events
  private async handleSubspaceUpdateEvent(event: WebsocketEvent<any>, server: any) {
    const { data, workspaceId, actorId } = event;

    // Prepare event data for incremental update
    const eventData = {
      event: event.name,
      fetchIfMissing: true,
      subspaceIds: [{ id: data.id, updatedAt: data.updatedAt }],
    };

    // Emit to workspace room
    server.to(`workspace:${workspaceId}`).emit(BusinessEvents.ENTITIES, this.formatEventMessage(BusinessEvents.ENTITIES, eventData));

    // Emit to actor's user room
    if (actorId) {
      server.to(`user:${actorId}`).emit(BusinessEvents.ENTITIES, this.formatEventMessage(BusinessEvents.ENTITIES, eventData));
    }

    // Emit to subspace room
    server.to(`subspace:${data.id}`).emit(BusinessEvents.ENTITIES, this.formatEventMessage(BusinessEvents.ENTITIES, eventData));
  }

  // Handle subspace movement events
  private async handleSubspaceMoveEvent(event: WebsocketEvent<any>, server: any) {
    const { data, name, workspaceId } = event;
    // Only emit to workspace room for movement events
    server.to(`workspace:${workspaceId}`).emit(name, this.formatEventMessage(name, data));
  }

  // Determine target channels for document events based on visibility and permissions
  private getDocumentEventChannels(event: WebsocketEvent<any>, document: any): string[] {
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

    return channels;
  }

  // Determine target channels for subspace events based on type and permissions
  private getSubspaceEventChannels(event: WebsocketEvent<any>, subspace: any): string[] {
    const channels: string[] = [];

    if (event.actorId) {
      channels.push(`user:${event.actorId}`);
    }

    // Determine rooms based on subspace type
    if (subspace.type === "PRIVATE" || subspace.type === "PERSONAL") {
      channels.push(`subspace:${subspace.id}`);
    } else {
      channels.push(`workspace:${event.workspaceId}`);
    }

    return channels;
  }

  // Format event message with timestamp
  private formatEventMessage(type: BusinessEvents, data: any) {
    return {
      type,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
