import { Module, Global } from "@nestjs/common";
// import { I18nMiddleware } from "./i18n.middleware";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { I18nNextService } from "./i18n.service";
import { I18nInterceptor } from "./i18n.interceptor";

@Global()
@Module({
  providers: [
    I18nNextService,
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: I18nInterceptor,
    // },
  ],
  exports: [I18nNextService],
})
export class I18nNextModule {}
