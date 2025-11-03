import { Module, forwardRef } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { NotificationService } from "./notification.service";
import { NotificationSettingService } from "./notification-setting.service";
import { NotificationController } from "./notification.controller";
import { NotificationProcessor } from "./processors/notification.processor";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";
import { EventsModule } from "@/_shared/events/events.module";
import { EventDeduplicator } from "@/_shared/queues/helpers/event-deduplicator";

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    BullModule.registerQueue({
      name: "notifications",
    }),
    // Use forwardRef with dynamic import to break circular dependency at module level
    forwardRef(() => require("@/document/document.module").DocumentModule),
    forwardRef(() => require("@/workspace/workspace.module").WorkspaceModule),
    forwardRef(() => require("@/subspace/subspace.module").SubspaceModule),
    forwardRef(() => require("@/subscription/subscription.module").SubscriptionModule),
  ],
  providers: [NotificationService, NotificationSettingService, EventDeduplicator, NotificationProcessor],
  controllers: [NotificationController],
  exports: [NotificationService, NotificationSettingService],
})
export class NotificationModule {}
