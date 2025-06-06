import { Module } from "@nestjs/common";
import { GroupPermissionController } from "./group-permission.controller";
import { GroupPermissionService } from "./group-permission.service";
import { PrismaModule } from "@/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [GroupPermissionController],
  providers: [GroupPermissionService],
  exports: [GroupPermissionService],
})
export class GroupPermissionModule {}
