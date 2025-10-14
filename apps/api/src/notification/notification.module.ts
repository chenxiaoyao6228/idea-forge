import { Module } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { NotificationController } from "./notification.controller";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { EventsModule } from "@/_shared/events/events.module";
import { EventDeduplicator } from "@/_shared/queues/helpers/event-deduplicator";
import { NotificationEventProcessor } from "./processors/notification-event.processor";

@Module({
  imports: [PrismaModule, EventsModule],
  providers: [NotificationService, NotificationEventProcessor, EventDeduplicator],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
