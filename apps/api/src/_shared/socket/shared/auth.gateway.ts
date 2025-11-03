import * as cookie from "cookie";
import type { OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { WebSocketServer } from "@nestjs/websockets";
import type { Socket } from "socket.io";
import { Namespace } from "socket.io";
import { RedisService } from "../../database/redis/redis.service";
import { BroadcastBaseGateway } from "./base.gateway";
import { BusinessEvents } from "../business-event.constant";
import { AuthService } from "@/auth/auth.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

export interface AuthGatewayOptions {
  namespace: string;
}

export type IAuthGateway = OnGatewayConnection & OnGatewayDisconnect & BroadcastBaseGateway;

export class AuthGateway extends BroadcastBaseGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    protected readonly jwtService: JwtService,
    protected readonly redisService: RedisService,
    protected readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  @WebSocketServer()
  protected namespace: Namespace;

  private tokenSocketIdMap = new Map<string, string>();

  async authFailed(client: Socket) {
    client.send(this.gatewayMessageFormat(BusinessEvents.AUTH_FAILED, "Authentication failed"));
    client.disconnect();
  }

  async handleConnection(client: Socket) {
    try {
      let token =
        client.handshake.query.token?.toString() ||
        client.handshake.headers.authorization?.toString().split(" ")[1] ||
        client.handshake.headers.Authorization?.toString().split(" ")[1];

      if (!token && client.handshake.headers.cookie) {
        const cookies = cookie.parse(client.handshake.headers.cookie);
        token = cookies.accessToken;
      }

      if (!token) {
        return this.authFailed(client);
      }

      const jwtConfig = this.configService.get("jwt");
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtConfig.secret,
      });
      const user = await this.authService.validateJWTToken(payload.sub);

      if (!user) {
        return this.authFailed(client);
      }

      client.send(this.gatewayMessageFormat(BusinessEvents.AUTH_SUCCESS, "Authentication successful"));

      this.tokenSocketIdMap.set(token, client.id);
      client.data.user = user;

      super.handleConnect(client);
      return user;
    } catch (error) {
      console.error("WebSocket authentication error:", error);
      return this.authFailed(client);
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const token =
        client.handshake.query.token?.toString() ||
        client.handshake.headers.authorization?.toString().split(" ")[1] ||
        client.handshake.headers.Authorization?.toString().split(" ")[1];

      if (token) {
        this.tokenSocketIdMap.delete(token);
      }

      super.handleDisconnect(client);
    } catch (error) {
      console.error("Error in handleDisconnect:", error);
    }
  }

  // TODO: handle token refresh
  // @SubscribeMessage("refresh_token")
  // async handleRefreshToken(client: Socket) {
  //   try {
  //     const user = client.data.user;
  //     if (!user) return this.authFailed(client);

  //     // 使用 AuthService 的 refreshToken 方法，它会处理所有 token 相关的逻辑
  //     const { accessToken, refreshToken, user: updatedUser } = await this.authService.refreshToken(user);

  //     // Update token mapping
  //     const oldToken = client.handshake.headers.authorization?.toString().split(" ")[1];
  //     if (oldToken) {
  //       this.tokenSocketIdMap.delete(oldToken);
  //     }
  //     this.tokenSocketIdMap.set(accessToken, client.id);

  //     // 更新 socket 中的用户信息
  //     client.data.user = updatedUser;

  //     // Send new tokens to client
  //     client.emit("token_refreshed", {
  //       accessToken,
  //       refreshToken,
  //       user: updatedUser,
  //     });

  //     return true;
  //   } catch (error) {
  //     return this.authFailed(client);
  //   }
  // }

  // @OnEvent("token.expired")
  // async handleTokenExpired(token: string) {
  //   try {
  //     const socketId = this.tokenSocketIdMap.get(token);
  //     if (!socketId) return false;

  //     const socket = this.namespace.sockets.get(socketId);
  //     if (socket) {
  //       // Try to refresh token before disconnecting
  //       const refreshed = await this.handleRefreshToken(socket);
  //       if (!refreshed) {
  //         socket.disconnect();
  //         await this.handleDisconnect(socket);
  //       }
  //       return true;
  //     }
  //     return false;
  //   } catch (error) {
  //     console.error("Error in handleTokenExpired:", error);
  //     return false;
  //   }
  // }

  override async broadcast(event: BusinessEvents, data: any) {
    const message = this.gatewayMessageFormat(event, data);
    // Publish to Redis channel for other instances to pick up
    await this.redisService.getClient().publish(`socket:${this.namespace}:broadcast`, JSON.stringify(message));
  }
}
