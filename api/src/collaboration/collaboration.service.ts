import { Injectable, OnModuleInit, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Hocuspocus } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { Throttle } from "@hocuspocus/extension-throttle";
import { Logger } from "@hocuspocus/extension-logger";
import { PrismaService } from "../_shared/database/prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { UserService } from "@/user/user.service";
import { Permission } from "shared";
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const COLLAB_TOKEN_EXPIRATION_TIME = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CollabTokenPayload {
  userId: number;
  exp: number;
}

@Injectable()
export class CollaborationService implements OnModuleInit {
  private hocuspocus: Hocuspocus;
  private readonly algorithm = "aes-256-gcm";
  private readonly secretKey: Buffer;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private userService: UserService,
  ) {
    const secret = this.configService.get("COLLAB_SECRET_KEY") || "your-secure-collaboration-secret-key-32";
    this.secretKey = createHash("sha256").update(secret).digest();
  }

  // Check document access and permissions
  private async validateDocumentAccess(
    documentId: string,
    userId: number,
  ): Promise<{
    permission: Permission;
  }> {
    // 1. Check if user is the owner
    const doc = await this.prisma.doc.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new UnauthorizedException("Document not found");
    }

    // Return owner permission if user is the owner
    if (doc.ownerId === userId) {
      return { permission: "EDIT" };
    }

    // 2. Check shared permissions
    const share = await this.prisma.docShare.findFirst({
      where: {
        docId: documentId,
        userId: userId,
      },
    });

    if (!share) {
      throw new UnauthorizedException("No access to this document");
    }

    return { permission: share.permission as Permission };
  }

  async generateCollabToken(userId: number): Promise<string> {
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

  private async verifyCollabToken(token: string): Promise<number> {
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

  async onModuleInit() {
    // Bind methods to instance to preserve 'this' context
    const validateToken = async (token: string) => {
      return await this.verifyCollabToken(token);
    };

    const validateAccess = async (documentId: string, userId: number) => {
      return await this.validateDocumentAccess(documentId, userId);
    };

    const getUserById = async (userId: number) => {
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
            const doc = await this.prisma.doc.findUnique({
              where: { id: documentName },
              select: { contentBinary: true },
            });
            return doc?.contentBinary ? new Uint8Array(doc.contentBinary) : null;
          },
          store: async ({ documentName, state }) => {
            await this.prisma.doc.update({
              where: { id: documentName },
              data: { contentBinary: state },
            });
          },
        }),
      ],
    });

    await this.hocuspocus.listen();
  }
}
