import { Module } from "@nestjs/common";
import { GroupService } from "./group.service";
import { GroupController } from "./group.controller";
import { GroupPresenter } from "./group.presenter";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [GroupService, GroupPresenter],
  controllers: [GroupController],
  exports: [GroupService],
})
export class GroupModule {}
