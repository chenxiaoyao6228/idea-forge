import { Module } from "@nestjs/common";
import { SubspaceController } from "./subspace.controller";
import { SubspaceService } from "./subspace.service";

@Module({
  controllers: [SubspaceController],
  providers: [SubspaceService],
  exports: [SubspaceService],
})
export class SubspaceModule {}
