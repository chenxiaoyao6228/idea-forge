import { Module } from "@nestjs/common";
import { GroupService } from "./group.service";
import { GroupController } from "./group.controller";
import { GroupPresenter } from "./group.presenter";
import { PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";

@Module({
  providers: [GroupService, GroupPresenter, { provide: PRISMA_CLIENT, useExisting: PRISMA_CLIENT }],
  controllers: [GroupController],
})
export class GroupModule {}
