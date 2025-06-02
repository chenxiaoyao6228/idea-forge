import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Query } from "@nestjs/common";
import { SubspaceService } from "./subspace.service";
import { SubspaceDetailResponse, SubspaceMemberListResponse } from "contracts";
import { CreateSubspaceDto, UpdateSubspaceDto, AddSubspaceMemberDto, UpdateSubspaceMemberDto, MoveSubspaceDto } from "./subspace.dto";

@Controller("api/subspaces")
export class SubspaceController {
  constructor(private readonly subspaceService: SubspaceService) {}

  @Post()
  async createSubspace(@Body() dto: CreateSubspaceDto, @Req() req: any) {
    return this.subspaceService.createSubspace(dto, req.user.id);
  }

  @Get("")
  async getSubspaces(@Req() req: any, @Query("workspaceId") workspaceId?: string) {
    return this.subspaceService.getUserSubWorkspaces(req.user.id, workspaceId);
  }

  @Get(":id")
  async getSubspace(@Param("id") id: string, @Req() req: any): Promise<SubspaceDetailResponse> {
    return this.subspaceService.getSubspace(id, req.user.id);
  }

  @Patch(":id")
  async updateSubspace(@Param("id") id: string, @Body() dto: UpdateSubspaceDto, @Req() req: any) {
    return this.subspaceService.updateSubspace(id, dto, req.user.id);
  }

  @Delete(":id")
  async deleteSubspace(@Param("id") id: string, @Req() req: any) {
    return this.subspaceService.deleteSubspace(id, req.user.id);
  }

  @Post(":id/move")
  async moveSubspace(@Param("id") id: string, @Body() dto: MoveSubspaceDto, @Req() req: any) {
    return this.subspaceService.moveSubspace(id, dto.index, req.user.id);
  }

  // ==== navigationTree ====

  @Get(":id/navigationTree")
  async getSubspaceNavigationTree(@Param("id") id: string, @Req() req: any) {
    return this.subspaceService.getSubspaceNavigationTree(id, req.user.id);
  }

  // ==== members

  @Post(":id/members")
  async addSubspaceMember(@Param("id") id: string, @Body() dto: AddSubspaceMemberDto, @Req() req: any) {
    return this.subspaceService.addSubspaceMember(id, dto, req.user.id);
  }

  @Patch(":id/members/:memberId")
  async updateSubspaceMember(@Param("id") id: string, @Param("memberId") memberId: string, @Body() dto: UpdateSubspaceMemberDto, @Req() req: any) {
    return this.subspaceService.updateSubspaceMember(id, memberId, dto, req.user.id);
  }

  @Delete(":id/members/:memberId")
  async removeSubspaceMember(@Param("id") id: string, @Param("memberId") memberId: string, @Req() req: any) {
    return this.subspaceService.removeSubspaceMember(id, memberId, req.user.id);
  }

  @Get(":id/members")
  async getSubspaceMembers(@Param("id") id: string, @Req() req: any): Promise<SubspaceMemberListResponse> {
    return this.subspaceService.getSubspaceMembers(id, req.user.id);
  }
}
