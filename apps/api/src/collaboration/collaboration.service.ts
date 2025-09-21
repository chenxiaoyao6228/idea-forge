import { Injectable, OnModuleInit, UnauthorizedException } from "@nestjs/common";
import { Hocuspocus } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { Throttle } from "@hocuspocus/extension-throttle";
import { Logger } from "@hocuspocus/extension-logger";
import { ConfigService } from "@nestjs/config";
import { UserService } from "@/user/user.service";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { PermissionLevel } from "@idea/contracts";
import { PermissionContextService } from "@/permission/permission-context.service";
import { PermissionWebsocketService } from "@/permission/permission-websocket.service";
import { ResourceType } from "@prisma/client";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const COLLAB_TOKEN_EXPIRATION_TIME = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CollabTokenPayload {
  userId: string;
  exp: number;
}

@Injectable()
export class CollaborationService implements OnModuleInit {
  private hocuspocus: Hocuspocus;
  private readonly algorithm = "aes-256-gcm";
  private readonly secretKey: Buffer;

  constructor(
    private readonly prismaService: PrismaService,
    private configService: ConfigService,
    private userService: UserService,
    private readonly permissionContextService: PermissionContextService,
    private readonly permissionWebsocketService: PermissionWebsocketService,
  ) {
    const secret = this.configService.get("COLLAB_SECRET_KEY");
    this.secretKey = createHash("sha256").update(secret).digest();
  }

  // Check document access and permissions using the unified permission system
  private async validateDocumentAccess(
    documentId: string,
    userId: string,
  ): Promise<{
    permission: PermissionLevel;
    canCollaborate: boolean;
  }> {
    // Use the unified permission context service
    const permissionContext = await this.permissionContextService.getPermissionContext(userId, ResourceType.DOCUMENT, documentId);

    // Check if user has at least READ permission to collaborate
    const canCollaborate = permissionContext.permission !== PermissionLevel.NONE;

    if (!canCollaborate) {
      throw new UnauthorizedException(`User ${userId} does not have access to document ${documentId}`);
    }

    // Get document info for additional validation
    const doc = await this.prismaService.doc.findUnique({
      where: { id: documentId },
      select: { id: true, deletedAt: true, archivedAt: true },
    });

    if (!doc) {
      throw new UnauthorizedException("Document not found");
    }

    // Check if document is deleted or archived
    if (doc.deletedAt) {
      throw new UnauthorizedException("Document has been deleted");
    }

    if (doc.archivedAt) {
      throw new UnauthorizedException("Document has been archived");
    }

    return {
      permission: permissionContext.permission,
      canCollaborate,
    };
  }

  async generateCollabToken(userId: string): Promise<string> {
    const payload: CollabTokenPayload = {
      userId,
      exp: Date.now() + COLLAB_TOKEN_EXPIRATION_TIME,
    };

    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.secretKey, iv);

