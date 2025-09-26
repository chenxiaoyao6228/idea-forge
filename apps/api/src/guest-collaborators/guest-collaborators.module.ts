import { Module } from "@nestjs/common";
import { GuestCollaboratorsService } from "./guest-collaborators.service";
import { GuestCollaboratorsController } from "./guest-collaborators.controller";
import { GuestCollaboratorsAbility } from "./guest-collaborators.ability";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [GuestCollaboratorsService, GuestCollaboratorsAbility],
  controllers: [GuestCollaboratorsController],
  exports: [GuestCollaboratorsService],
})
export class GuestCollaboratorsModule {}
