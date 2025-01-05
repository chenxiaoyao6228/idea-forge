import { Module } from "@nestjs/common";
import { CollaborationService } from "./collaboration.service";
import { CollaborationGateway } from "./collaboration.gateway";

@Module({
  providers: [CollaborationGateway, CollaborationService],
})
export class CollaborationModule {}
