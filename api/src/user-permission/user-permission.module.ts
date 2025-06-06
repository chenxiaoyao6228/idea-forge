import { Module } from "@nestjs/common";
import { UserPermissionController } from "./user-permission.controller";
import { UserPermissionService } from "./user-permission.service";
import { PrismaModule } from "@/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [UserPermissionController],
  providers: [UserPermissionService],
  exports: [UserPermissionService],
})
export class UserPermissionModule {}
