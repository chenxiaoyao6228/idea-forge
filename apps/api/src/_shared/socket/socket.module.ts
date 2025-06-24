import { Global, Module } from "@nestjs/common";
import { RealtimeGateway } from "./events/realtime.gateway";
import { WorkspaceModule } from "@/workspace/workspace.module";
import { UserModule } from "@/user/user.module";
import { RedisService } from "../database/redis/redis.service";
import { AuthModule } from "@/auth/auth.module";
import { SubspaceModule } from "@/subspace/subspace.module";

@Global()
@Module({
  imports: [UserModule, WorkspaceModule, AuthModule, SubspaceModule],
  providers: [RealtimeGateway, RedisService],
  exports: [RealtimeGateway],
})
export class SocketModule {}
