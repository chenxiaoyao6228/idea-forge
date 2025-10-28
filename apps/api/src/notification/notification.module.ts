import { Module, forwardRef } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { NotificationService } from "./notification.service";
import { NotificationSettingService } from "./notification-setting.service";
import { NotificationController } from "./notification.controller";
import { NotificationProcessor } from "./processors/notification.processor";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";
import { EventsModule } from "@/_shared/events/events.module";
import { EventDeduplicator } from "@/_shared/queues/helpers/event-deduplicator";
import { DocumentModule } from "@/document/document.module";
import { WorkspaceModule } from "@/workspace/workspace.module";
import { SubspaceModule } from "@/subspace/subspace.module";
import { SubscriptionModule } from "@/subscription/subscription.module";

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    BullModule.registerQueue({
      name: "notifications",
    }),
    forwardRef(() => DocumentModule),
    forwardRef(() => WorkspaceModule),
    forwardRef(() => SubspaceModule),
    forwardRef(() => SubscriptionModule),
  ],
  providers: [NotificationService, NotificationSettingService, EventDeduplicator, NotificationProcessor],
  controllers: [NotificationController],
  exports: [NotificationService, NotificationSettingService],
})
export class NotificationModule {}
