import { io, Socket } from "socket.io-client";
import { throttle } from "lodash-es";
import { resolvablePromise } from "./async";
import { pageVisibility } from "./page-visibility";
import { networkStatus } from "./network-status";

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
  MAX_RETRIES = "max_retries",
  HEARTBEAT_TIMEOUT = "heartbeat_timeout",
}

/**
 * WebSocket error codes for categorizing different failure types
 *
 * These codes provide type-safe error identification and enable
 * better error handling, logging, and user feedback.
 */
enum WebSocketErrorCode {
  // Connection errors
  CONNECTION_TIMEOUT = "CONNECTION_TIMEOUT",
  CONNECTION_ERROR = "CONNECTION_ERROR",
  CONNECTION_FAILED = "CONNECTION_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",

  // Reconnection errors
  MAX_RECONNECT_ATTEMPTS = "MAX_RECONNECT_ATTEMPTS",
  RECONNECT_FAILED = "RECONNECT_FAILED",

  // Authentication errors
  AUTH_FAILED = "AUTH_FAILED",
  AUTH_TIMEOUT = "AUTH_TIMEOUT",

  // Room errors
  ROOM_JOIN_FAILED = "ROOM_JOIN_FAILED",
  ROOM_LEAVE_FAILED = "ROOM_LEAVE_FAILED",
  ROOM_NOT_FOUND = "ROOM_NOT_FOUND",

  // Socket errors
  SOCKET_ERROR = "SOCKET_ERROR",
  SOCKET_DISCONNECTED = "SOCKET_DISCONNECTED",

  // Server errors
  SERVER_ERROR = "SERVER_ERROR",
  SERVER_DISCONNECT = "SERVER_DISCONNECT",

  // Client errors
  CLIENT_DISCONNECT = "CLIENT_DISCONNECT",
  INVALID_STATE = "INVALID_STATE",
}

/**
 * Error category for grouping related error types
 */
enum ErrorCategory {
  CONNECTION = "connection",
  AUTHENTICATION = "auth",
  ROOM = "room",
  NETWORK = "network",
  SERVER = "server",
  CLIENT = "client",
}

/**
 * Enhanced WebSocket error with categorization and metadata
 *
 * Provides structured error information including timestamps,
 * retry recommendations, and user-friendly messages.
 *
 * @example
 * ```ts
 * const error = new WebsocketError(
 *   WebSocketErrorCode.AUTH_FAILED,
 *   "Invalid credentials",
 *   { retryable: false, userMessage: "Please sign in again" }
 * );
 *
 * if (error.retryable) {
 *   // Attempt retry
 * } else {
 *   // Show user message
 *   toast.error(error.userMessage);
 * }
 * ```
 */
class WebsocketError extends Error {
  public readonly timestamp: number;
  public readonly category: ErrorCategory;
  public readonly retryable: boolean;
  public readonly userMessage: string;
  public readonly shouldNotifyUser: boolean;
  public readonly data?: any;

  constructor(
    public readonly code: WebSocketErrorCode,
    message: string,
    options?: {
      data?: any;
      category?: ErrorCategory;
      retryable?: boolean;
      userMessage?: string;
      shouldNotifyUser?: boolean;
    },
  ) {
    super(message);
    this.name = "WebsocketError";
    this.timestamp = Date.now();
    this.data = options?.data;

    // Auto-determine category from code if not provided
    this.category = options?.category ?? this.getCategoryFromCode(code);

    // Auto-determine retryable from code if not provided
    this.retryable = options?.retryable ?? this.isCodeRetryable(code);

    // User-friendly message
    this.userMessage = options?.userMessage ?? this.getDefaultUserMessage(code);

    // Auto-determine whether to notify user from code if not provided
    this.shouldNotifyUser = options?.shouldNotifyUser ?? this.shouldCodeNotifyUser(code);
  }

  private getCategoryFromCode(code: WebSocketErrorCode): ErrorCategory {
    if (code.includes("AUTH")) return ErrorCategory.AUTHENTICATION;
    if (code.includes("ROOM")) return ErrorCategory.ROOM;
    if (code.includes("NETWORK")) return ErrorCategory.NETWORK;
    if (code.includes("SERVER")) return ErrorCategory.SERVER;
    if (code.includes("CLIENT")) return ErrorCategory.CLIENT;
    return ErrorCategory.CONNECTION;
  }

