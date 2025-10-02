import { Module } from "@nestjs/common";
import { GuestCollaboratorsService } from "./guest-collaborators.service";
import { GuestCollaboratorsController } from "./guest-collaborators.controller";
import { GuestCollaboratorsAbility } from "./guest-collaborators.ability";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { EventsModule } from "@/_shared/events/events.module";

@Module({
  imports: [PrismaModule, EventsModule],
  providers: [GuestCollaboratorsService, GuestCollaboratorsAbility],
  controllers: [GuestCollaboratorsController],
  exports: [GuestCollaboratorsService],
})
export class GuestCollaboratorsModule {}
