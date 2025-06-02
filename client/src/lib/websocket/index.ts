import { io, Socket } from "socket.io-client";
import { resolvablePromise } from "../async";
import useSubSpaceStore from "@/stores/subspace";

type SocketWithAuthentication = Socket & {
  authenticated?: boolean;
};

enum WebsocketStatus {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
}

enum DisconnectReason {
  NORMAL = "normal",
  ERROR = "error",
  TIMEOUT = "timeout",
  USER_INACTIVITY = "user_inactivity",
  AUTH_FAILED = "auth_failed",
  SERVER_DISCONNECT = "server_disconnect",
  CLIENT_DISCONNECT = "client_disconnect",
  NETWORK_ERROR = "network_error",
}

class WebsocketError extends Error {
  constructor(
    public code: string,
    message: string,
    public data?: any,
  ) {
    super(message);
    this.name = "WebsocketError";
  }
}

// Server custom events
enum SocketEvents {
  // basic
  GATEWAY_CONNECT = "gateway.connect",
  GATEWAY_DISCONNECT = "gateway.disconnect",
  AUTH_FAILED = "auth.failed",
  AUTH_SUCCESS = "auth.success",

  // business
  SUBSPACE_CREATE = "subspace.create",
  SUBSPACE_UPDATE = "subspace.update",
  SUBSPACE_MOVE = "subspace.move",
  JOIN = "join",
  JOIN_SUCCESS = "join.success",
  JOIN_ERROR = "join.error",
  ENTITIES = "entities",
}

interface GatewayMessage {
  type: SocketEvents;
  data: any;
  timestamp: string;
}

class WebsocketService {
  private socket: SocketWithAuthentication | null = null;
  private status: WebsocketStatus = WebsocketStatus.DISCONNECTED;
  private disconnectReason: DisconnectReason = DisconnectReason.NORMAL;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private connectionPromise = resolvablePromise();
  private joinedRooms = new Set<string>();

  private setStatus(status: WebsocketStatus, reason?: DisconnectReason) {
    this.status = status;
    if (reason) this.disconnectReason = reason;
    this.socket?.emit("status_change", { status, reason });
  }

  private handleSocketDisconnect(reason: string) {
    console.log("[websocket]: Socket.IO disconnected:", reason);
    let disconnectReason: DisconnectReason;

    switch (reason) {
      case "io server disconnect":
        disconnectReason = DisconnectReason.SERVER_DISCONNECT;
        break;
      case "io client disconnect":
        disconnectReason = DisconnectReason.CLIENT_DISCONNECT;
        break;
      case "ping timeout":
        disconnectReason = DisconnectReason.TIMEOUT;
        break;
      case "transport close":
      case "transport error":
        disconnectReason = DisconnectReason.NETWORK_ERROR;
        break;
      default:
        disconnectReason = DisconnectReason.ERROR;
    }

    this.setStatus(WebsocketStatus.DISCONNECTED, disconnectReason);

    // Only attempt to reconnect for certain disconnect reasons
    if ([DisconnectReason.TIMEOUT, DisconnectReason.NETWORK_ERROR, DisconnectReason.ERROR].includes(disconnectReason)) {
      setTimeout(() => this.reconnect(), 1000);
    }
  }

  async connect(): Promise<void> {
    if (this.status === WebsocketStatus.CONNECTED || this.status === WebsocketStatus.CONNECTING) {
      return this.connectionPromise;
    }

    try {
      this.setStatus(WebsocketStatus.CONNECTING);
      this.connectionPromise = resolvablePromise();

      this.socket = io(window.location.origin, {
        path: "/api/realtime",
        transports: ["websocket"],
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 30000,
        withCredentials: true,
        reconnection: false, // Handle reconnection manually
        autoConnect: true,
      });

      this.setupSocketEvents();
      this.setupBusinessEvents();

      // Wait for connection with timeout
      const timeoutPromise = resolvablePromise();
      const timeout = setTimeout(() => {
        timeoutPromise.reject(new WebsocketError("CONNECTION_TIMEOUT", "Connection timeout"));
      }, 10000);

      this.socket.on("connect", () => {
        clearTimeout(timeout);
        this.reconnectAttempts = 0;
        console.log("[websocket]: Socket.IO connected");
      });

      this.socket.on("connect_error", (error) => {
        clearTimeout(timeout);
        console.error("[websocket]: Socket.IO connection error:", error);
        const wsError = new WebsocketError("CONNECTION_ERROR", error.message, error);
        this.setStatus(WebsocketStatus.ERROR, DisconnectReason.NETWORK_ERROR);
        this.socket?.emit("error", wsError);
      });

      return this.connectionPromise;
    } catch (error: any) {
      const wsError = error instanceof WebsocketError ? error : new WebsocketError("CONNECTION_FAILED", error.message, error);
      this.setStatus(WebsocketStatus.ERROR, DisconnectReason.ERROR);
      this.socket?.emit("error", wsError);
      throw wsError;
    }
  }

