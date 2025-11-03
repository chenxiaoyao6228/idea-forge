import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { WorkspaceService } from "./workspace.service";
import { WorkspaceListResponse, BatchAddWorkspaceMemberRequest } from "@idea/contracts";
import { CreateWorkspaceDto, UpdateWorkspaceDto } from "./workspace.dto";
import { Action } from "@/_shared/casl/ability.class";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { PolicyGuard } from "@/_shared/casl/policy.guard";
import { CheckPolicy } from "@/_shared/casl/policy.decorator";
import { WorkspaceRole } from "@idea/contracts";

@Controller("api/workspaces")
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  async createWorkspace(@Body() dto: CreateWorkspaceDto, @GetUser("id") userId: string) {
    return this.workspaceService.createWorkspace(dto, userId);
  }

  @Get()
  async getWorkspaces(@GetUser("id") userId: string): Promise<WorkspaceListResponse> {
    return this.workspaceService.getUserWorkspaces(userId);
  }

  @Post("reorder")
  async reorderWorkspaces(@Body() dto: { workspaceIds: string[] }, @GetUser("id") userId: string) {
    return this.workspaceService.reorderWorkspaces(dto.workspaceIds, userId);
  }

  // === Workspace Switching ===
  @Patch("switch")
  async switchWorkspace(@Body() dto: { workspaceId: string }, @GetUser("id") userId: string) {
    return this.workspaceService.switchWorkspace(userId, dto.workspaceId);
  }

  @Get("current")
  async getCurrentWorkspace(@GetUser("id") userId: string) {
    return this.workspaceService.getCurrentWorkspace(userId);
  }

  // =========id below here===========

  @Post(":id/members")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.ManageMembers, "Workspace")
  async inviteWorkspaceMember(@Param("id") workspaceId: string, @Body() dto: { userId: string; role: WorkspaceRole }, @GetUser("id") adminId: string) {
    return this.workspaceService.inviteWorkspaceMember(workspaceId, dto.userId, dto.role, adminId);
  }

  @Post(":id/members/batch")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.ManageMembers, "Workspace")
  async batchAddWorkspaceMembers(@Param("id") workspaceId: string, @Body() dto: BatchAddWorkspaceMemberRequest, @GetUser("id") adminId: string) {
    return this.workspaceService.batchAddWorkspaceMembers(workspaceId, dto, adminId);
  }

  @Get(":id/members")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.ViewMembers, "Workspace")
  async getWorkspaceMembers(@Param("id") workspaceId: string, @GetUser("id") userId: string) {
    return this.workspaceService.getWorkspaceMembers(workspaceId, userId);
  }

  @Delete(":id/members/:userId")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.ManageMembers, "Workspace")
  async removeWorkspaceMember(@Param("id") workspaceId: string, @Param("userId") userId: string, @GetUser("id") adminId: string) {
    return this.workspaceService.removeWorkspaceMember(workspaceId, userId, adminId);
  }

  @Get(":id/invite/public")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.ManageMembers, "Workspace")
  async getPublicInviteLink(@Param("id") workspaceId: string, @GetUser("id") adminId: string) {
    return this.workspaceService.getPublicInviteLink(workspaceId, adminId);
  }

  @Post(":id/invite/public/reset")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.ManageMembers, "Workspace")
  async resetPublicInviteLink(@Param("id") workspaceId: string, @GetUser("id") adminId: string) {
    return this.workspaceService.resetPublicInviteLink(workspaceId, adminId);
  }

  @Patch(":id/members/:userId/role")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.ManageMembers, "Workspace")
  async updateWorkspaceMemberRole(
    @Param("id") workspaceId: string,
    @Param("userId") userId: string,
    @Body() dto: { role: WorkspaceRole },
    @GetUser("id") adminId: string,
  ) {
    return this.workspaceService.updateWorkspaceMemberRole(workspaceId, userId, dto.role, adminId);
  }

  @Patch(":id")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.Update, "Workspace")
  async updateWorkspace(@Param("id") id: string, @Body() dto: UpdateWorkspaceDto, @GetUser("id") userId: string) {
    return this.workspaceService.updateWorkspace(id, dto, userId);
  }

  @Delete(":id/leave")
  async leaveWorkspace(@Param("id") workspaceId: string, @GetUser("id") userId: string) {
    return this.workspaceService.leaveWorkspace(workspaceId, userId);
  }

  @Delete(":id")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.Delete, "Workspace")
  async deleteWorkspace(@Param("id") id: string, @GetUser("id") userId: string) {
    return this.workspaceService.deleteWorkspace(id, userId);
  }

  @Get(":id")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.Read, "Workspace")
  async getWorkspace(@Param("id") id: string, @GetUser("id") userId: string) {
    return this.workspaceService.getWorkspace(id, userId);
  }

  @Get(":id/settings")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.Read, "Workspace")
  async getWorkspaceSettings(@Param("id") id: string, @GetUser("id") userId: string) {
    return this.workspaceService.getWorkspaceSettings(id, userId);
  }

  @Get("settings/options")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.Read, "Workspace")
  async getWorkspaceSettingsOptions() {
    return this.workspaceService.getWorkspaceSettingsOptions();
  }

  // === Guest Collaborators ===
  // FIXME: add all the guest features and test
  @Post(":id/guests")
  // @CheckPolicy(Action.ManageMembers, "Workspace")
  async inviteGuestCollaborator(
    @Param("id") workspaceId: string,
    @Body() dto: { email: string; documentId: string; permission: string },
    @GetUser("id") inviterId: string,
  ) {
    // return this.workspaceService.inviteGuestCollaborator(workspaceId, dto.email, dto.documentId, dto.permission, inviterId);
  }

  @Get(":id/guests")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.ViewMembers, "Workspace")
  async getGuestCollaborators(@Param("id") workspaceId: string, @GetUser("id") userId: string) {
    // return this.workspaceService.getGuestCollaborators(workspaceId, userId);
  }

  @Delete(":id/guests/:guestId")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.ManageMembers, "Workspace")
  async removeGuestCollaborator(@Param("id") workspaceId: string, @Param("guestId") guestId: string, @GetUser("id") adminId: string) {
    // return this.workspaceService.removeGuestCollaborator(workspaceId, guestId, adminId);
  }

  @Post(":id/guests/:guestId/promote")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.ManageMembers, "Workspace")
  async promoteGuestToMember(
    @Param("id") workspaceId: string,
    @Param("guestId") guestId: string,
    @Body() dto: { role: WorkspaceRole },
    @GetUser("id") adminId: string,
  ) {
    // return this.workspaceService.promoteGuestToMember(workspaceId, guestId, dto.role, adminId);
  }
}