  private isCodeRetryable(code: WebSocketErrorCode): boolean {
    const nonRetryable = [
      WebSocketErrorCode.AUTH_FAILED,
      WebSocketErrorCode.MAX_RECONNECT_ATTEMPTS,
      WebSocketErrorCode.CLIENT_DISCONNECT,
      WebSocketErrorCode.INVALID_STATE,
    ];
    return !nonRetryable.includes(code);
  }

  private shouldCodeNotifyUser(code: WebSocketErrorCode): boolean {
    // Only notify user for critical errors that require user attention
    const userFacingErrors = [
      WebSocketErrorCode.AUTH_FAILED, // User needs to sign in again
      WebSocketErrorCode.MAX_RECONNECT_ATTEMPTS, // User should know connection failed
      WebSocketErrorCode.AUTH_TIMEOUT, // User might need to refresh
    ];
    return userFacingErrors.includes(code);
  }

  private getDefaultUserMessage(code: WebSocketErrorCode): string {
    const messages: Record<WebSocketErrorCode, string> = {
      [WebSocketErrorCode.CONNECTION_TIMEOUT]: "Connection timed out. Please check your internet connection.",
      [WebSocketErrorCode.CONNECTION_ERROR]: "Unable to connect to the server.",
      [WebSocketErrorCode.CONNECTION_FAILED]: "Connection failed. Please try again.",
      [WebSocketErrorCode.NETWORK_ERROR]: "Network error occurred. Please check your internet connection.",
      [WebSocketErrorCode.MAX_RECONNECT_ATTEMPTS]: "Unable to reconnect after multiple attempts.",
      [WebSocketErrorCode.RECONNECT_FAILED]: "Reconnection failed. Please refresh the page.",
      [WebSocketErrorCode.AUTH_FAILED]: "Authentication failed. Please sign in again.",
      [WebSocketErrorCode.AUTH_TIMEOUT]: "Authentication timed out. Please try again.",
      [WebSocketErrorCode.ROOM_JOIN_FAILED]: "Failed to join room.",
      [WebSocketErrorCode.ROOM_LEAVE_FAILED]: "Failed to leave room.",
      [WebSocketErrorCode.ROOM_NOT_FOUND]: "Room not found.",
      [WebSocketErrorCode.SOCKET_ERROR]: "WebSocket error occurred.",
      [WebSocketErrorCode.SOCKET_DISCONNECTED]: "Connection was lost.",
      [WebSocketErrorCode.SERVER_ERROR]: "Server error occurred.",
      [WebSocketErrorCode.SERVER_DISCONNECT]: "Server disconnected the connection.",
      [WebSocketErrorCode.CLIENT_DISCONNECT]: "Disconnected.",
      [WebSocketErrorCode.INVALID_STATE]: "Invalid connection state.",
    };
    return messages[code] || "An error occurred.";
  }