  private async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      const error = new WebsocketError("MAX_RECONNECT_ATTEMPTS", "Maximum reconnection attempts reached");
      this.socket?.emit("error", error);
      this.setStatus(WebsocketStatus.ERROR, DisconnectReason.ERROR);
      return;
    }

    this.setStatus(WebsocketStatus.RECONNECTING);
    this.reconnectAttempts++;

    try {
      await this.connect();
      this.socket?.emit("reconnect");
    } catch (error) {
      const delay = this.reconnectDelay * 2 ** (this.reconnectAttempts - 1);
      setTimeout(() => this.reconnect(), delay);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.setStatus(WebsocketStatus.DISCONNECTED, DisconnectReason.CLIENT_DISCONNECT);
  }

  private setupSocketEvents() {
    if (!this.socket) return;

    // Socket.IO built-in events
    this.socket.on("disconnect", this.handleSocketDisconnect.bind(this));

    this.socket.on("error", (error) => {
      console.error("[websocket]: Socket.IO error:", error);
      this.setStatus(WebsocketStatus.ERROR, DisconnectReason.ERROR);
      this.socket?.emit("error", new WebsocketError("SOCKET_ERROR", error.message, error));
    });

    // Server custom events
    this.socket.on(SocketEvents.AUTH_SUCCESS, (message: GatewayMessage) => {
      console.log("[websocket]: Authentication successful:", message.data);
      if (this.socket) {
        this.socket.authenticated = true;
        this.setStatus(WebsocketStatus.CONNECTED);
        this.connectionPromise.resolve();
      }
    });

    this.socket.on(SocketEvents.AUTH_FAILED, (message: GatewayMessage) => {
      console.log("[websocket]: Authentication failed:", message.data);
      this.socket?.disconnect();
      this.setStatus(WebsocketStatus.ERROR, DisconnectReason.AUTH_FAILED);
    });

    this.socket.on(SocketEvents.GATEWAY_CONNECT, (message: GatewayMessage) => {
      console.log("[websocket]: Connected to realtime gateway:", message.data);
    });

    this.socket.on(SocketEvents.GATEWAY_DISCONNECT, (message: GatewayMessage) => {
      console.log("[websocket]: Disconnected from realtime gateway:", message.data);
      // Handle business-level disconnection if needed
      // This is separate from the Socket.IO disconnect event
    });
  }

  private setupBusinessEvents() {
    if (!this.socket) return;

    this.socket.on(SocketEvents.SUBSPACE_CREATE, (message: GatewayMessage) => {
      const { data } = message;
      if (!data) return;

      const subspace = data.subspace;

      const store = useSubSpaceStore.getState();
      store.addOne({
        ...subspace,
        updatedAt: new Date(subspace.updatedAt),
        createdAt: new Date(subspace.createdAt),
      });
    });

    this.socket.on(SocketEvents.SUBSPACE_MOVE, (message: GatewayMessage) => {
      const { data } = message;
      if (!data) return;

      const store = useSubSpaceStore.getState();
      store.updateOne({
        id: data.subspaceId,
        changes: {
          index: data.index,
          updatedAt: new Date(data.updatedAt),
        },
      });
    });

    this.socket.on(SocketEvents.SUBSPACE_UPDATE, (message: GatewayMessage) => {
      const { data } = message;
      if (!data) return;

      const store = useSubSpaceStore.getState();
      store.updateOne({
        id: data.id,
        changes: {
          name: data.name,
          avatar: data.avatar,
          type: data.type,
          index: data.index,
          navigationTree: data.navigationTree || [],
          updatedAt: new Date(data.updatedAt),
        },
      });
    });

    this.socket.on(SocketEvents.JOIN, (message: GatewayMessage) => {
      const { data } = message;
      if (!data) return;

      // Handle join events for new subspaces
      if (data.event === "subspace.create" && data.subspaceId) {
        const roomId = `subspace:${data.subspaceId}`;
        if (!this.joinedRooms.has(roomId)) {
          this.joinRoom(roomId);
        }
      }
    });

    this.socket.on(SocketEvents.JOIN_SUCCESS, (message: GatewayMessage) => {
      const { data } = message;
      if (!data?.roomId) return;
      this.joinedRooms.add(data.roomId);
      console.log(`[websocket]: Successfully joined room: ${data.roomId}`);
    });

    this.socket.on(SocketEvents.JOIN_ERROR, (message: GatewayMessage) => {
      const { data } = message;
      if (!data?.roomId) return;
      console.error(`[websocket]: Failed to join room: ${data.roomId}`, data.error);
      this.joinedRooms.delete(data.roomId);
    });

    // Handle entities event as a fallback mechanism
    this.socket.on(SocketEvents.ENTITIES, (message: GatewayMessage) => {
      const { data } = message;
      if (!data?.subspaceIds?.length) return;

      const store = useSubSpaceStore.getState();
      const needsUpdate = data.subspaceIds.some(({ id, updatedAt }) => store.needsUpdate(id, new Date(updatedAt)));

      if (needsUpdate) {
        store.fetchList();
      }
    });
  }

  // Room management methods
  joinRoom(roomId: string) {
    if (!this.socket?.connected) {
      console.warn(`[websocket]: Cannot join room ${roomId}, socket not connected`);
      return;
    }

    if (this.joinedRooms.has(roomId)) {
      console.log(`[websocket]: Already joined room: ${roomId}`);
      return;
    }

    console.log(`[websocket]: Joining room: ${roomId}`);
    this.socket.emit("join", { roomId });
  }

  leaveRoom(roomId: string) {
    if (!this.socket?.connected) {
      console.warn(`[websocket]: Cannot leave room ${roomId}, socket not connected`);
      return;
    }

    if (!this.joinedRooms.has(roomId)) {
      console.log(`[websocket]: Not in room: ${roomId}`);
      return;
    }

    console.log(`[websocket]: Leaving room: ${roomId}`);
    this.socket.emit("leave", { roomId });
    this.joinedRooms.delete(roomId);
  }

  // Helper method to check if we're in a room
  isInRoom(roomId: string): boolean {
    return this.joinedRooms.has(roomId);
  }

  // Helper method to get all joined rooms
  getJoinedRooms(): string[] {
    return Array.from(this.joinedRooms);
  }

  // Public API
  getStatus = () => this.status;
  getDisconnectReason = () => this.disconnectReason;
  isConnected = () => this.status === WebsocketStatus.CONNECTED;
  waitForConnection = () => this.connectionPromise;
}

export const websocketService = new WebsocketService();
