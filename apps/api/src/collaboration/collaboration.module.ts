import { Module, forwardRef } from "@nestjs/common";
import { CollaborationService } from "./collaboration.service";
import { CollaborationGateway } from "./collaboration.gateway";
import { JwtModule } from "@nestjs/jwt";
import { UserModule } from "@/user/user.module";
import { PermissionModule } from "@/permission/permission.module";
import { SubscriptionModule } from "@/subscription/subscription.module";

@Module({
  providers: [CollaborationGateway, CollaborationService],
  imports: [UserModule, JwtModule, PermissionModule, forwardRef(() => SubscriptionModule)],
  exports: [CollaborationService],
})
export class CollaborationModule {}