  /**
   * Convert error to JSON for logging and debugging
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      category: this.category,
      retryable: this.retryable,
      shouldNotifyUser: this.shouldNotifyUser,
      timestamp: this.timestamp,
      data: this.data,
    };
  }

  /**
   * Get a formatted string representation of the error
   */
  toString(): string {
    return `[${this.code}] ${this.message}`;
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
  private maxReconnectAttempts = 10; // Increased from 5 to 10
  private reconnectDelay = 1000;
  private maxReconnectDelay = 60000; // Cap backoff at 60 seconds
  private connectionPromise = resolvablePromise();
  private joinedRooms = new Set<string>();
  private visibilityCleanup: (() => void) | null = null;

  // Recovery observer pattern
  private recoveryObservers = new Set<() => void>();

  // Error tracking
  private lastError: WebsocketError | null = null;

  // Subscription throttling - batch join/leave operations to prevent overwhelming server
  private pendingJoins = new Set<string>();
  private pendingLeaves = new Set<string>();

  // Update connection status and emit status change event
  private setStatus(status: WebsocketStatus, reason?: DisconnectReason) {
    this.status = status;
    if (reason) this.disconnectReason = reason;
    this.socket?.emit("status_change", { status, reason });
  }

  // Wait for page to be visible before attempting connection
  private async waitForPageVisible(): Promise<void> {
    if (!pageVisibility.isVisible()) {
      console.log("[websocket]: Page is hidden, waiting for visibility...");
      await pageVisibility.waitUntilVisible();
      console.log("[websocket]: Page became visible, proceeding with connection");
    }
  }

  // Wait for network to be online before attempting connection
  private async waitForNetworkOnline(): Promise<void> {
    if (!networkStatus.isOnline) {
      console.log("[websocket]: Network is offline, waiting for connection...");
      await networkStatus.waitUntilOnline();
      console.log("[websocket]: Network is online, proceeding with connection");
    }
  }

  // Recovery observer pattern
  subscribeToRecovery(callback: () => void): () => void {
    this.recoveryObservers.add(callback);
    console.log(`[websocket]: Recovery observer added (total: ${this.recoveryObservers.size})`);

    return () => {
      this.recoveryObservers.delete(callback);
      console.log(`[websocket]: Recovery observer removed (total: ${this.recoveryObservers.size})`);
    };
  }

  // Dispatch recovery to all observers (throttled to 1500ms)
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

  /**
   * Commit pending room operations (throttled to 500ms)
   * Batches multiple join/leave requests to prevent overwhelming the server
   */
  private commitRoomOperations = throttle(
    () => {
      if (!this.socket?.connected) {
        console.warn("[websocket]: Cannot commit room operations, socket not connected");
        return;
      }

      // Process pending joins
      if (this.pendingJoins.size > 0) {
        const roomsToJoin = Array.from(this.pendingJoins);
        console.log(`[websocket]: Batching ${roomsToJoin.length} join operations`);

        roomsToJoin.forEach((roomId) => {
          console.log(`[websocket]: Joining room: ${roomId}`);
          this.socket?.emit("join", { roomId });
        });

        this.pendingJoins.clear();
      }

      // Process pending leaves
      if (this.pendingLeaves.size > 0) {
        const roomsToLeave = Array.from(this.pendingLeaves);
        console.log(`[websocket]: Batching ${roomsToLeave.length} leave operations`);

        roomsToLeave.forEach((roomId) => {
          console.log(`[websocket]: Leaving room: ${roomId}`);
          this.socket?.emit("leave", { roomId });
          this.joinedRooms.delete(roomId);
        });

        this.pendingLeaves.clear();
      }
    },
    500,
    {
      leading: false,
      trailing: true,
    },
  );

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
        timeoutPromise.reject(this.createError(WebSocketErrorCode.CONNECTION_TIMEOUT, "Connection timeout after 10s"));
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
        const wsError = this.createError(WebSocketErrorCode.CONNECTION_ERROR, error.message, { data: error });
        this.setStatus(WebsocketStatus.ERROR, DisconnectReason.NETWORK_ERROR);
        this.socket?.emit("error", wsError);
        timeoutPromise.reject(wsError);
      });

      return timeoutPromise;
    } catch (error: any) {
      const wsError = error instanceof WebsocketError ? error : this.createError(WebSocketErrorCode.CONNECTION_FAILED, error.message, { data: error });
      this.setStatus(WebsocketStatus.ERROR, DisconnectReason.ERROR);
      this.socket?.emit("error", wsError);
      throw wsError;
    }
  }

  // Handle reconnection with exponential backoff and jitter
  private async reconnect() {
    // Wait for both page visibility and network connectivity before attempting reconnection
    await this.waitForPageVisible();
    await this.waitForNetworkOnline();

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      const error = this.createError(WebSocketErrorCode.MAX_RECONNECT_ATTEMPTS, `Maximum reconnection attempts (${this.maxReconnectAttempts}) reached`);
      this.socket?.emit("error", error);
      this.setStatus(WebsocketStatus.ERROR, DisconnectReason.MAX_RETRIES); // Updated to use new disconnect reason
      return;
    }

    this.setStatus(WebsocketStatus.RECONNECTING);
    this.reconnectAttempts++;

    try {
      await this.connect();
      this.socket?.emit("reconnect");

      // Rejoin all previously joined rooms after successful reconnection
      this.rejoinRooms();

      // Dispatch recovery after successful reconnection
      this.dispatchRecover();
    } catch (error) {
      // Exponential backoff with cap and jitter
      const exponentialDelay = this.reconnectDelay * 2 ** (this.reconnectAttempts - 1);
      const cappedDelay = Math.min(exponentialDelay, this.maxReconnectDelay);
      // Add jitter (±25%) to prevent thundering herd
      const jitter = cappedDelay * 0.25 * (Math.random() - 0.5);
      const delay = Math.max(1000, cappedDelay + jitter);

      console.log(`[websocket]: Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
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

      // Note: We do NOT disconnect! Connection stays alive to receive events.
      // This prevents missing important updates like new members, permission changes, etc.
    });

    // Listen to network status changes
    const cleanupNetworkOnline = networkStatus.onOnline(() => {
      console.log("[websocket]: Network came back online");

      // Dispatch recovery to all observers (like Flowus)
      this.dispatchRecover();

      // If disconnected due to network error, try to reconnect
      if (this.status === WebsocketStatus.DISCONNECTED && this.disconnectReason === DisconnectReason.NETWORK_ERROR && pageVisibility.isVisible()) {
        console.log("[websocket]: Attempting reconnection after network came back online");
        this.reconnect();
      }
    });

    const cleanupNetworkOffline = networkStatus.onOffline(() => {
      console.log("[websocket]: Network went offline");
      // Just log for now - connection will fail naturally and trigger reconnect logic
    });

    // Store cleanup function
    this.visibilityCleanup = () => {
      cleanupWakeup();
      cleanupHidden();
      cleanupNetworkOnline();
      cleanupNetworkOffline();
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
      this.socket?.emit("error", this.createError(WebSocketErrorCode.SOCKET_ERROR, error.message, { data: error }));
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

    // Room join/leave events
    this.socket.on(SocketEvents.JOIN_SUCCESS, (message: GatewayMessage) => {
      const roomId = message.roomId || message.data?.roomId;
      if (roomId) {
        this.joinedRooms.add(roomId);
        console.log(`[websocket]: Successfully joined room: ${roomId} (total rooms: ${this.joinedRooms.size})`);
      }
    });

    this.socket.on(SocketEvents.JOIN_ERROR, (message: GatewayMessage) => {
      const roomId = message.roomId || message.data?.roomId;
      const error = message.error || message.data?.error || "Unknown error";
      console.error(`[websocket]: Failed to join room ${roomId}:`, error);
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

    // Remove from pending leaves if present
    if (this.pendingLeaves.has(roomId)) {
      this.pendingLeaves.delete(roomId);
    }

    // Add to pending joins and trigger batching
    this.pendingJoins.add(roomId);
    this.commitRoomOperations();
    // Note: Room is added to joinedRooms in JOIN_SUCCESS handler
  }

  // Rejoin all previously joined rooms after reconnection
  private rejoinRooms() {
    if (!this.socket?.connected || this.joinedRooms.size === 0) {
      return;
    }

    console.log(`[websocket]: Rejoining ${this.joinedRooms.size} rooms after reconnection`);
    const roomsToRejoin = Array.from(this.joinedRooms);

    // Clear the set and rejoin all rooms
    this.joinedRooms.clear();
    roomsToRejoin.forEach((roomId) => {
      this.joinRoom(roomId);
    });
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

    // Remove from pending joins if present
    if (this.pendingJoins.has(roomId)) {
      this.pendingJoins.delete(roomId);
    }

    // Add to pending leaves and trigger batching
    this.pendingLeaves.add(roomId);
    this.commitRoomOperations();
    // Note: Room is removed from joinedRooms in commitRoomOperations
  }

  // Helper method to check if we're in a room
  isInRoom(roomId: string): boolean {
    return this.joinedRooms.has(roomId);
  }

  // Helper method to get all joined rooms
  getJoinedRooms(): string[] {
    return Array.from(this.joinedRooms);
  }

  // Error helper methods

  /**
   * Get the last error that occurred
   * @returns The last WebsocketError or null if no error occurred
   */
  getLastError(): WebsocketError | null {
    return this.lastError;
  }

  /**
   * Helper to create and track errors
   * Creates a new WebsocketError, tracks it internally, and logs it
   *
   * @param code - The error code
   * @param message - The error message
   * @param options - Optional error options (data, category, retryable, userMessage)
   * @returns The created WebsocketError
   */
  private createError(
    code: WebSocketErrorCode,
    message: string,
    options?: {
      data?: any;
      category?: ErrorCategory;
      retryable?: boolean;
      userMessage?: string;
    },
  ): WebsocketError {
    const error = new WebsocketError(code, message, options);
    this.lastError = error;
    console.error(`[websocket]: ${error.toString()}`, error.toJSON());
    return error;
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
