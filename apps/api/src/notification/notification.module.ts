import { Module, forwardRef } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { NotificationSettingService } from "./notification-setting.service";
import { NotificationController } from "./notification.controller";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";
import { EventsModule } from "@/_shared/events/events.module";
import { EventDeduplicator } from "@/_shared/queues/helpers/event-deduplicator";
import { DocumentModule } from "@/document/document.module";
import { WorkspaceModule } from "@/workspace/workspace.module";
import { SubspaceModule } from "@/subspace/subspace.module";

@Module({
  imports: [PrismaModule, EventsModule, forwardRef(() => DocumentModule), forwardRef(() => WorkspaceModule), forwardRef(() => SubspaceModule)],
  providers: [NotificationService, NotificationSettingService, EventDeduplicator],
  controllers: [NotificationController],
  exports: [NotificationService, NotificationSettingService],
})
export class NotificationModule {}
