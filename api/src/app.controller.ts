import { Controller, Get, Body, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";

@Controller("/api")
export class AppController {
  @UseGuards(JwtAuthGuard)
  @Get("protected")
  async protected(@Req() req: any) {
    return "protected " + req.user.id;
  }
}
