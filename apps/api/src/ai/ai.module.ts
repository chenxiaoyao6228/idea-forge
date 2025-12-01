import { Module, forwardRef } from "@nestjs/common";
import { AIController } from "./ai.controller";
import { AIProviderService } from "./ai.service";
import { TokenUsageService } from "./token-usage.service";
import { UserService } from "@/user/user.service";
import { WorkspaceModule } from "@/workspace/workspace.module";

@Module({
  imports: [forwardRef(() => WorkspaceModule)],
  controllers: [AIController],
  providers: [AIProviderService, TokenUsageService, UserService],
  exports: [AIProviderService],
})
export class AIModule {}
