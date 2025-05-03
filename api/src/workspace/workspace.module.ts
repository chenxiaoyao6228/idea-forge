import { Module } from "@nestjs/common";
import { WorkspaceController } from "./workspace.controller";
import { WorkspaceService } from "./workspace.service";
import { SubspaceService } from "@/subspace/subspace.service";

@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceService, SubspaceService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