    const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);

    const authTag = cipher.getAuthTag();

    const token = Buffer.concat([iv, authTag, encrypted]).toString("base64");
    return token;
  }

  private async verifyCollabToken(token: string) {
    try {
      const tokenBuffer = Buffer.from(token, "base64");

      const iv = tokenBuffer.subarray(0, 12);
      const authTag = tokenBuffer.subarray(12, 28);
      const encrypted = tokenBuffer.subarray(28);

      const decipher = createDecipheriv(this.algorithm, this.secretKey, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

      const payload: CollabTokenPayload = JSON.parse(decrypted.toString());

      if (payload.exp < Date.now()) {
        throw new UnauthorizedException("Token has expired");
      }

      return payload.userId;
    } catch (error) {
      throw new UnauthorizedException("Invalid collaboration token");
    }
  }

  /**
   * Handle permission changes for users currently collaborating
   * Called when permissions are updated during active collaboration
   */
  async handleCollaborationPermissionChange(documentId: string, userId: string, newPermission: PermissionLevel, actorId: string): Promise<void> {
    try {
      // Check if user is currently connected to this document
      const isConnected = await this.isUserConnectedToDocument(userId, documentId);

      if (!isConnected) {
        console.log(`User ${userId} not connected to document ${documentId}, skipping collaboration handling`);
        return;
      }

      // If access is completely revoked, disconnect the user
      if (newPermission === PermissionLevel.NONE) {
        await this.disconnectUserFromDocument(userId, documentId);
        console.log(`User ${userId} disconnected from document ${documentId} due to access revocation`);
      } else {
        // Update the user's collaboration context with new permission
        await this.updateUserCollaborationContext(userId, documentId, newPermission);
        console.log(`User ${userId} collaboration context updated for document ${documentId}: ${newPermission}`);
      }

      // Notify via WebSocket about the permission change
      await this.permissionWebsocketService.handleCollaborationPermissionChange(
        userId,
        documentId,
        PermissionLevel.READ, // We don't track old permission in this context
        newPermission,
        actorId,
      );
    } catch (error) {
      console.error(`Error handling collaboration permission change:`, error);
    }
  }

  /**
   * Check if user is currently connected to a document collaboration session
   */
  private async isUserConnectedToDocument(userId: string, documentId: string): Promise<boolean> {
    try {
      // This would check active Hocuspocus connections
      // For now, we'll implement a placeholder
      // In a real implementation, you might:
      // 1. Check active WebSocket connections
      // 2. Query Hocuspocus for active connections
      // 3. Check a Redis cache of active sessions

      return false; // Placeholder - implement based on your needs
    } catch (error) {
      console.error(`Error checking user connection status:`, error);
      return false;
    }
  }

  /**
   * Disconnect user from document collaboration
   */
  private async disconnectUserFromDocument(userId: string, documentId: string): Promise<void> {
    try {
      // This would forcefully disconnect the user from the Hocuspocus session
      // Implementation depends on your WebSocket infrastructure
      console.log(`Disconnecting user ${userId} from document ${documentId}`);

      // You might implement this by:
      // 1. Finding the WebSocket connection
      // 2. Sending a disconnect message
      // 3. Closing the connection
    } catch (error) {
      console.error(`Error disconnecting user from document:`, error);
    }
  }

  /**
   * Update user's collaboration context with new permission level
   */
  private async updateUserCollaborationContext(userId: string, documentId: string, newPermission: PermissionLevel): Promise<void> {
    try {
      // This would update the user's collaboration context
      // For example, updating what operations they can perform
      console.log(`Updating collaboration context for user ${userId} on document ${documentId}: ${newPermission}`);

      // You might implement this by:
      // 1. Updating the user's session data
      // 2. Sending updated capabilities to the client
      // 3. Updating awareness information
    } catch (error) {
      console.error(`Error updating user collaboration context:`, error);
    }
  }

  /**
   * Validate permission for specific collaboration operations
   */
  async validateCollaborationOperation(userId: string, documentId: string, operation: "READ" | "EDIT" | "COMMENT"): Promise<boolean> {
    try {
      const permissionContext = await this.permissionContextService.getPermissionContext(userId, ResourceType.DOCUMENT, documentId);

      // Map collaboration operations to required permission levels
      const requiredPermissions = {
        READ: [PermissionLevel.READ, PermissionLevel.COMMENT, PermissionLevel.EDIT, PermissionLevel.MANAGE, PermissionLevel.OWNER],
        COMMENT: [PermissionLevel.COMMENT, PermissionLevel.EDIT, PermissionLevel.MANAGE, PermissionLevel.OWNER],
        EDIT: [PermissionLevel.EDIT, PermissionLevel.MANAGE, PermissionLevel.OWNER],
      };

      return requiredPermissions[operation].includes(permissionContext.permission as any);
    } catch (error) {
      console.error(`Error validating collaboration operation:`, error);
      return false;
    }
  }

  async onModuleInit() {
    // Bind methods to instance to preserve 'this' context
    const validateToken = async (token: string) => {
      return await this.verifyCollabToken(token);
    };

    const validateAccess = async (documentId: string, userId: string) => {
      return await this.validateDocumentAccess(documentId, userId);
    };

    const getUserById = async (userId: string) => {
      return await this.userService.getUserById(userId);
    };

    this.hocuspocus = new Hocuspocus({
      name: "/collaboration",
      port: this.configService.get("NEST_API_WS_PORT"),
      debounce: 5000,
      maxDebounce: 30000,
      quiet: true,
      async onConnect(data) {
        // await delay(100000);
        return data;
      },
      async onRequest(data) {
        // await delay(1000);
        return data;
      },

      async onAuthenticate({ token, documentName }) {
        try {
          // 1. Validate JWT token
          const userId = await validateToken(token);

          // 2. Get user info
          const user = await getUserById(userId);
          if (!user) {
            throw new UnauthorizedException("User not found");
          }

          // 3. Validate document access
          const access = await validateAccess(documentName, user.id);

          // 4. Return only permission info
          // We don't need to return user info as it will be handled by awareness
          return {
            permission: access.permission,
          };
        } catch (err: any) {
          throw new UnauthorizedException(err.message || "Authentication failed");
        }
      },

      extensions: [
        new Logger(),
        new Throttle({
          throttle: 15,
          banTime: 5,
        }),
        new Database({
          fetch: async ({ documentName }) => {
            // await delay(100000);
            const doc = await this.prismaService.doc.findUnique({
              where: { id: documentName },
              select: { contentBinary: true },
            });
            return doc?.contentBinary ? new Uint8Array(doc.contentBinary) : null;
          },
          store: async ({ documentName, document, state }) => {
            /**
             * Why we need to convert to json?
             * 1. global text search in postgres
             * 2. duplicate document, first load content from postgres
             */
            const json = TiptapTransformer.fromYdoc(document, "default");
            const jsonStr = JSON.stringify(json);

            await this.prismaService.doc.update({
              where: { id: documentName },
              data: { contentBinary: state, content: jsonStr },
            });
          },
        }),
      ],
    });

    await this.hocuspocus.listen();
  }
}
