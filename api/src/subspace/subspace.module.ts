import { Module } from "@nestjs/common";
import { SubspaceController } from "./subspace.controller";
import { SubspaceService } from "./subspace.service";
import { EventsModule } from "@/_shared/events/events.module";

@Module({
  imports: [EventsModule],
  controllers: [SubspaceController],
  providers: [SubspaceService],
  exports: [SubspaceService],
})
export class SubspaceModule {}
