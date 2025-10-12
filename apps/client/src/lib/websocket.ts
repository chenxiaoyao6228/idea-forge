import { io, Socket } from "socket.io-client";
import { throttle } from "lodash-es";
import { resolvablePromise } from "./async";
import { pageVisibility } from "./page-visibility";

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

// Disconnection reason enum for better error handling
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

// Custom error class for WebSocket related errors
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

// Server event types enum
export enum SocketEvents {
  // Basic connection events
  GATEWAY_CONNECT = "gateway.connect",
  GATEWAY_DISCONNECT = "gateway.disconnect",
  AUTH_FAILED = "auth.failed",
  AUTH_SUCCESS = "auth.success",

  // Business events
  SUBSPACE_CREATE = "subspace.create",
  SUBSPACE_UPDATE = "subspace.update",
  SUBSPACE_MOVE = "subspace.move",

  SUBSPACE_MEMBER_ADDED = "subspace.member.added",
  SUBSPACE_MEMBERS_BATCH_ADDED = "subspace.members.batch.added",
  SUBSPACE_MEMBER_LEFT = "subspace.member.left",

  // Workspace events
  WORKSPACE_MEMBER_ADDED = "workspace.member.added",
  WORKSPACE_MEMBERS_BATCH_ADDED = "workspace.members.batch.added",
  WORKSPACE_MEMBER_ROLE_UPDATED = "workspace.member.role.updated",
  WORKSPACE_MEMBER_LEFT = "workspace.member.left",

  JOIN = "join",
  JOIN_SUCCESS = "join.success",
  JOIN_ERROR = "join.error",
  ENTITIES = "entities",
  DOCUMENT_UPDATE = "document.update",

  STAR_CREATE = "stars.create",
  STAR_UPDATE = "stars.update",
  STAR_DELETE = "stars.delete",

  DOCUMENT_ADD_USER = "document.addUser",

  // Permission events
  PERMISSION_CHANGED = "permission.changed",
  ACCESS_REVOKED = "permission.access.revoked",
  DOCUMENT_SHARED = "permission.document.shared",
  SUBSPACE_PERMISSION_UPDATED = "permission.subspace.updated",
  PERMISSION_INHERITANCE_CHANGED = "permission.inheritance.changed",
  PERMISSION_OVERRIDE_CREATED = "permission.override.created",
  PERMISSION_OVERRIDE_REMOVED = "permission.override.removed",
  GROUP_PERMISSION_CHANGED = "permission.group.changed",
  GUEST_PERMISSION_UPDATED = "permission.guest.updated",
  GUEST_PERMISSION_INHERITED = "permission.guest.inherited",

  GUEST_INVITED = "guest.invited",
  GUEST_ACCEPTED = "guest.accepted",
  GUEST_REMOVED = "guest.removed",
  GUEST_PROMOTED = "guest.promoted",

  // Public share events
  PUBLIC_SHARE_CREATED = "public.share.created",
  PUBLIC_SHARE_UPDATED = "public.share.updated",
  PUBLIC_SHARE_REVOKED = "public.share.revoked",
}

// Interface for gateway message structure
interface GatewayMessage {
  name: string;
  [key: string]: any;
}

// Main WebSocket service class
class WebsocketService {
  socket: SocketWithAuthentication | null = null;
  private status: WebsocketStatus = WebsocketStatus.DISCONNECTED;
  private disconnectReason: DisconnectReason = DisconnectReason.NORMAL;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private connectionPromise = resolvablePromise();
  private joinedRooms = new Set<string>();
  private visibilityCleanup: (() => void) | null = null;

  // Recovery observer pattern (inspired by Flowus)
  private recoveryObservers = new Set<() => void>();

  // Heartbeat management
  private heartbeatTimer: NodeJS.Timeout | null = null;

  // Update connection status and emit status change event
  private setStatus(status: WebsocketStatus, reason?: DisconnectReason) {
    this.status = status;
    if (reason) this.disconnectReason = reason;
    this.socket?.emit("status_change", { status, reason });
  }

