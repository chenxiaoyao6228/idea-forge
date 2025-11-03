import { Module } from "@nestjs/common";
import { AIController } from "./ai.controller";
import { AIProviderService } from "./ai.service";
import { TokenUsageService } from "./token-usage.service";
import { UserService } from "@/user/user.service";

@Module({
  imports: [],
  controllers: [AIController],
  providers: [AIProviderService, TokenUsageService, UserService],
  exports: [AIProviderService],
})
export class AIModule {}
