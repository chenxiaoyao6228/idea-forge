import { Module } from "@nestjs/common";
import { WorkspaceController } from "./workspace.controller";
import { WorkspaceService } from "./workspace.service";
import { SubspaceModule } from "@/subspace/subspace.module";
import { EventsModule } from "@/_shared/events/events.module";

@Module({
  imports: [SubspaceModule, EventsModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
