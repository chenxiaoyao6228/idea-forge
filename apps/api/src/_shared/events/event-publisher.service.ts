import { Global, Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { WebsocketEvent } from "./types/websocket.event";

@Global()
@Injectable()
export class EventPublisherService {
  constructor(@InjectQueue("websocket-events") private readonly websocketQueue: Queue) {}

  async publishWebsocketEvent<T>(event: WebsocketEvent<T>) {
    await this.websocketQueue.add("websocket-event", event);
  }
}
