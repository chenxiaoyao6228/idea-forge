import type { Socket } from "socket.io";
import { WebSocketServer } from "@nestjs/websockets";
import { Namespace } from "socket.io";
import { BusinessEvents } from "../business-event.constant";

export abstract class BaseGateway {
  @WebSocketServer()
  protected namespace: Namespace;

  public gatewayMessageFormat(type: BusinessEvents, message: any, code?: number) {
    return {
      type,
      data: message,
      code,
      timestamp: new Date().toISOString(),
    };
  }

  protected async handleJoinRoom(client: Socket, roomId: string) {
    try {
      await client.join(roomId);
      client.send(
        this.gatewayMessageFormat(BusinessEvents.JOIN_SUCCESS, {
          roomId,
          timestamp: new Date().toISOString(),
        }),
      );
      console.log(`[websocket]: Successfully joined room: ${roomId}`);
      return true;
    } catch (error) {
      console.error(`Error joining room ${roomId}:`, error);
      client.send(
        this.gatewayMessageFormat(BusinessEvents.JOIN_ERROR, {
          roomId,
          error: "Failed to join room",
          timestamp: new Date().toISOString(),
        }),
      );
      return false;
    }
  }

  protected async handleLeaveRoom(client: Socket, roomId: string) {
    try {
      await client.leave(roomId);
      return true;
    } catch (error) {
      console.error(`Error leaving room ${roomId}:`, error);
      return false;
    }
  }

  async broadcast(event: BusinessEvents, data: any) {
    const message = this.gatewayMessageFormat(event, data);
    this.namespace.emit(event, message);
  }
}

export class BroadcastBaseGateway extends BaseGateway {
  @WebSocketServer()
  protected namespace: Namespace;

  async handleConnect(client: Socket) {
    // Join workspace room if workspaceId is available
    if (client.data.user?.workspaceId) {
      await this.handleJoinRoom(client, `workspace:${client.data.user.workspaceId}`);
    }

    // Join user room
    if (client.data.user?.id) {
      await this.handleJoinRoom(client, `user:${client.data.user.id}`);
    }
  }

  async handleDisconnect(client: Socket) {
    // Leave all rooms except the socket's own room
    const rooms = Array.from(client.rooms);
    for (const room of rooms) {
      if (room !== client.id) {
        await this.handleLeaveRoom(client, room);
      }
    }
  }

  async handleJoinRoom(client: Socket, roomId: string) {
    try {
      await client.join(roomId);
      client.send(
        this.gatewayMessageFormat(BusinessEvents.JOIN_SUCCESS, {
          roomId,
          timestamp: new Date().toISOString(),
        }),
      );
      console.log(`[websocket]: Successfully joined room: ${roomId}`);
      return true;
    } catch (error) {
      console.error(`Error joining room ${roomId}:`, error);
      client.send(
        this.gatewayMessageFormat(BusinessEvents.JOIN_ERROR, {
          roomId,
          error: "Failed to join room",
          timestamp: new Date().toISOString(),
        }),
      );
      return false;
    }
  }

  async handleLeaveRoom(client: Socket, roomId: string) {
    try {
      await client.leave(roomId);
      return true;
    } catch (error) {
      console.error(`Error leaving room ${roomId}:`, error);
      return false;
    }
  }

  async broadcast(event: BusinessEvents, data: any) {
    const message = this.gatewayMessageFormat(event, data);
    this.namespace.emit(event, message);
  }
}
