import { Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { WorkspaceService } from "./workspace.service";
import { Public } from "@/auth/decorators/public.decorator";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { GetUser } from "@/auth/decorators/get-user.decorator";

@Controller("api/public-invitations")
export class PublicInvitationController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Public()
  @Get(":token")
  async getInvitation(@Param("token") token: string, @Req() req: Request) {
    const userId = (req as any).user?.id;
    return this.workspaceService.getPublicInvitation(token, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":token/accept")
  async acceptInvitation(@Param("token") token: string, @GetUser("id") userId: string) {
    return this.workspaceService.acceptPublicInvitation(token, userId);
  }
}
