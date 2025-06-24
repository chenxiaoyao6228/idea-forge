import { Module } from "@nestjs/common";
import { QueueModule } from "../queues/queue.module";
import { EventPublisherService } from "./event-publisher.service";

@Module({
  imports: [QueueModule],
  providers: [EventPublisherService],
  exports: [EventPublisherService],
})
export class EventsModule {}
