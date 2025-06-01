import { Global, Module } from "@nestjs/common";
import { RealtimeGateway } from "./events/realtime.gateway";
import { WorkspaceModule } from "@/workspace/workspace.module";
import { UserModule } from "@/user/user.module";
import { RedisService } from "../database/redis/redis.service";
import { AuthModule } from "@/auth/auth.module";

@Global()
@Module({
  imports: [UserModule, WorkspaceModule, AuthModule],
  providers: [RealtimeGateway, RedisService],
  exports: [RealtimeGateway],
})
export class SocketModule {}
