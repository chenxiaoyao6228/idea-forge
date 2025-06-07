import { Module } from "@nestjs/common";
import { GroupPermissionController } from "./group-permission.controller";
import { GroupPermissionService } from "./group-permission.service";

@Module({
  imports: [],
  controllers: [GroupPermissionController],
  providers: [GroupPermissionService],
  exports: [GroupPermissionService],
})
export class GroupPermissionModule {}
