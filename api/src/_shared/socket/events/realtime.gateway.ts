import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, GatewayMetadata } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { BusinessEvents } from "../business-event.constant";
import { WorkspaceService } from "@/workspace/workspace.service";
import { JwtService } from "@nestjs/jwt";
import { RedisService } from "@/_shared/database/redis/redis.service";
import { AuthService } from "@/auth/auth.service";
import { AuthGateway } from "../shared/auth.gateway";
import { ConfigService } from "@nestjs/config";

@WebSocketGateway<GatewayMetadata>({
  path: "/api/realtime",
  cors: {
    origin: "*",
    credentials: true,
  },
})
export class RealtimeGateway extends AuthGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    configService: ConfigService,
    private readonly workspaceService: WorkspaceService,
    jwtService: JwtService,
    redisService: RedisService,
    authService: AuthService,
  ) {
    super(jwtService, redisService, authService, configService);
  }

  async handleConnection(client: Socket) {
    try {
      // Let the auth gateway handle authentication
      const user = await super.handleConnection(client);
      if (!user) return;

      // Join user's workspace rooms
      const workspaces = await this.workspaceService.getUserWorkspaces(user.id);
      workspaces.forEach((workspace) => {
        client.join(`workspace:${workspace.id}`);
      });

      // Join user's personal room
      client.join(`user:${user.id}`);

      // Notify connection
      client.send(this.gatewayMessageFormat(BusinessEvents.GATEWAY_CONNECT, "WebSocket connected"));

      // Broadcast user online
      this.server.to(`workspace:${user.id}`).emit(BusinessEvents.USER_ONLINE, this.gatewayMessageFormat(BusinessEvents.USER_ONLINE, { userId: user.id }));
    } catch (error) {
      console.error("handleConnection error", error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (user) {
      // Broadcast user offline
      this.server.to(`workspace:${user.id}`).emit(BusinessEvents.USER_OFFLINE, this.gatewayMessageFormat(BusinessEvents.USER_OFFLINE, { userId: user.id }));
    }

    super.handleDisconnect(client);
  }

  @SubscribeMessage("join")
  async handleJoin(client: Socket, payload: { workspaceId?: string; subspaceId?: string }) {
    // const user = client.data.user;
    // if (!user) return;
    // if (payload.workspaceId) {
    //   // Check workspace access
    //   const hasAccess = await this.workspaceService.hasWorkspaceAccess(user.id, payload.workspaceId);
    //   if (hasAccess) {
    //     client.join(`workspace:${payload.workspaceId}`);
    //   }
    // }
    // if (payload.subspaceId) {
    //   // Check subspace access
    //   const hasAccess = await this.workspaceService.hasSubspaceAccess(user.id, payload.subspaceId);
    //   if (hasAccess) {
    //     client.join(`subspace:${payload.subspaceId}`);
    //   }
    // }
  }

  @SubscribeMessage("leave")
  async handleLeave(client: Socket, payload: { workspaceId?: string; subspaceId?: string }) {
    // if (payload.workspaceId) {
    //   client.leave(`workspace:${payload.workspaceId}`);
    // }
    // if (payload.subspaceId) {
    //   client.leave(`subspace:${payload.subspaceId}`);
    // }
  }

  @SubscribeMessage(BusinessEvents.SUBSPACE_REORDER)
  async handleSubspaceReorder(client: Socket, payload: any) {
    const { workspaceId } = payload;
    this.server.to(`workspace:${workspaceId}`).emit(
      BusinessEvents.SUBSPACE_REORDER,
      this.gatewayMessageFormat(BusinessEvents.SUBSPACE_REORDER, {
        ...payload,
        userId: client.data.user.id,
      }),
    );
  }
}
