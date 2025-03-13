import { Controller, Get, Body, Post, Req, UseGuards, Res } from "@nestjs/common";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { Public } from "./auth/decorators/public.decorator";
import { AppService } from "./app.service";
import { I18nNextService } from "./_shared/i18next/i18n.service";
import { MailService } from "./_shared/email/mail.service";
import { ErrorCodeEnum } from "shared";
import { ApiException } from "./_shared/exeptions/api.exception";

@Controller("/api")
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly i18nextService: I18nNextService,
    private readonly mailService: MailService,
  ) {}

  @Public()
  @Get("health")
  async health() {
    return "ok";
  }

  // ============= test router below =============
  @Public()
  @Get("/test-sentry")
  getError() {
    throw new Error("My first Sentry error!");
  }

  @UseGuards(JwtAuthGuard)
  @Get("protected")
  async protected(@Req() req: any) {
    return "protected " + req.user.id;
  }

  @Public()
  @Get("/test-email")
  async testEmail(@Req() req: Request) {
    console.log("testEmail");
    return this.mailService.sendRegistrationEmail("test@test.com", "123456");
  }

  @Public()
  @Get("/test-i18next-success")
  async testI18nSuccess() {
    return {
      a: "a",
    };
  }

  @Public()
  @Get("/test-i18next-error")
  async testI18nError() {
    throw new ApiException(ErrorCodeEnum.UserNotFound);
  }
}
