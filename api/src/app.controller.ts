import { Controller, Get, Body, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { Public } from "./auth/decorators/public.decorator";
import { AppService } from "./app.service";
import { I18n, I18nContext } from "nestjs-i18n";
import { I18nTranslations } from "./_generated/i18n.generated";

@Controller("/api")
export class AppController {
  constructor(private readonly appService: AppService) {}

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
  @Get("/test-i18n")
  // async testI18n() {
  //   return this.appService.getHello();
  // }
  async getHello(@I18n() i18n: I18nContext<I18nTranslations>): Promise<string> {
    return await i18n.t("translation.test", { args: { name: "Toon" } });
  }
}
