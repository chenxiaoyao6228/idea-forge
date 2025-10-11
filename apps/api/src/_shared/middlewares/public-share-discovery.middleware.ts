import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { PublicShareService } from "@/public-share/public-share.service";
import { extractDocumentIdFromPath } from "@/_shared/utils/document-validators";

/**
 * Middleware for Smart Share Link Discovery
 *
 * Detects when unauthenticated users access workspace/document URLs
 * and automatically redirects them to the public share URL if one exists.
 *
 * Handles URL patterns:
 * - Direct document ID: /:docId
 * - Workspace document: /workspace/:workspaceId/doc/:docId
 */
@Injectable()
export class PublicShareDiscoveryMiddleware implements NestMiddleware {
  constructor(private readonly publicShareService: PublicShareService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Skip if user has authentication token
      // Just check existence - JwtAuthGuard will validate it later
      // If token exists (even if expired), user is trying to authenticate, so don't redirect
      const accessToken = req.cookies?.accessToken;
      if (accessToken) {
        return next();
      }

      // Skip API routes and share routes
      if (req.path.startsWith("/api/") || req.path.startsWith("/share/")) {
        return next();
      }

      // Extract document ID from URL path
      const documentId = extractDocumentIdFromPath(req.path);

      if (!documentId) {
        // No valid document ID found, continue to next middleware
        return next();
      }

      // Check if an active public share exists for this document
      const publicShare = await this.publicShareService.findByDocId(documentId);

      if (!publicShare) {
        // No public share found, let client handle (will show login page)
        return next();
      }

      // Redirect to public share URL with discovery flag
      const shareUrl = `/share/${publicShare.token}?discovered=true`;
      return res.redirect(302, shareUrl);
    } catch (error) {
      // On any error, fail gracefully and continue to next middleware
      // This ensures the middleware doesn't break the application
      return next();
    }
  }
}
