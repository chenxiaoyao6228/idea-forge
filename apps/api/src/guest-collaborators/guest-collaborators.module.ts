import { Module, forwardRef } from "@nestjs/common";
import { GuestCollaboratorsService } from "./guest-collaborators.service";
import { GuestCollaboratorsController } from "./guest-collaborators.controller";
import { GuestCollaboratorsAbility } from "./guest-collaborators.ability";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { EventsModule } from "@/_shared/events/events.module";
import { WorkspaceModule } from "@/workspace/workspace.module";
import { EventDeduplicator } from "@/_shared/queues/helpers/event-deduplicator";

@Module({
  imports: [PrismaModule, EventsModule, forwardRef(() => WorkspaceModule)],
  providers: [GuestCollaboratorsService, GuestCollaboratorsAbility, EventDeduplicator],
  controllers: [GuestCollaboratorsController],
  exports: [GuestCollaboratorsService],
})
export class GuestCollaboratorsModule {}
