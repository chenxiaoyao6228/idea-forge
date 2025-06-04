import { Module } from "@nestjs/common";
import { StarService } from "./star.service";
import { StarController } from "./star.controller";

@Module({
  controllers: [StarController],
  providers: [StarService],
})
export class StarModule {}
