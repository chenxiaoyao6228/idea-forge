import { Controller, Get, Body, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { Public } from "./auth/decorators/public.decorator";

@Controller("/api")
export class AppController {
  @Public()
  @Get("health")
  async health() {
    return "ok";
  }

  @UseGuards(JwtAuthGuard)
  @Get("protected")
  async protected(@Req() req: any) {
    return "protected " + req.user.id;
  }
}