  // Wait for page to be visible before attempting connection
  private async waitForPageVisible(): Promise<void> {
    if (pageVisibility.isVisible()) {
      return Promise.resolve();
    }

    console.log("[websocket]: Page is hidden, waiting for visibility...");

    return new Promise<void>((resolve) => {
      const cleanup = pageVisibility.onVisible(() => {
        console.log("[websocket]: Page became visible, proceeding with connection");
        cleanup();
        resolve();
      });
    });
  }

  // Recovery observer pattern (inspired by Flowus)
  subscribeToRecovery(callback: () => void): () => void {
    this.recoveryObservers.add(callback);
    console.log(`[websocket]: Recovery observer added (total: ${this.recoveryObservers.size})`);

    return () => {
      this.recoveryObservers.delete(callback);
      console.log(`[websocket]: Recovery observer removed (total: ${this.recoveryObservers.size})`);
    };
  }

  // Dispatch recovery to all observers (throttled to 1500ms like Flowus)
  private dispatchRecover = throttle(
    () => {
      console.log(`[websocket]: Dispatching recovery to ${this.recoveryObservers.size} observers`);

      // Notify all observers
      this.recoveryObservers.forEach((callback) => {
        try {
          callback();
        } catch (error) {
          console.error("[websocket]: Error in recovery observer:", error);
        }
      });
    },
    1500,
    {
      leading: false,
      trailing: true,
    },
  );

  // Pause heartbeat to save resources when page hidden
  private pauseHeartbeat(): void {
    if (this.heartbeatTimer) {
      console.log("[websocket]: Pausing heartbeat");
      this.heartbeatPaused = true;
      // Note: We don't clear the timer, just set the flag
      // The heartbeat logic will check this flag
    }
  }

  // Resume heartbeat when page visible
  private resumeHeartbeat(): void {
    if (this.heartbeatTimer) {
      console.log("[websocket]: Resuming heartbeat");
      this.heartbeatPaused = false;
      // Heartbeat will resume on next interval
    }
  }

  // Handle socket disconnection with appropriate reason
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

  // Establish WebSocket connection with timeout
  async connect(): Promise<void> {
    if (this.status === WebsocketStatus.CONNECTED || this.status === WebsocketStatus.CONNECTING) {
      return this.connectionPromise;
    }

    try {
      this.setStatus(WebsocketStatus.CONNECTING);
      this.connectionPromise = resolvablePromise();

      // Initialize Socket.IO client with configuration
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
        this.setStatus(WebsocketStatus.CONNECTED);
        console.log("[websocket]: Socket.IO connected");

        // Setup visibility handlers for automatic reconnection
        this.setupVisibilityHandlers();

        // Emit reconnection event for backward compatibility
        window.dispatchEvent(new CustomEvent("websocket:reconnected"));

        // Resolve the connection promise
        timeoutPromise.resolve();
      });

      this.socket.on("connect_error", (error) => {
        clearTimeout(timeout);
        console.error("[websocket]: Socket.IO connection error:", error);
        const wsError = new WebsocketError("CONNECTION_ERROR", error.message, error);
        this.setStatus(WebsocketStatus.ERROR, DisconnectReason.NETWORK_ERROR);
        this.socket?.emit("error", wsError);
        timeoutPromise.reject(wsError);
      });

