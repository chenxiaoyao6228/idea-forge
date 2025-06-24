import { Module, Global, MiddlewareConsumer } from "@nestjs/common";
import { I18nNextService } from "./i18n.service";
import { I18nNextMiddleware } from "./i18n.middleware";

@Global()
@Module({
  providers: [I18nNextService],
  exports: [I18nNextService],
})
export class I18nNextModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(I18nNextMiddleware).forRoutes("*");
  }
}
