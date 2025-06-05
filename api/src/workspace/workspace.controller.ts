import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { WorkspaceService } from "./workspace.service";
import { WorkspaceDetailResponse, WorkspaceListResponse } from "contracts";
import { CreateWorkspaceDto, UpdateWorkspaceDto } from "./workspace.dto";

@Controller("api/workspaces")
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  async createWorkspace(@Body() dto: CreateWorkspaceDto, @Req() req: any) {
    return this.workspaceService.createWorkspace(dto, req.user.id);
  }

  @Get()
  async getWorkspaces(@Req() req: any): Promise<WorkspaceListResponse> {
    return this.workspaceService.getUserWorkspaces(req.user.id);
  }

  @Post("reorder")
  async reorderWorkspaces(@Body() dto: { workspaceIds: string[] }, @Req() req: any) {
    return this.workspaceService.reorderWorkspaces(dto.workspaceIds, req.user.id);
  }
}