      return timeoutPromise;
    } catch (error: any) {
      const wsError = error instanceof WebsocketError ? error : new WebsocketError("CONNECTION_FAILED", error.message, error);
      this.setStatus(WebsocketStatus.ERROR, DisconnectReason.ERROR);
      this.socket?.emit("error", wsError);
      throw wsError;
    }
  }

  // Handle reconnection with exponential backoff
  private async reconnect() {
    // Wait for page to be visible before attempting reconnection
    await this.waitForPageVisible();

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

      // Dispatch recovery after successful reconnection
      this.dispatchRecover();
    } catch (error) {
      const delay = this.reconnectDelay * 2 ** (this.reconnectAttempts - 1);
      setTimeout(() => this.reconnect(), delay);
    }
  }

  // Disconnect WebSocket connection
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.setStatus(WebsocketStatus.DISCONNECTED, DisconnectReason.CLIENT_DISCONNECT);

    // Clean up visibility listeners
    if (this.visibilityCleanup) {
      this.visibilityCleanup();
      this.visibilityCleanup = null;
    }
  }

  // Setup visibility change handlers
  private setupVisibilityHandlers() {
    // Clean up any existing listeners
    if (this.visibilityCleanup) {
      this.visibilityCleanup();
    }

    // Set up new listeners
    const cleanupWakeup = pageVisibility.onVisible(() => {
      console.log("[websocket]: Page became visible");

      // Resume heartbeat to save resources
      this.resumeHeartbeat();

      // Dispatch recovery to all observers (like Flowus)
      this.dispatchRecover();

      // If disconnected and not manually disconnected, try to reconnect
      if (this.status === WebsocketStatus.DISCONNECTED && this.disconnectReason !== DisconnectReason.CLIENT_DISCONNECT) {
        console.log("[websocket]: Attempting reconnection after page became visible");
        this.reconnect();
      }
    });

    const cleanupHidden = pageVisibility.onHidden(() => {
      console.log("[websocket]: Page became hidden");

      // Pause heartbeat to save resources (but keep connection alive!)
      this.pauseHeartbeat();

      // Note: We do NOT disconnect! Connection stays alive to receive events.
      // This prevents missing important updates like new members, permission changes, etc.
    });

    // Store cleanup function
    this.visibilityCleanup = () => {
      cleanupWakeup();
      cleanupHidden();
    };
  }

  // Setup basic Socket.IO events
  private setupSocketEvents() {
    if (!this.socket) return;

    // Socket.IO built-in events
    this.socket.on("disconnect", this.handleSocketDisconnect.bind(this));

    this.socket.on("error", (error) => {
      console.error("[websocket]: Socket.IO error:", error);
      this.setStatus(WebsocketStatus.ERROR, DisconnectReason.ERROR);
      this.socket?.emit("error", new WebsocketError("SOCKET_ERROR", error.message, error));
    });

    // Authentication events
    this.socket.on(SocketEvents.AUTH_SUCCESS, (message: GatewayMessage) => {
      console.log(`[websocket]: Received event ${SocketEvents.AUTH_SUCCESS}:`, message);
      if (this.socket) {
        this.socket.authenticated = true;
        this.setStatus(WebsocketStatus.CONNECTED);
        this.connectionPromise.resolve();

        // Join user's room after successful authentication
        const userId = message.data?.userId;
        if (userId) {
          this.joinRoom(`user:${userId}`);
        }
      }
    });

    this.socket.on(SocketEvents.AUTH_FAILED, (message: GatewayMessage) => {
      console.log(`[websocket]: Received event ${SocketEvents.AUTH_FAILED}:`, message);
      this.socket?.disconnect();
      this.setStatus(WebsocketStatus.ERROR, DisconnectReason.AUTH_FAILED);
    });

    // Gateway connection events
    this.socket.on(SocketEvents.GATEWAY_CONNECT, (message: GatewayMessage) => {
      console.log(`[websocket]: Received event ${SocketEvents.GATEWAY_CONNECT}:`, message);
    });

    this.socket.on(SocketEvents.GATEWAY_DISCONNECT, (message: GatewayMessage) => {
      console.log(`[websocket]: Received event ${SocketEvents.GATEWAY_DISCONNECT}:`, message);
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

  // Public API methods
  getStatus = () => this.status;
  getDisconnectReason = () => this.disconnectReason;
  isConnected = () => this.status === WebsocketStatus.CONNECTED;
  waitForConnection = () => this.connectionPromise;
}

// Export singleton instance

let websocketService: WebsocketService | null = null;
export const getWebsocketService = () => {
  if (!websocketService) {
    websocketService = new WebsocketService();
  }
  return websocketService;
};
