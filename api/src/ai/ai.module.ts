import { Module } from "@nestjs/common";
import { AIController } from "./ai.controller";
import { AIProviderService } from "./ai.service";
import { TokenUsageService } from "./token-usage.service";

@Module({
  imports: [],
  controllers: [AIController],
  providers: [AIProviderService, TokenUsageService],
  exports: [AIProviderService],
})
export class AIModule {}
