import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { SubspaceService } from "./subspace.service";
import { SubspaceMemberListResponse } from "@idea/contracts";
import {
  CreateSubspaceDto,
  UpdateSubspaceDto,
  AddSubspaceMemberDto,
  UpdateSubspaceMemberDto,
  MoveSubspaceDto,
  BatchSetWorkspaceWideDto,
  BatchAddSubspaceMemberDto,
} from "./subspace.dto";
import { Action } from "@/_shared/casl/ability.class";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { CheckPolicy } from "@/_shared/casl/policy.decorator";
import { PolicyGuard } from "@/_shared/casl/policy.guard";

@UseGuards(PolicyGuard)
@Controller("api/subspaces")
export class SubspaceController {
  constructor(private readonly subspaceService: SubspaceService) {}

  @Post()
  async createSubspace(@Body() dto: CreateSubspaceDto, @GetUser("id") userId: string) {
    return this.subspaceService.createSubspace(dto, userId);
  }

  @Get("user/:workspaceId")
  async getUserJoinedSubspacesIncludingPersonal(@Param("workspaceId") workspaceId: string, @GetUser("id") userId: string) {
    return this.subspaceService.getUserJoinedSubspacesIncludingPersonal(userId, workspaceId);
  }

  @Get(":id")
  // @CheckPolicy(Action.Read, "Subspace")
  async getSubspace(@Param("id") id: string, @GetUser("id") userId: string) {
    return this.subspaceService.getSubspace(id, userId);
  }

  @Put(":id")
  @CheckPolicy(Action.Update, "Subspace")
  async updateSubspace(@Param("id") id: string, @Body() dto: UpdateSubspaceDto, @GetUser("id") userId: string) {
    return this.subspaceService.updateSubspace(id, dto, userId);
  }

  @Delete(":id")
  @CheckPolicy(Action.Delete, "Subspace")
  async deleteSubspace(@Param("id") id: string, @GetUser("id") userId: string) {
    return this.subspaceService.deleteSubspace(id, userId);
  }

  @Post(":id/move")
  @CheckPolicy(Action.Update, "Subspace")
  async moveSubspace(@Param("id") id: string, @Body() dto: MoveSubspaceDto, @GetUser("id") userId: string) {
    return this.subspaceService.moveSubspace(id, dto.index, userId);
  }

  @Post(":id/leave")
  async leaveSubspace(@Param("id") id: string, @GetUser("id") userId: string) {
    return this.subspaceService.leaveSubspace(id, userId);
  }

  @Get(":id/navigationTree")
  @CheckPolicy(Action.Read, "Subspace")
  async getSubspaceNavigationTree(@Param("id") id: string, @GetUser("id") userId: string) {
    return this.subspaceService.getSubspaceNavigationTree(id, userId);
  }

  // ==== members ====
  @Post(":id/members")
  @CheckPolicy(Action.ManageMembers, "Subspace")
  async addSubspaceMember(@Param("id") id: string, @Body() dto: AddSubspaceMemberDto, @GetUser("id") adminId: string) {
    return this.subspaceService.addSubspaceMember(id, dto, adminId);
  }

  @Post(":id/members/batch")
  // @CheckPolicy(Action.ManageMembers, "Subspace")
  async batchAddSubspaceMembers(@Param("id") id: string, @Body() dto: BatchAddSubspaceMemberDto, @GetUser("id") adminId: string) {
    return this.subspaceService.batchAddSubspaceMembers(id, dto, adminId);
  }

  @Patch(":id/members/:memberId")
  @CheckPolicy(Action.ManageMembers, "Subspace")
  async updateSubspaceMember(
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @Body() dto: UpdateSubspaceMemberDto,
    @GetUser("id") userId: string,
  ) {
    return this.subspaceService.updateSubspaceMember(id, memberId, dto, userId);
  }

  @Delete(":id/members/:memberId")
  @CheckPolicy(Action.ManageMembers, "Subspace")
  async removeSubspaceMember(@Param("id") id: string, @Param("memberId") memberId: string, @GetUser("id") userId: string) {
    return this.subspaceService.removeSubspaceMember(id, memberId, userId);
  }

  @Get(":id/members")
  @CheckPolicy(Action.ViewMembers, "Subspace")
  async getSubspaceMembers(@Param("id") id: string, @GetUser("id") userId: string): Promise<SubspaceMemberListResponse> {
    return this.subspaceService.getSubspaceMembers(id, userId);
  }

  // ==== settings ====
  // @Get(":id/settings")
  // @CheckPolicy(Action.Update, "Subspace")
  // async getSubspaceSettings(@Param("id") id: string, @GetUser("id") userId: string) {
  //   return this.subspaceService.getSubspaceSettings(id, userId);
  // }

  // @Put(":id/settings")
  // @CheckPolicy(Action.Update, "Subspace")
  // async updateSubspaceSettings(@Param("id") id: string, @Body() dto: UpdateSubspaceSettingsDto, @GetUser("id") userId: string) {
  //   return this.subspaceService.updateSubspaceSettings(id, dto, userId);
  // }

  // ==== batch operations ====
  @Post("batch-set-workspace-wide")
  async batchSetWorkspaceWide(@Body() dto: BatchSetWorkspaceWideDto, @GetUser("id") userId: string) {
    return this.subspaceService.batchSetWorkspaceWide(dto.subspaceIds, userId);
  }
}
