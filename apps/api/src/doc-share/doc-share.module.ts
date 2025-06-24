import { Module } from "@nestjs/common";
import { DocShareService } from "./doc-share.service";
import { DocShareController } from "./doc-share.controller";
import { EventsModule } from "@/_shared/events/events.module";

@Module({
  imports: [EventsModule],
  controllers: [DocShareController],
  providers: [DocShareService],
  exports: [DocShareService],
})
export class DocShareModule {}
