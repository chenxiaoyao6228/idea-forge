import { Global, Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { SubspaceCreateEvent, SubspaceMoveEvent, SubspaceUpdateEvent } from "./types/subspace.event";

@Global()
@Injectable()
export class EventPublisherService {
  constructor(@InjectQueue("websocket-events") private readonly websocketQueue: Queue) {}

  private async publishEvent<T extends { name: string }>(event: T) {
    await this.websocketQueue.add("websocket-event", {
      ...event,
      updatedAt: new Date().toISOString(),
    });
  }

  async publishSubspaceCreateEvent(event: SubspaceCreateEvent) {
    await this.publishEvent(event);
  }

  async publishSubspaceUpdateEvent(event: SubspaceUpdateEvent) {
    await this.publishEvent(event);
  }

  async publishSubspaceMoveEvent(event: SubspaceMoveEvent) {
    await this.publishEvent({
      ...event,
      data: { index: event.index },
    });
  }
}
