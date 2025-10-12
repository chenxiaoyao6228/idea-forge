import { Injectable, BadRequestException, HttpStatus } from "@nestjs/common";
import { CreateWorkspaceDto, UpdateWorkspaceDto } from "./workspace.dto";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { SubspaceService } from "@/subspace/subspace.service";
import fractionalIndex from "fractional-index";
import { DocPermissionResolveService } from "@/permission/document-permission.service";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import {
  WorkspaceRole,
  WorkspaceMember,
  SubspaceType,
  SubspaceRole,
  WorkspaceType,
  BatchAddWorkspaceMemberRequest,
  BatchAddWorkspaceMemberResponse,
} from "@idea/contracts";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { BusinessEvents } from "@/_shared/socket/business-event.constant";
import { AbilityService } from "@/_shared/casl/casl.service";
import { ModelName } from "@casl/prisma/dist/types/prismaClientBoundTypes";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "node:crypto";

@Injectable()
export class WorkspaceService {
  // Workspace-specific timezone options
  private readonly VALID_WORKSPACE_TIMEZONES = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Kolkata",
    "Australia/Sydney",
  ];

  // Workspace-specific date format options
  private readonly VALID_WORKSPACE_DATE_FORMATS = ["YYYY/MM/DD", "MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD", "DD-MM-YYYY", "MM-DD-YYYY"] as const;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly subspaceService: SubspaceService,
    private readonly docPermissionResolveService: DocPermissionResolveService,
    private readonly eventPublisher: EventPublisherService,
    private readonly abilityService: AbilityService,
    private readonly configService: ConfigService,
  ) {}

  private readonly PUBLIC_INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  private buildPublicInviteUrl(token: string) {
    const baseUrl = this.configService.get<string>("CLIENT_APP_URL") ?? "";
    const normalized = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    return `${normalized}/public-invitation/${token}`;
  }

  private isInviteActive(invite: { revokedAt: Date | null; expiresAt: Date }) {
    if (invite.revokedAt) return false;
    return invite.expiresAt.getTime() > Date.now();
  }

  private generateInviteToken() {
    return randomBytes(18).toString("base64url");
  }

  private async upsertWorkspaceInvite(workspaceId: string, adminId: string) {
    const expiresAt = new Date(Date.now() + this.PUBLIC_INVITE_TTL_MS);
    const token = this.generateInviteToken();

    return this.prismaService.workspacePublicInvite.upsert({
      where: { workspaceId },
      update: {
        token,
        createdById: adminId,
        createdAt: new Date(),
        expiresAt,
        revokedAt: null,
      },
      create: {
        workspaceId,
        token,
        createdById: adminId,
        expiresAt,
      },
    });
  }

  /**
   * Validates workspace settings
   * Throws BadRequestException if validation fails
   */
  private validateWorkspaceSettings(settings: any): void {
    if (!settings) return; // Settings are optional

    const { timezone, dateFormat } = settings;

    if (timezone && !this.VALID_WORKSPACE_TIMEZONES.includes(timezone)) {
      throw new BadRequestException(`Invalid timezone: ${timezone}. Valid options: ${this.VALID_WORKSPACE_TIMEZONES.join(", ")}`);
    }

    if (dateFormat && !this.VALID_WORKSPACE_DATE_FORMATS.includes(dateFormat)) {
      throw new BadRequestException(`Invalid date format: ${dateFormat}. Valid options: ${this.VALID_WORKSPACE_DATE_FORMATS.join(", ")}`);
    }
  }

  /**
   * Gets default workspace settings
   */
  private getDefaultWorkspaceSettings() {
    return {
      timezone: "UTC",
      dateFormat: "YYYY/MM/DD",
    };
  }

  /**
   * Formats a date according to workspace settings
   * Useful for consistent date formatting across the workspace
   */
  formatDateForWorkspace(date: Date, workspaceSettings?: any): string {
    const settings = workspaceSettings || this.getDefaultWorkspaceSettings();
    const dateFormat = settings.dateFormat || "YYYY/MM/DD";
    const timezone = settings.timezone || "UTC";

    // Convert date to the specified timezone
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;

    // Format according to the specified format
    switch (dateFormat) {
      case "YYYY/MM/DD":
        return `${year}/${month}/${day}`;
      case "MM/DD/YYYY":
        return `${month}/${day}/${year}`;
      case "DD/MM/YYYY":
        return `${day}/${month}/${year}`;
      case "YYYY-MM-DD":
        return `${year}-${month}-${day}`;
      case "DD-MM-YYYY":
        return `${day}-${month}-${year}`;
      case "MM-DD-YYYY":
        return `${month}-${day}-${year}`;
      default:
        return `${year}/${month}/${day}`;
    }
  }

  /**
   * Create a new workspace with the user as owner
   * Automatically assigns workspace permissions and propagates to child resources
   */
  async createWorkspace(dto: CreateWorkspaceDto, userId: string) {
    // Initialize workspace with default settings
    const defaultSettings = this.getDefaultWorkspaceSettings();

    const workspace = await this.prismaService.workspace.create({
      data: {
        name: dto.name,
        description: dto.description,
        avatar: dto.avatar,
        type: dto.type || WorkspaceType.PERSONAL,
        settings: defaultSettings as any,
        members: {
          create: {
            userId: userId,
            role: WorkspaceRole.OWNER,
          },
        },
      },
    });

    // Create subspaces based on workspace type
    if (dto.type === WorkspaceType.TEAM) {
      // For team workspaces, create a default public subspace
      await this.subspaceService.createDefaultWorkspaceWideSubspace(userId, workspace.id);
    }

    // Always create personal subspace for the owner
    await this.subspaceService.createPersonalSubspace(userId, workspace.id);

    // switch to the new workspace
    await this.switchWorkspace(userId, workspace.id);

    return workspace;
  }

  /**
   * Create default workspace for new users
   * Uses user's email as workspace name
   */
  async CreateDefaultWorkspace(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    return this.createWorkspace(
      {
        name: user.email + "'s Workspace",
        description: "default workspace for user",
        avatar: "",
        type: WorkspaceType.PERSONAL,
      },
      userId,
    );
  }

  /**
   * Get all workspaces accessible to the current user
   * Returns empty array if user has no workspaces (no auto-creation)
   */
  async getUserWorkspaces(currentUserId: string): Promise<
    Array<{
      accessLevel: "member" | "guest";
      createdAt: Date;
      type: "PERSONAL" | "TEAM";
      id: string;
      updatedAt: Date;
      name: string;
      description: string | null;
      avatar: string | null;
      memberSubspaceCreate: boolean;
      settings: any;
      allowPublicSharing: boolean;
      isPendingGuest?: boolean;
      guestId?: string;
    }>
  > {
    const user = await this.prismaService.user.findUnique({
      where: { id: currentUserId },
      include: {
        workspaceMembers: {
          include: {
            workspace: true,
          },
          orderBy: [{ index: "asc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    // Get user email for guest collaborator lookup
    const userEmail = user.email;

    // Fetch guest collaborator workspaces for this user (both by userId and email)
    const guestCollaborators = await this.prismaService.guestCollaborator.findMany({
      where: {
        OR: [
          { userId: currentUserId },
          {
            email: {
              equals: userEmail,
              mode: "insensitive",
            },
          },
        ],
        status: {
          in: ["PENDING", "ACTIVE"],
        },
        expireAt: {
          gt: new Date(),
        },
      },
      include: {
        workspace: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Create a map to merge member and guest workspaces
    const workspaceMap = new Map<
      string,
      {
        workspace: any & { accessLevel: "member" | "guest" };
        accessLevel: "member" | "guest";
        isPendingGuest?: boolean;
        guestId?: string;
      }
    >();

    // Add member workspaces first (they take precedence)
    user.workspaceMembers.forEach((member) => {
      workspaceMap.set(member.workspace.id, {
        workspace: { ...member.workspace, accessLevel: "member" } as const,
        accessLevel: "member" as const,
      });
    });

    // Add guest workspaces only if not already present (member takes precedence)
    guestCollaborators.forEach((guest) => {
      if (!workspaceMap.has(guest.workspace.id)) {
        workspaceMap.set(guest.workspace.id, {
          workspace: { ...guest.workspace, accessLevel: "guest" } as const,
          accessLevel: "guest" as const,
          isPendingGuest: guest.status === "PENDING",
          guestId: guest.id,
        });
      }
    });

    // Convert map to array and sort (members first, then guests by creation date)
    const workspaces = Array.from(workspaceMap.values()).sort((a, b) => {
      // Members come first
      if (a.accessLevel === "member" && b.accessLevel === "guest") return -1;
      if (a.accessLevel === "guest" && b.accessLevel === "member") return 1;

      // Within same access level, sort by creation date (newest first for members, oldest first for guests)
      if (a.accessLevel === "member" && b.accessLevel === "member") {
        return new Date(b.workspace.createdAt).getTime() - new Date(a.workspace.createdAt).getTime();
      }

      if (a.accessLevel === "guest" && b.accessLevel === "guest") {
        return new Date(a.workspace.createdAt).getTime() - new Date(b.workspace.createdAt).getTime();
      }

      return 0;
    });

    const result = workspaces.map(({ workspace, accessLevel, isPendingGuest, guestId }) => {
      // Create workspace object with accessLevel for the contract
      const workspaceWithAccessLevel = {
        ...workspace,
        accessLevel: accessLevel as "member" | "guest",
      } as const;

      // Add guest-specific fields
      if (accessLevel === "guest" && isPendingGuest !== undefined) {
        return {
          ...workspaceWithAccessLevel,
          isPendingGuest,
          guestId,
        };
      }

      return workspaceWithAccessLevel;
    });

    return result as Array<{
      accessLevel: "member" | "guest";
      createdAt: Date;
      type: "PERSONAL" | "TEAM";
      id: string;
      updatedAt: Date;
      name: string;
      description: string | null;
      avatar: string | null;
      memberSubspaceCreate: boolean;
      settings: any;
      allowPublicSharing: boolean;
    }>;
  }

  /**
   * Get detailed workspace information including members and subspaces
   * Validates user access through workspace ability system
   */
  async getWorkspace(workspaceId: string, userId: string) {
    const workspace = await this.prismaService.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, displayName: true, imageUrl: true },
            },
          },
        },
        subspaces: {
          select: { id: true, name: true, type: true },
        },
        _count: {
          select: { docs: true, members: true },
        },
      },
    });

    if (!workspace) {
      throw new ApiException(ErrorCodeEnum.WorkspaceNotFoundOrNotInWorkspace);
    }

    // Validate user access through unified permission system
    const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
    if (!hasAccess) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    return workspace;
  }

  /**
   * Get all members of a workspace
   * Requires workspace access permission
   */
  async getWorkspaceMembers(workspaceId: string, userId: string) {
    // Validate user access through workspace ability system
    const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
    if (!hasAccess) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    const members = await this.prismaService.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, email: true, displayName: true, imageUrl: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return members;
  }

  /**
   * Update workspace information
   * Validates update permissions through workspace ability system
   */
  async updateWorkspace(id: string, dto: UpdateWorkspaceDto, userId: string) {
    // Validate user has update permissions through workspace ability
    const hasAccess = await this.hasWorkspaceAccess(userId, id);
    if (!hasAccess) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    // Validate settings if provided
    if (dto.settings) {
      this.validateWorkspaceSettings(dto.settings);
    }

    const workspace = await this.prismaService.workspace.update({
      where: { id },
      data: dto,
    });

    return workspace;
  }

  /**
   * Delete workspace and all associated data
   * Only workspace owners can delete, and only if they're the last member
   */
  async deleteWorkspace(id: string, userId: string) {
    // Verify user is workspace owner
    const member = await this.prismaService.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });

    if (!member || member.role !== WorkspaceRole.OWNER) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    // Ensure no other members exist before deletion
    const memberCount = await this.prismaService.workspaceMember.count({
      where: { workspaceId: id },
    });

    if (memberCount > 1) {
      throw new ApiException(ErrorCodeEnum.WorkspaceHasMembers);
    }

    // Check if workspace has any documents
    const documentCount = await this.prismaService.doc.count({
      where: { workspaceId: id },
    });

    if (documentCount > 0) {
      throw new ApiException(ErrorCodeEnum.WorkspaceHasDocuments);
    }

    // Delete workspace member records first to avoid foreign key constraint
    await this.prismaService.workspaceMember.deleteMany({
      where: { workspaceId: id },
    });

    // TODO:  Clean up all related permissions across workspace hierarchy

    await this.prismaService.workspace.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Add a new member to workspace with specified role
   * Automatically propagates permissions to all child resources
   */
  async addWorkspaceMember(workspaceId: string, userId: string, role: WorkspaceRole, adminId: string) {
    // Verify workspace exists
    const workspace = await this.prismaService.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new ApiException(ErrorCodeEnum.WorkspaceNotFoundOrNotInWorkspace);
    }

    // Verify user is not already a member
    const existingMember = await this.prismaService.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (existingMember) {
      throw new ApiException(ErrorCodeEnum.UserAlreadyInWorkspace);
    }

    // Verify target user exists
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    //  Create workspace membership
    const member = await this.prismaService.workspaceMember.create({
      data: { workspaceId, userId, role },
      include: {
        user: {
          select: { id: true, email: true, displayName: true, imageUrl: true },
        },
      },
    });

    // Invite user to all workspace-wide subspaces
    const workspaceWideSubspaces = await this.prismaService.subspace.findMany({
      where: { workspaceId, type: SubspaceType.WORKSPACE_WIDE },
    });

    // Add user to all workspace-wide subspaces efficiently
    if (workspaceWideSubspaces.length > 0) {
      // Create all subspace memberships in a single transaction
      const subspaceMemberships = workspaceWideSubspaces.map((subspace) => ({
        subspaceId: subspace.id,
        userId,
        role: SubspaceRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Use createMany for better performance
      await this.prismaService.subspaceMember.createMany({
        data: subspaceMemberships,
        skipDuplicates: true, // Skip if user is already a member
      });

      // Emit a single batch event for all workspace-wide subspace memberships
      if (workspaceWideSubspaces.length > 0) {
        const addedUsers = [
          {
            userId,
            role: SubspaceRole.MEMBER,
            member: {
              id: `workspace-wide-${userId}`,
              userId,
              role: SubspaceRole.MEMBER,
              createdAt: new Date().toISOString(),
            },
          },
        ];

        await this.eventPublisher.publishWebsocketEvent({
          name: BusinessEvents.SUBSPACE_MEMBERS_BATCH_ADDED,
          workspaceId,
          actorId: adminId,
          data: {
            subspaceId: workspaceWideSubspaces[0].id, // Use first subspace ID for the event
            addedUsers,
            addedGroups: [],
            totalAdded: workspaceWideSubspaces.length,
            workspaceWideSubspaces: workspaceWideSubspaces.map((s) => s.id), // Include all affected subspaces
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    //  Propagate permissions to all child subspaces and documents
    // TODO:

    // --- Create personal subspace for the new member ---
    await this.subspaceService.createPersonalSubspace(userId, workspaceId);

    return member;
  }

  /**
   * Batch add multiple members to workspace
   * Processes each member individually and collects results
   */
  async batchAddWorkspaceMembers(workspaceId: string, dto: BatchAddWorkspaceMemberRequest, adminId: string): Promise<BatchAddWorkspaceMemberResponse> {
    // Verify workspace exists
    const workspace = await this.prismaService.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new ApiException(ErrorCodeEnum.WorkspaceNotFoundOrNotInWorkspace);
    }

    // Initialize result counters
    const results: BatchAddWorkspaceMemberResponse = {
      success: true,
      addedCount: 0,
      skippedCount: 0,
      errors: [],
      skipped: [],
    };

    // Track successfully added members for batch WebSocket notification
    const addedMembers: Array<{ userId: string; member: any }> = [];

    // Process each item in the batch
    for (const item of dto.items) {
      try {
        // Check if user is already a workspace member
        const existingMember = await this.prismaService.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId, userId: item.userId } },
        });

        if (existingMember) {
          results.skippedCount++;
          results.skipped.push({
            userId: item.userId,
            reason: "User is already a member of this workspace",
          });
          continue;
        }

        // Verify target user exists
        const user = await this.prismaService.user.findUnique({
          where: { id: item.userId },
        });

        if (!user) {
          results.errors.push({
            userId: item.userId,
            error: "User not found",
          });
          continue;
        }

        // Add the member using existing logic
        const member = await this.addWorkspaceMember(workspaceId, item.userId, item.role, adminId);

        results.addedCount++;
        addedMembers.push({
          userId: item.userId,
          member: {
            id: member.id,
            userId: member.userId,
            role: member.role,
            createdAt: member.createdAt.toISOString(),
            user: member.user,
          },
        });
      } catch (error) {
        results.errors.push({
          userId: item.userId,
          error: (error as Error).message || "Unknown error",
        });
      }
    }

    // Send single batch WebSocket notification instead of individual ones
    if (addedMembers.length > 0) {
      console.log(`[DEBUG] Publishing WORKSPACE_MEMBERS_BATCH_ADDED event for workspace ${workspaceId}, added ${results.addedCount} members`);

      // Use queue system for WebSocket events
      await this.eventPublisher.publishWebsocketEvent({
        name: BusinessEvents.WORKSPACE_MEMBERS_BATCH_ADDED,
        workspaceId,
        actorId: adminId,
        data: {
          addedMembers,
          totalAdded: results.addedCount,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Set overall success based on whether any members were added
    results.success = results.addedCount > 0;

    return results;
  }

  /**
   * Remove a user from workspace with common cleanup logic
   * @param workspaceId - The workspace ID
   * @param userId - The user ID to remove
   * @param checkLastOwner - Whether to check if this is the last owner (for leave operations)
   */
  private async removeUserFromWorkspace(workspaceId: string, userId: string, checkLastOwner = false) {
    // Verify workspace exists
    const workspace = await this.prismaService.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new ApiException(ErrorCodeEnum.WorkspaceNotFoundOrNotInWorkspace);
    }

    // Verify member exists
    const member = await this.prismaService.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!member) {
      throw new ApiException(ErrorCodeEnum.UserNotInWorkspace);
    }

    // Prevent removal/leaving as the last owner
    if (checkLastOwner && member.role === WorkspaceRole.OWNER) {
      const ownerCount = await this.prismaService.workspaceMember.count({
        where: { workspaceId, role: WorkspaceRole.OWNER },
      });

      if (ownerCount <= 1) {
        throw new ApiException(ErrorCodeEnum.CannotLeaveAsLastOwner);
      }
    } else if (member.role === WorkspaceRole.OWNER) {
      const ownerCount = await this.prismaService.workspaceMember.count({
        where: { workspaceId, role: WorkspaceRole.OWNER },
      });

      if (ownerCount <= 1) {
        throw new ApiException(ErrorCodeEnum.CannotRemoveLastOwner);
      }
    }

    // 1. Remove membership
    await this.prismaService.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    // 2. Publish workspace member left event
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.WORKSPACE_MEMBER_LEFT,
      workspaceId,
      actorId: checkLastOwner ? userId : undefined, // If leaving, user removed themselves
      data: {
        userId,
        workspaceName: workspace.name,
        userRole: member.role,
        removedBy: checkLastOwner ? userId : undefined, // If leaving, user removed themselves
      },
      timestamp: new Date().toISOString(),
    });

    // 3. Remove the user's personal subspaces in this workspace
    await this.subspaceService.removePersonalSubspacesForUser(userId, workspaceId);

    // 4. TODO: Clean up all related permissions across workspace hierarchy
    // This could include:
    // - Document permissions
    // - Subspace permissions
    // - Shared document access
    // - Collaboration cursors/sessions
    // - WebSocket room cleanup

    // For now, we'll add a placeholder for future permission cleanup
    await this.cleanupUserPermissionsInWorkspace(userId, workspaceId);
  }

  /**
   * Clean up all user permissions in a workspace
   * This is a placeholder for future implementation of comprehensive permission cleanup
   */
  private async cleanupUserPermissionsInWorkspace(userId: string, workspaceId: string) {
    // TODO: Implement comprehensive permission cleanup:
    // 1. Remove document-specific permissions
    // 2. Remove subspace-specific permissions
    // 3. Clean up shared document access
    // 4. Remove collaboration sessions/cursors
    // 5. Clean up WebSocket room memberships
    // 6. Remove any cached permissions

    // For now, this is a placeholder that can be expanded
    console.log(`Cleaning up permissions for user ${userId} in workspace ${workspaceId}`);
  }

  /**
   * Send WebSocket notification when a user leaves a workspace
   */
  private async sendWorkspaceMemberLeftNotification(workspaceId: string, userId: string, workspaceName: string, userRole: string) {
    try {
      // TODO: Implement WebSocket notification system
      // This should notify other workspace members that a user has left
      // Example:
      // await this.websocketService.sendToWorkspace(workspaceId, {
      //   type: 'member_left',
      //   data: {
      //     userId,
      //     workspaceId,
      //     workspaceName,
      //     userRole,
      //     timestamp: new Date(),
      //   }
      // });

      console.log(`User ${userId} left workspace ${workspaceName} (${workspaceId})`);
    } catch (error) {
      console.error("Failed to send workspace member left notification:", error);
      // Don't throw here as this is not critical functionality
    }
  }

  /**
   * Remove a member from workspace
   * Cleans up all associated permissions across the workspace hierarchy
   */
  async removeWorkspaceMember(workspaceId: string, userId: string) {
    await this.removeUserFromWorkspace(workspaceId, userId, false);
    return { success: true };
  }

  /**
   * Leave workspace - allows a user to remove themselves from a workspace
   */
  async leaveWorkspace(workspaceId: string, userId: string) {
    // Get workspace and member info before removal for notifications
    const workspace = await this.prismaService.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new ApiException(ErrorCodeEnum.WorkspaceNotFoundOrNotInWorkspace);
    }

    // Verify user is a member of the workspace
    const member = await this.prismaService.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!member) {
      throw new ApiException(ErrorCodeEnum.UserNotInWorkspace);
    }

    // Use the shared removal logic
    await this.removeUserFromWorkspace(workspaceId, userId, true);

    // Handle workspace switching for the leaving user
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { currentWorkspaceId: true },
    });

    if (user?.currentWorkspaceId === workspaceId) {
      // Find another workspace to switch to by getting all workspaces for the user
      const userWorkspaces = await this.prismaService.workspaceMember.findMany({
        where: { userId },
        include: { workspace: { select: { id: true } } },
      });

      const otherWorkspace = userWorkspaces.find((wm) => wm.workspace.id !== workspaceId);
      if (otherWorkspace) {
        await this.switchWorkspace(userId, otherWorkspace.workspace.id);
      } else {
        // No other workspaces
        await this.prismaService.user.update({
          where: { id: userId },
          data: { currentWorkspaceId: null },
        });
      }
    }

    // Send WebSocket notification about user leaving
    await this.sendWorkspaceMemberLeftNotification(workspaceId, userId, workspace.name, member.role);

    return { success: true };
  }

  /**
   * Check if user has access to workspace
   * Used for basic access validation
   */
  async hasWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
    // First check if workspace exists
    const workspace = await this.prismaService.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return false;
    }

    // First check if user is a member
    const workspaceMember = await this.prismaService.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (workspaceMember) {
      return true;
    }

    // If not a member, check if user is a guest collaborator
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      return false;
    }

    // Check for guest collaborator with matching email
    const guestCollaborator = await this.prismaService.guestCollaborator.findFirst({
      where: {
        workspaceId,
        email: user.email,
        expireAt: {
          gt: new Date(), // Only active guest collaborators
        },
      },
    });

    return !!guestCollaborator;
  }

  /**
   * Reorder user's workspaces using fractional indexing
   * Maintains stable ordering without conflicts
   */
  async reorderWorkspaces(workspaceIds: string[], userId: string) {
    // Verify all workspaces exist and user has access to them
    for (const workspaceId of workspaceIds) {
      const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
      if (!hasAccess) {
        throw new ApiException(ErrorCodeEnum.PermissionDenied);
      }
    }

    // Get current workspace members with their indices
    const workspaceMembers = await this.prismaService.workspaceMember.findMany({
      where: {
        userId,
        workspaceId: {
          in: workspaceIds,
        },
      },
      orderBy: { index: "asc" },
    });

    // Update indices using fractional indexing to prevent conflicts
    const updates: Promise<WorkspaceMember>[] = [];
    let lastIndex: string | null = null;

    for (const workspaceId of workspaceIds) {
      const member = workspaceMembers.find((m) => m.workspaceId === workspaceId);
      if (member) {
        const newIndex = fractionalIndex(lastIndex, null);
        updates.push(
          this.prismaService.workspaceMember.update({
            where: { id: member.id },
            data: { index: newIndex },
          }),
        );
        lastIndex = newIndex;
      }
    }

    // Apply all updates in parallel for performance
    await Promise.all(updates);

    return { success: true };
  }

  /**
   * Update workspace member role
   * Automatically updates unified permissions based on new role
   */
  async updateWorkspaceMemberRole(workspaceId: string, userId: string, newRole: WorkspaceRole, adminId: string) {
    // Verify workspace exists
    const workspace = await this.prismaService.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new ApiException(ErrorCodeEnum.WorkspaceNotFoundOrNotInWorkspace);
    }

    // Verify member exists
    const member = await this.prismaService.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!member) {
      throw new ApiException(ErrorCodeEnum.UserNotInWorkspace);
    }

    // Prevent downgrading last owner
    if (member.role === WorkspaceRole.OWNER && newRole !== WorkspaceRole.OWNER) {
      const ownerCount = await this.prismaService.workspaceMember.count({
        where: { workspaceId, role: WorkspaceRole.OWNER },
      });

      if (ownerCount <= 1) {
        throw new ApiException(ErrorCodeEnum.CannotRemoveLastOwner);
      }
    }

    const oldRole = member.role;

    // 1. Update member role
    const updatedMember = await this.prismaService.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role: newRole },
      include: {
        user: {
          select: { id: true, email: true, displayName: true, imageUrl: true },
        },
      },
    });

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { currentWorkspaceId: true },
    });

    const abilities = await this.abilityService.serializeAbilitiesForUser(
      {
        id: userId,
        currentWorkspaceId: user?.currentWorkspaceId ?? null,
      },
      ["Workspace" as ModelName],
    );

    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.WORKSPACE_MEMBER_ROLE_UPDATED,
      workspaceId,
      actorId: adminId,
      data: {
        workspaceId,
        userId,
        role: newRole,
        member: updatedMember,
        abilities,
      },
      timestamp: new Date().toISOString(),
    });

    return updatedMember;
  }

  async getPublicInviteLink(workspaceId: string, adminId: string) {
    const workspace = await this.prismaService.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new ApiException(ErrorCodeEnum.WorkspaceNotFoundOrNotInWorkspace);
    }

    let invite = await this.prismaService.workspacePublicInvite.findUnique({
      where: { workspaceId },
    });

    if (!invite || !this.isInviteActive(invite)) {
      invite = await this.upsertWorkspaceInvite(workspaceId, adminId);
    }

    return {
      workspaceId,
      token: invite.token,
      expiresAt: invite.expiresAt.toISOString(),
      url: this.buildPublicInviteUrl(invite.token),
    };
  }

  async resetPublicInviteLink(workspaceId: string, adminId: string) {
    const workspace = await this.prismaService.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new ApiException(ErrorCodeEnum.WorkspaceNotFoundOrNotInWorkspace);
    }

    const invite = await this.upsertWorkspaceInvite(workspaceId, adminId);

    return {
      workspaceId,
      token: invite.token,
      expiresAt: invite.expiresAt.toISOString(),
      url: this.buildPublicInviteUrl(invite.token),
    };
  }

  async getPublicInvitation(token: string, userId?: string) {
    const invite = await this.prismaService.workspacePublicInvite.findUnique({
      where: { token },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!invite) {
      return {
        status: "invalid" as const,
      };
    }

    if (!this.isInviteActive(invite)) {
      return {
        status: "expired" as const,
        workspaceId: invite.workspace.id,
        workspaceName: invite.workspace.name,
        workspaceAvatar: invite.workspace.avatar,
        expiresAt: invite.expiresAt.toISOString(),
      };
    }

    let alreadyMember = false;
    if (userId) {
      const member = await this.prismaService.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: invite.workspaceId,
            userId,
          },
        },
      });
      alreadyMember = Boolean(member);
    }

    return {
      status: "active" as const,
      workspaceId: invite.workspace.id,
      workspaceName: invite.workspace.name,
      workspaceAvatar: invite.workspace.avatar,
      expiresAt: invite.expiresAt.toISOString(),
      alreadyMember,
      token,
    };
  }

  async acceptPublicInvitation(token: string, userId: string) {
    const invite = await this.prismaService.workspacePublicInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new ApiException(ErrorCodeEnum.WorkspaceInvitationNotFound, HttpStatus.NOT_FOUND);
    }

    if (!this.isInviteActive(invite)) {
      throw new ApiException(ErrorCodeEnum.WorkspaceInvitationExpired, HttpStatus.BAD_REQUEST);
    }

    try {
      await this.addWorkspaceMember(invite.workspaceId, userId, WorkspaceRole.MEMBER, userId);
    } catch (error) {
      if (error instanceof ApiException && error.gerErrorCode() === ErrorCodeEnum.UserAlreadyInWorkspace) {
        return {
          workspaceId: invite.workspaceId,
          alreadyMember: true,
        };
      }
      throw error;
    }

    return {
      workspaceId: invite.workspaceId,
      alreadyMember: false,
    };
  }

  /**
   * Get workspace settings for a specific workspace
   * Useful for frontend to know current settings
   */
  async getWorkspaceSettings(workspaceId: string, userId: string) {
    // Validate user access
    const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
    if (!hasAccess) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    const workspace = await this.prismaService.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });

    if (!workspace) {
      throw new ApiException(ErrorCodeEnum.WorkspaceNotFoundOrNotInWorkspace);
    }

    return workspace.settings || this.getDefaultWorkspaceSettings();
  }

  /**
   * Get available workspace settings options
   * Useful for frontend dropdowns and validation
   */
  getWorkspaceSettingsOptions() {
    return {
      timezones: this.VALID_WORKSPACE_TIMEZONES.map((tz) => ({
        value: tz,
        label: this.getTimezoneLabel(tz),
      })),
      dateFormats: this.VALID_WORKSPACE_DATE_FORMATS.map((format) => ({
        value: format,
        label: this.getDateFormatExample(format),
        description: this.getDateFormatDescription(format),
      })),
    };
  }

  /**
   * Get human-readable timezone labels
   */
  private getTimezoneLabel(timezone: string): string {
    const labels: Record<string, string> = {
      UTC: "UTC (Coordinated Universal Time)",
      "America/New_York": "Eastern Time (US & Canada)",
      "America/Chicago": "Central Time (US & Canada)",
      "America/Denver": "Mountain Time (US & Canada)",
      "America/Los_Angeles": "Pacific Time (US & Canada)",
      "Europe/London": "London (GMT/BST)",
      "Europe/Paris": "Paris (CET/CEST)",
      "Europe/Berlin": "Berlin (CET/CEST)",
      "Asia/Tokyo": "Tokyo (JST)",
      "Asia/Shanghai": "Shanghai (CST)",
      "Asia/Kolkata": "India (IST)",
      "Australia/Sydney": "Sydney (AEST/AEDT)",
    };
    return labels[timezone] || timezone;
  }

  /**
   * Get date format examples
   */
  private getDateFormatExample(format: string): string {
    const examples: Record<string, string> = {
      "YYYY/MM/DD": "2025/01/15",
      "MM/DD/YYYY": "01/15/2025",
      "DD/MM/YYYY": "15/01/2025",
      "YYYY-MM-DD": "2025-01-15",
      "DD-MM-YYYY": "15-01-2025",
      "MM-DD-YYYY": "01-15-2025",
    };
    return examples[format] || format;
  }

  /**
   * Get date format descriptions
   */
  private getDateFormatDescription(format: string): string {
    const descriptions: Record<string, string> = {
      "YYYY/MM/DD": "Year/Month/Day",
      "MM/DD/YYYY": "Month/Day/Year (US)",
      "DD/MM/YYYY": "Day/Month/Year (EU)",
      "YYYY-MM-DD": "ISO format",
      "DD-MM-YYYY": "Day-Month-Year",
      "MM-DD-YYYY": "Month-Day-Year",
    };
    return descriptions[format] || format;
  }

  /**
   * Switch user's current workspace
   * Validates user has access to the workspace before switching
   */
  async switchWorkspace(userId: string, workspaceId: string) {
    // Verify user has access to the workspace
    const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
    if (!hasAccess) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    // Check if user is a guest collaborator and track first visit
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    let isFirstGuestVisit = false;

    if (user) {
      const guestCollaborator = await this.prismaService.guestCollaborator.findFirst({
        where: {
          workspaceId,
          OR: [{ userId }, { email: { equals: user.email, mode: "insensitive" } }],
          status: "ACTIVE",
        },
      });

      if (guestCollaborator) {
        // Track if this is the first visit (lastVisitedAt is null)
        isFirstGuestVisit = guestCollaborator.lastVisitedAt === null;

        // Update lastVisitedAt
        await this.prismaService.guestCollaborator.update({
          where: { id: guestCollaborator.id },
          data: { lastVisitedAt: new Date() },
        });
      }
    }

    // Update user's current workspace
    await this.prismaService.user.update({
      where: { id: userId },
      data: { currentWorkspaceId: workspaceId },
    });

    return {
      success: true,
      currentWorkspaceId: workspaceId,
      isFirstGuestVisit,
    };
  }

  /**
   * Get user's current workspace
   */
  async getCurrentWorkspace(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { currentWorkspaceId: true },
    });

    if (!user?.currentWorkspaceId) {
      return null;
    }

    return this.getWorkspace(user.currentWorkspaceId, userId);
  }
}
