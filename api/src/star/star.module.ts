import { Module } from "@nestjs/common";
import { StarService } from "./star.service";
import { StarController } from "./star.controller";
import { EventsModule } from "@/_shared/events/events.module";

@Module({
  imports: [EventsModule],
  controllers: [StarController],
  providers: [StarService],
  exports: [StarService],
})
export class StarModule {}
