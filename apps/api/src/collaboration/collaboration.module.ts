import { Module } from "@nestjs/common";
import { CollaborationService } from "./collaboration.service";
import { CollaborationGateway } from "./collaboration.gateway";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "@/user/user.service";
import { PermissionModule } from "@/permission/permission.module";

@Module({
  providers: [CollaborationGateway, CollaborationService, JwtService, UserService],
  imports: [PermissionModule],
  exports: [CollaborationService],
})
export class CollaborationModule {}
