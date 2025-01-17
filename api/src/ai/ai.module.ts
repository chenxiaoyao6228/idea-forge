import { Module } from "@nestjs/common";
import { AIController } from "./ai.controller";
import { AIProviderService } from "./ai.service";

@Module({
  imports: [],
  controllers: [AIController],
  providers: [AIProviderService],
  exports: [AIProviderService],
})
export class AIModule {}
