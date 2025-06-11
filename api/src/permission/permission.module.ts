import { Module } from "@nestjs/common";
import { PermissionInheritanceService } from "./permission-inheritance.service";
import { PermissionService } from "./permission.service";
import { PermissionController } from "./permission.controller";

@Module({
  controllers: [PermissionController],
  providers: [PermissionInheritanceService, PermissionService],
  exports: [PermissionInheritanceService, PermissionService],
})
export class PermissionModule {}
