import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, GatewayMetadata } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { BusinessEvents } from "../business-event.constant";
import { WorkspaceService } from "@/workspace/workspace.service";
import { JwtService } from "@nestjs/jwt";
import { RedisService } from "@/_shared/database/redis/redis.service";
import { AuthService } from "@/auth/auth.service";
import { AuthGateway } from "../shared/auth.gateway";
import { ConfigService } from "@nestjs/config";
import { SubspaceService } from "@/subspace/subspace.service";

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
    private readonly subspaceService: SubspaceService,
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

      // Join user's personal room
      await this.handleJoinRoom(client, `user:${user.id}`);

      // Join user's workspace rooms
      const workspaces = await this.workspaceService.getUserWorkspaces(user.id);
      for (const workspace of workspaces) {
        await this.handleJoinRoom(client, `workspace:${workspace.id}`);
      }

      // Join user's subspace rooms
      const subspaces = await this.subspaceService.getUserSubWorkspaces(user.id);
      for (const subspace of subspaces) {
        await this.handleJoinRoom(client, `subspace:${subspace.id}`);
      }

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

      // Leave all rooms
      const rooms = Array.from(client.rooms);
      for (const room of rooms) {
        if (room !== client.id) {
          await this.handleLeaveRoom(client, room);
        }
      }
    }

    super.handleDisconnect(client);
  }

  @SubscribeMessage("join")
  async handleJoin(client: Socket, payload: { workspaceId?: string; subspaceId?: string; groupId?: string }) {
    const user = client.data.user;
    if (!user) return;

    if (payload.workspaceId) {
      // Check workspace access
      const hasAccess = await this.workspaceService.hasWorkspaceAccess(user.id, payload.workspaceId);
      if (hasAccess) {
        await this.handleJoinRoom(client, `workspace:${payload.workspaceId}`);
      }
    }

    if (payload.subspaceId) {
      // Check subspace access
      const hasAccess = await this.subspaceService.hasSubspaceAccess(user.id, payload.subspaceId);
      if (hasAccess) {
        await this.handleJoinRoom(client, `subspace:${payload.subspaceId}`);
      }
    }
  }

  @SubscribeMessage("leave")
  async handleLeave(client: Socket, payload: { workspaceId?: string; subspaceId?: string }) {
    if (payload.workspaceId) {
      await this.handleLeaveRoom(client, `workspace:${payload.workspaceId}`);
    }
    if (payload.subspaceId) {
      await this.handleLeaveRoom(client, `subspace:${payload.subspaceId}`);
    }
  }

  @SubscribeMessage(BusinessEvents.SUBSPACE_MOVE)
  async handleSubspaceReorder(client: Socket, payload: any) {
    const { workspaceId } = payload;
    this.server.to(`workspace:${workspaceId}`).emit(
      BusinessEvents.SUBSPACE_MOVE,
      this.gatewayMessageFormat(BusinessEvents.SUBSPACE_MOVE, {
        ...payload,
        userId: client.data.user.id,
      }),
    );
  }
}
