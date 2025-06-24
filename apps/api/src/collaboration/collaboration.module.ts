import { Module } from "@nestjs/common";
import { CollaborationService } from "./collaboration.service";
import { CollaborationGateway } from "./collaboration.gateway";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "@/user/user.service";

@Module({
  providers: [CollaborationGateway, CollaborationService, JwtService, UserService],
  exports: [CollaborationService],
})
export class CollaborationModule {}
