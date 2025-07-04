import { Module } from "@nestjs/common";
import { GroupService } from "./group.service";
import { GroupController } from "./group.controller";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [GroupService],
  controllers: [GroupController],
  exports: [GroupService],
})
export class GroupModule {}
