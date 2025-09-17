import { Injectable, BadRequestException } from "@nestjs/common";
import { CreateWorkspaceDto, UpdateWorkspaceDto } from "./workspace.dto";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { SubspaceService } from "@/subspace/subspace.service";
import { presentWorkspace } from "./workspace.presenter";
import fractionalIndex from "fractional-index";
import { PermissionService } from "@/permission/permission.service";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { ResourceType, WorkspaceRole, WorkspaceMember, SubspaceType, SubspaceRole, WorkspaceType } from "@idea/contracts";

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
    private readonly permissionService: PermissionService,
  ) {}

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
   * Initialize a new workspace with appropriate subspaces based on type
   * Creates workspace and sets up initial structure
   */
  async initializeWorkspace(dto: CreateWorkspaceDto, userId: string) {
    const workspace = await this.createWorkspace(dto, userId);
    // The createWorkspace method already handles subspace creation based on type
    // No need for additional subspace creation here
    return { workspace };
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

    // Assign workspace permissions to creator with full ownership
    const permission = await this.permissionService.assignWorkspacePermissions(userId, workspace.id, WorkspaceRole.OWNER, userId);

    // Create subspaces based on workspace type
    if (dto.type === WorkspaceType.TEAM) {
      // For team workspaces, create a default public subspace
      await this.subspaceService.createDefaultWorkspaceWideSubspace(userId, workspace.id);
    }

    // Always create personal subspace for the owner
    await this.subspaceService.createPersonalSubspace(userId, workspace.id);

    return presentWorkspace(workspace);
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
  async getUserWorkspaces(currentUserId: string) {
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

    // Return empty array if user has no workspaces - no auto-creation
    if (user.workspaceMembers.length === 0) {
      return [];
    }

    const workspaces = user.workspaceMembers.map((member) => member.workspace);
    return workspaces.map(presentWorkspace);
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

    return presentWorkspace(workspace);
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
   * Get all subspace IDs within a workspace
   * Used for permission cleanup operations
   */
  private async getWorkspaceSubspaceIds(workspaceId: string): Promise<string[]> {
    const subspaces = await this.prismaService.subspace.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    return subspaces.map((s) => s.id);
  }

  /**
   * Get all document IDs within a workspace
   * Used for permission cleanup operations
   */
  private async getWorkspaceDocumentIds(workspaceId: string): Promise<string[]> {
    const docs = await this.prismaService.doc.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    return docs.map((d) => d.id);
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

    return presentWorkspace(workspace);
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

    // Clean up all related permissions across workspace hierarchy
    await this.prismaService.unifiedPermission.deleteMany({
      where: {
        OR: [
          { resourceType: ResourceType.WORKSPACE, resourceId: id },
          { resourceType: ResourceType.SUBSPACE, resourceId: { in: await this.getWorkspaceSubspaceIds(id) } },
          { resourceType: ResourceType.DOCUMENT, resourceId: { in: await this.getWorkspaceDocumentIds(id) } },
        ],
      },
    });

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

    //  Assign workspace permissions based on role
    await this.permissionService.assignWorkspacePermissions(userId, workspaceId, role, adminId);

    // Invite user to all workspace-wide subspaces
    const workspaceWideSubspaces = await this.prismaService.subspace.findMany({
      where: { workspaceId, type: SubspaceType.WORKSPACE_WIDE },
    });

    for (const subspace of workspaceWideSubspaces) {
      await this.subspaceService.addSubspaceMember(subspace.id, { userId, role: SubspaceRole.MEMBER }, adminId);
    }

    //  Propagate permissions to all child subspaces and documents
    // TODO:

    // --- Create personal subspace for the new member ---
    await this.subspaceService.createPersonalSubspace(userId, workspaceId);

    return member;
  }

  /**
   * Remove a member from workspace
   * Cleans up all associated permissions across the workspace hierarchy
   */
  async removeWorkspaceMember(workspaceId: string, userId: string, adminId: string) {
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

    // Prevent removal of last owner
    if (member.role === WorkspaceRole.OWNER) {
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

    // --- Remove the user's personal subspaces in this workspace ---
    await this.subspaceService.removePersonalSubspacesForUser(userId, workspaceId);

    // 2. Clean up all related permissions across workspace hierarchy
    await this.prismaService.unifiedPermission.deleteMany({
      where: {
        userId,
        OR: [
          { resourceType: ResourceType.WORKSPACE, resourceId: workspaceId },
          { resourceType: ResourceType.SUBSPACE, resourceId: { in: await this.getWorkspaceSubspaceIds(workspaceId) } },
          { resourceType: ResourceType.DOCUMENT, resourceId: { in: await this.getWorkspaceDocumentIds(workspaceId) } },
        ],
      },
    });

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

    // Then check if user is a member
    const workspaceMember = await this.prismaService.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    return !!workspaceMember;
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

    // 2. Update unified permissions based on new role
    const permission = await this.permissionService.assignWorkspacePermissions(userId, workspaceId, newRole, adminId);

    // 3. Propagate permission changes to all child resources
    // TODO:

    return updatedMember;
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

  // /**
  //  * Invite guest collaborator to specific document
  //  * Creates guest record and assigns document-level permissions
  //  */
  // async inviteGuestCollaborator(workspaceId: string, guestEmail: string, documentId: string, permission: string, inviterId: string) {
  //   // Verify workspace exists and inviter has permission
  //   const hasAccess = await this.hasWorkspaceAccess(inviterId, workspaceId);
  //   if (!hasAccess) {
  //     throw new ApiException(ErrorCodeEnum.PermissionDenied);
  //   }

  //   // Create or update guest collaborator
  //   const guest = await this.prismaService.guestCollaborator.upsert({
  //     where: {
  //       email_workspaceId: {
  //         email: guestEmail,
  //         workspaceId,
  //       },
  //     },
  //     update: {
  //       status: GuestStatus.PENDING,
  //       expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  //     },
  //     create: {
  //       email: guestEmail,
  //       workspaceId,
  //       invitedById: inviterId,
  //       status: GuestStatus.PENDING,
  //       expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  //     },
  //   });

  //   // Assign document permission to guest
  //   await this.prismaService.unifiedPermission.create({
  //     data: {
  //       guestId: guest.id,
  //       resourceType: ResourceType.DOCUMENT,
  //       resourceId: documentId,
  //       permission: permission as PermissionLevel,
  //       sourceType: SourceType.GUEST,
  //       priority: 7,
  //       createdById: inviterId,
  //     },
  //   });

  //   return guest;
  // }

  // /**
  //  * Get all guest collaborators in workspace
  //  * Returns guests with their accessible document count
  //  */
  // async getGuestCollaborators(workspaceId: string, userId: string) {
  //   // Verify user has access to workspace
  //   const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
  //   if (!hasAccess) {
  //     throw new ApiException(ErrorCodeEnum.PermissionDenied);
  //   }

  //   const guests = await this.prismaService.guestCollaborator.findMany({
  //     where: { workspaceId },
  //     include: {
  //       invitedBy: {
  //         select: { id: true, email: true, displayName: true },
  //       },
  //       unifiedPermissions: {
  //         select: { resourceId: true, permission: true },
  //       },
  //       _count: {
  //         select: { unifiedPermissions: true },
  //       },
  //     },
  //     orderBy: { createdAt: "desc" },
  //   });

  //   return guests;
  // }

  // /**
  //  * Remove guest collaborator from workspace
  //  * Cleans up all associated permissions
  //  */
  // async removeGuestCollaborator(workspaceId: string, guestId: string, adminId: string) {
  //   // Verify admin has access to workspace
  //   const hasAccess = await this.hasWorkspaceAccess(adminId, workspaceId);
  //   if (!hasAccess) {
  //     throw new ApiException(ErrorCodeEnum.PermissionDenied);
  //   }

  //   // Verify guest exists in this workspace
  //   const guest = await this.prismaService.guestCollaborator.findUnique({
  //     where: { id: guestId },
  //   });

  //   if (!guest || guest.workspaceId !== workspaceId) {
  //     throw new ApiException(ErrorCodeEnum.GuestNotFound);
  //   }

  //   // Remove all guest permissions
  //   await this.prismaService.unifiedPermission.deleteMany({
  //     where: { guestId },
  //   });

  //   // Remove guest collaborator record
  //   await this.prismaService.guestCollaborator.delete({
  //     where: { id: guestId },
  //   });

  //   return { success: true };
  // }

  // /**
  //  * Promote guest collaborator to workspace member
  //  * Migrates guest permissions to user permissions
  //  */
  // async promoteGuestToMember(workspaceId: string, guestId: string, role: WorkspaceRole, adminId: string) {
  //   // Verify admin has access to workspace
  //   const hasAccess = await this.hasWorkspaceAccess(adminId, workspaceId);
  //   if (!hasAccess) {
  //     throw new ApiException(ErrorCodeEnum.PermissionDenied);
  //   }

  //   // Get guest information
  //   const guest = await this.prismaService.guestCollaborator.findUnique({
  //     where: { id: guestId },
  //     include: {
  //       unifiedPermissions: true,
  //     },
  //   });

  //   if (!guest || guest.workspaceId !== workspaceId) {
  //     throw new ApiException(ErrorCodeEnum.GuestNotFound);
  //   }

  //   // Find or create user account for guest email
  //   let user = await this.prismaService.user.findUnique({
  //     where: { email: guest.email },
  //   });

  //   if (!user) {
  //     // Create user account if doesn't exist
  //     user = await this.prismaService.user.create({
  //       data: {
  //         email: guest.email,
  //         displayName: guest.name || guest.email,
  //       },
  //     });
  //   }

  //   // Add user as workspace member
  //   const member = await this.addWorkspaceMember(workspaceId, user.id, role, adminId);

  //   // Migrate guest permissions to user permissions
  //   for (const guestPermission of guest.unifiedPermissions) {
  //     await this.prismaService.unifiedPermission.create({
  //       data: {
  //         userId: user.id,
  //         resourceType: guestPermission.resourceType,
  //         resourceId: guestPermission.resourceId,
  //         permission: guestPermission.permission,
  //         sourceType: SourceType.DIRECT,
  //         priority: 1,
  //         createdById: adminId,
  //       },
  //     });
  //   }

  //   // Remove guest collaborator and their permissions
  //   await this.removeGuestCollaborator(workspaceId, guestId, adminId);

  //   return member;
  // }
}
