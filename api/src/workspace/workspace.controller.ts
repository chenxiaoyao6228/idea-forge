import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { WorkspaceService } from "./workspace.service";
import { WorkspaceDetailResponse, WorkspaceListResponse } from "contracts";
import { CreateWorkspaceDto, UpdateWorkspaceDto, SwitchWorkspaceDto } from "./workspace.dto";

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

  @Post("/switch")
  async switchWorkspace(@Body() dto: SwitchWorkspaceDto, @Req() req: any) {
    return this.workspaceService.setCurrentWorkspace(req.user.id, dto.workspaceId);
  }
}
