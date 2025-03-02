import { Controller, Get, Body, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { Public } from "./auth/decorators/public.decorator";
import { AppService } from "./app.service";
import { I18nNextService } from "./_shared/i18next/i18n.service";

@Controller("/api")
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly i18nextService: I18nNextService,
  ) {}

  @Public()
  @Get("health")
  async health() {
    return "ok";
  }

  @Public()
  @Get("/debug-sentry")
  getError() {
    throw new Error("My first Sentry error!");
  }

  @UseGuards(JwtAuthGuard)
  @Get("protected")
  async protected(@Req() req: any) {
    return "protected " + req.user.id;
  }

  @Public()
  @Get("/test-i18next")
  async getHello(): Promise<string> {
    console.log("test-i18next");
    return await this.i18nextService.testTranslate();
  }
}
