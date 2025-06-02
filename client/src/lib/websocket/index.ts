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
}

enum DisconnectReason {
  NORMAL = "normal",
  ERROR = "error",
  TIMEOUT = "timeout",
  USER_INACTIVITY = "user_inactivity",
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

// TODO: add to shared package
// Business event types from server
enum BusinessEvents {
  SUBSPACE_UPDATE = "subspace.update",
  SUBSPACE_REORDER = "subspace.reorder",
  GATEWAY_CONNECT = "gateway.connect",
  GATEWAY_DISCONNECT = "gateway.disconnect",
  AUTH_FAILED = "auth.failed",
}

// TODO: add to shared package
interface GatewayMessage {
  type: BusinessEvents;
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

  private setStatus(status: WebsocketStatus, reason?: DisconnectReason) {
    this.status = status;
    if (reason) this.disconnectReason = reason;
    this.socket?.emit("status_change", status);
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

      // Wait for connection with timeout
      const timeoutPromise = resolvablePromise();
      const timeout = setTimeout(() => {
        timeoutPromise.reject(new WebsocketError("CONNECTION_TIMEOUT", "Connection timeout"));
      }, 10000);

      this.socket.on("connect", () => {
        clearTimeout(timeout);
        this.reconnectAttempts = 0;
      });

      this.socket.on("connect_error", (error) => {
        clearTimeout(timeout);
        const wsError = new WebsocketError("CONNECTION_ERROR", error.message, error);
        this.socket?.emit("error", wsError);
      });

      return this.connectionPromise;
    } catch (error: any) {
      const wsError = error instanceof WebsocketError ? error : new WebsocketError("CONNECTION_FAILED", error.message, error);
      this.socket?.emit("error", wsError);
      throw wsError;
    }
  }

  private async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      const error = new WebsocketError("MAX_RECONNECT_ATTEMPTS", "Maximum reconnection attempts reached");
      this.socket?.emit("error", error);
      this.setStatus(WebsocketStatus.DISCONNECTED, DisconnectReason.ERROR);
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
    this.setStatus(WebsocketStatus.DISCONNECTED, DisconnectReason.NORMAL);
  }

  private setupSocketEvents() {
    if (!this.socket) return;

    // Handle authentication
    this.socket.on("authenticated", () => {
      if (this.socket) {
        this.socket.authenticated = true;
        this.setStatus(WebsocketStatus.CONNECTED);
        this.connectionPromise.resolve();
      }
    });

    // Handle gateway connection confirmation
    this.socket.on(BusinessEvents.GATEWAY_CONNECT, (message: GatewayMessage) => {
      console.log("Connected to realtime gateway:", message.data);
    });

    this.socket.on(BusinessEvents.GATEWAY_DISCONNECT, (reason) => {
      let disconnectReason: DisconnectReason;

      switch (reason) {
        case "io server disconnect":
        case "io client disconnect":
          disconnectReason = DisconnectReason.NORMAL;
          break;
        case "ping timeout":
        case "transport close":
          disconnectReason = DisconnectReason.TIMEOUT;
          break;
        default:
          disconnectReason = DisconnectReason.ERROR;
      }

      this.setStatus(WebsocketStatus.DISCONNECTED, disconnectReason);

      if (disconnectReason !== DisconnectReason.NORMAL) {
        setTimeout(() => this.reconnect(), 1000);
      }
    });

    this.socket.on("connect_error", (error) => {
      this.socket?.emit("error", new WebsocketError("SOCKET_ERROR", error.message, error));
    });

    // Handle subspace events
    this.socket.on(BusinessEvents.SUBSPACE_UPDATE, (message: GatewayMessage) => {
      const { data } = message;
      if (!data) return;

      // Handle subspace updates
      if (data.event === "subspace.create" || data.event === "subspace.update") {
        const { subspaceIds } = data;
        if (subspaceIds?.length) {
          // Fetch updated subspaces
          useSubSpaceStore.getState().fetchList();
        }
      }
    });

    // Handle subspace reorder events
    this.socket.on(BusinessEvents.SUBSPACE_REORDER, (message: GatewayMessage) => {
      const { data } = message;
      if (!data) return;

      const { subspaceId, index } = data;
      if (subspaceId && index !== undefined) {
        // Update the subspace index in the store
        useSubSpaceStore.getState().updateOne({
          id: subspaceId,
          changes: { index },
        });
      }
    });
  }

  // Public API
  getStatus = () => this.status;
  getDisconnectReason = () => this.disconnectReason;
  isConnected = () => this.status === WebsocketStatus.CONNECTED;
  waitForConnection = () => this.connectionPromise;
}

export const websocketService = new WebsocketService();
