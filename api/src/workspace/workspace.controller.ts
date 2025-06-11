import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { WorkspaceService } from "./workspace.service";
import { User, WorkspaceDetailResponse, WorkspaceListResponse } from "contracts";
import { CreateWorkspaceDto, UpdateWorkspaceDto } from "./workspace.dto";
import { WorkspaceRole } from "@prisma/client";
import { Action } from "@/_shared/casl/ability.class";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { PolicyGuard } from "@/_shared/casl/policy.guard";
import { CheckPolicy } from "@/_shared/casl/policy.decorator";

@UseGuards(PolicyGuard)
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

  @Post(":id/members")
  @CheckPolicy(Action.ManageMembers, "Workspace")
  async addWorkspaceMember(@Param("id") workspaceId: string, @Body() dto: { userId: string; role: WorkspaceRole }, @GetUser("id") adminId: string) {
    return this.workspaceService.addWorkspaceMember(workspaceId, dto.userId, dto.role, adminId);
  }

  @Delete(":id/members/:userId")
  @CheckPolicy(Action.ManageMembers, "Workspace")
  async removeWorkspaceMember(@Param("id") workspaceId: string, @Param("userId") userId: string, @GetUser("id") adminId: string) {
    return this.workspaceService.removeWorkspaceMember(workspaceId, userId, adminId);
  }

  @Patch(":id")
  @CheckPolicy(Action.Update, "Workspace")
  async updateWorkspace(@Param("id") id: string, @Body() dto: UpdateWorkspaceDto, @GetUser("id") userId: string) {
    return this.workspaceService.updateWorkspace(id, dto, userId);
  }

  @Delete(":id")
  @CheckPolicy(Action.Delete, "Workspace")
  async deleteWorkspace(@Param("id") id: string, @GetUser("id") userId: string) {
    return this.workspaceService.deleteWorkspace(id, userId);
  }

  @Get(":id")
  @CheckPolicy(Action.Read, "Workspace")
  async getWorkspace(@Param("id") id: string, @GetUser("id") userId: string) {
    return this.workspaceService.getWorkspace(id, userId);
  }

  @Get(":id/members")
  @CheckPolicy(Action.ViewMembers, "Workspace")
  async getWorkspaceMembers(@Param("id") workspaceId: string, @GetUser("id") userId: string) {
    return this.workspaceService.getWorkspaceMembers(workspaceId, userId);
  }
}
