import { Module } from "@nestjs/common";
import { CollaborationService } from "./collaboration.service";
import { CollaborationGateway } from "./collaboration.gateway";
import { JwtModule } from "@nestjs/jwt";
import { UserModule } from "@/user/user.module";
import { PermissionModule } from "@/permission/permission.module";

@Module({
  providers: [CollaborationGateway, CollaborationService],
  imports: [UserModule, JwtModule, PermissionModule],
  exports: [CollaborationService],
})
export class CollaborationModule {}
