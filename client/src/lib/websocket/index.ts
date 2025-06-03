import { io, Socket } from "socket.io-client";
import { resolvablePromise } from "../async";
import useSubSpaceStore from "@/stores/subspace";
import useDocumentStore from "@/stores/document";

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
enum SocketEvents {
  // Basic connection events
  GATEWAY_CONNECT = "gateway.connect",
  GATEWAY_DISCONNECT = "gateway.disconnect",
  AUTH_FAILED = "auth.failed",
  AUTH_SUCCESS = "auth.success",

  // Business events
  SUBSPACE_CREATE = "subspace.create",
  SUBSPACE_UPDATE = "subspace.update",
  SUBSPACE_MOVE = "subspace.move",
  JOIN = "join",
  JOIN_SUCCESS = "join.success",
  JOIN_ERROR = "join.error",
  ENTITIES = "entities",
  DOCUMENT_UPDATE = "document.update",
}

// Interface for entities event data structure
interface WebsocketEntitiesEvent {
  fetchIfMissing?: boolean;
  documentIds: { id: string; updatedAt?: string }[];
  subspaceIds: { id: string; updatedAt?: string }[];
  workspaceIds: string[];
  event: string;
}

// Interface for gateway message structure
interface GatewayMessage {
  name: string;
  [key: string]: any;
}

// Main WebSocket service class
class WebsocketService {
  private socket: SocketWithAuthentication | null = null;
  private status: WebsocketStatus = WebsocketStatus.DISCONNECTED;
  private disconnectReason: DisconnectReason = DisconnectReason.NORMAL;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private connectionPromise = resolvablePromise();
  private joinedRooms = new Set<string>();

  // Update connection status and emit status change event
  private setStatus(status: WebsocketStatus, reason?: DisconnectReason) {
    this.status = status;
    if (reason) this.disconnectReason = reason;
    this.socket?.emit("status_change", { status, reason });
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

  // Handle reconnection with exponential backoff
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

  // Disconnect WebSocket connection
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.setStatus(WebsocketStatus.DISCONNECTED, DisconnectReason.CLIENT_DISCONNECT);
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

    // Gateway connection events
    this.socket.on(SocketEvents.GATEWAY_CONNECT, (message: GatewayMessage) => {
      console.log("[websocket]: Connected to realtime gateway:", message.data);
    });

    this.socket.on(SocketEvents.GATEWAY_DISCONNECT, (message: GatewayMessage) => {
      console.log("[websocket]: Disconnected from realtime gateway:", message.data);
    });
  }

  // Setup business-specific event handlers
  private setupBusinessEvents() {
    if (!this.socket) return;

    // Handle entities updates (documents and subspaces)
    this.socket.on(SocketEvents.ENTITIES, async (message: GatewayMessage) => {
      const { name, documentIds, subspaceIds, fetchIfMissing } = message;

      const documentStore = useDocumentStore.getState();
      const subspaceStore = useSubSpaceStore.getState();

      // Handle document updates
      if (documentIds?.length > 0) {
        for (const documentDescriptor of documentIds) {
          const documentId = documentDescriptor.id;
          const localDocument = documentStore.entities[documentId];
          const previousTitle = localDocument?.title;

          // Skip if document is already up to date
          if (localDocument?.updatedAt === documentDescriptor.updatedAt) {
            continue;
          }

          // Skip if document doesn't exist locally and we don't need to fetch missing documents
          if (!localDocument && !fetchIfMissing) {
            continue;
          }

          // Force fetch the latest version
          try {
            await documentStore.fetchDetail(documentId, { force: true });
            const updatedDocument = documentStore.entities[documentId];

            // If title has changed, update the collection as well
            if (updatedDocument && previousTitle !== updatedDocument.title) {
              if (updatedDocument.subspaceId) {
                await subspaceStore.fetchNavigationTree(updatedDocument.subspaceId, { force: true });
              }
            }
          } catch (err: any) {
            // Remove from local store if fetch fails (due to permissions or non-existence)
            if (err.status === 404 || err.status === 403) {
              documentStore.removeOne(documentId);
            }
          }
        }
      }

      // Handle subspace updates
      if (subspaceIds?.length > 0) {
        for (const subspaceDescriptor of subspaceIds) {
          const subspaceId = subspaceDescriptor.id;
          const localSubspace = subspaceStore.entities[subspaceId];

          // Skip if subspace is already up to date
          if (localSubspace?.updatedAt === subspaceDescriptor.updatedAt) {
            continue;
          }

          // Skip if subspace doesn't exist locally and we don't need to fetch missing subspaces
          if (!localSubspace && !fetchIfMissing) {
            continue;
          }

          try {
            // Force refresh the subspace's document structure
            await subspaceStore.fetchNavigationTree(subspaceId, { force: true });
          } catch (err: any) {
            // Remove from local store if fetch fails (due to permissions or non-existence)
            if (err.status === 404 || err.status === 403) {
              subspaceStore.removeOne(subspaceId);
            }
          }
        }
      }
    });

    // Handle subspace creation
    this.socket.on(SocketEvents.SUBSPACE_CREATE, (message: GatewayMessage) => {
      const { name, subspace } = message;
      if (!subspace) return;

      const store = useSubSpaceStore.getState();
      store.addOne({
        ...subspace,
        updatedAt: new Date(subspace.updatedAt),
        createdAt: new Date(subspace.createdAt),
      });
    });

    // Handle subspace movement
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

    // Handle subspace updates
    this.socket.on(SocketEvents.SUBSPACE_UPDATE, (message: GatewayMessage) => {
      const { name, subspace } = message;
      if (!subspace) return;

      const store = useSubSpaceStore.getState();
      store.updateOne({
        id: subspace.id,
        changes: {
          ...subspace,
          updatedAt: new Date(subspace.updatedAt),
          navigationTree: subspace.navigationTree || [],
        },
      });
    });

    // Handle document creation
    this.socket.on(SocketEvents.DOCUMENT_UPDATE, (message: GatewayMessage) => {
      const { name, document, subspaceId } = message;
      if (!document) return;

      useDocumentStore.getState().updateDocument(document);

      if (subspaceId) {
        useSubSpaceStore.getState().updateDocument(subspaceId, document.id, document);
      }
    });

    // Handle room joining events
    this.socket.on(SocketEvents.JOIN, (message: GatewayMessage) => {
      const { name, subspaceId } = message;
      if (!subspaceId) return;

      // Handle join events for new subspaces
      if (name === "subspace.create" && subspaceId) {
        const roomId = `subspace:${subspaceId}`;
        if (!this.joinedRooms.has(roomId)) {
          this.joinRoom(roomId);
        }
      }
    });

    // Handle successful room joining
    this.socket.on(SocketEvents.JOIN_SUCCESS, (message: GatewayMessage) => {
      const { name, roomId } = message;
      if (!roomId) return;

      this.joinedRooms.add(roomId);
      console.log(`[websocket]: Successfully joined room: ${roomId}`);
    });

    // Handle room joining errors
    this.socket.on(SocketEvents.JOIN_ERROR, (message: GatewayMessage) => {
      const { name, roomId, error } = message;
      if (!roomId) return;
      console.error(`[websocket]: Failed to join room: ${roomId}`, error);
      this.joinedRooms.delete(roomId);
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
export const websocketService = new WebsocketService();
