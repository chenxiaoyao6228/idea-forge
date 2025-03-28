import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from "@nestjs/common";
import { SentryModule } from "@sentry/nestjs/setup";
import { AppController } from "./app.controller";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";
import { RedisModule } from "@/_shared/database/redis/redis.module";
import { AuthModule } from "./auth/auth.module";
import { LoggerModule } from "@/_shared/utils/logger.module";
import { UserModule } from "./user/user.module";
import { RequestLoggerMiddleware } from "@/_shared/middlewares/request-logger.middleware";
import { APP_INTERCEPTOR, APP_PIPE, APP_FILTER } from "@nestjs/core";
import { MailModule } from "@/_shared/email/mail.module";
import { ApiInterceptor } from "./_shared/interceptors/api.interceptor";
import { ZodValidationPipe } from "./_shared/pipes/zod-validation.pipe";
import { DocumentModule } from "./document/document.module";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "node:path";
import { FallbackMiddleware } from "./_shared/middlewares/fallback.middleware";
import { ConfigsModule } from "./_shared/config/config.module";
import { FileStoreModule } from "./file-store/file-store.module";
import { CollaborationModule } from "./collaboration/collaboration.module";
import { AIModule } from "./ai/ai.module";
import { HttpModule } from "@nestjs/axios";
import { AppService } from "./app.service";
import { I18nNextModule } from "./_shared/i18next/i18n.module";
import { I18nNextMiddleware } from "./_shared/i18next/i18n.middleware";
import { HttpExceptionFilter } from "./_shared/filters/http-exception.filter";
import { AllExceptionsFilter } from "./_shared/filters/all-exception.filter";
import { SystemDocumentService } from "./document/system-document.service";

@Module({
  controllers: [AppController],
  imports: [
    SentryModule.forRoot(),
    // serve public static files
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "public"),
      serveRoot: "/",
      serveStaticOptions: {
        maxAge: 0, // no cache
        // Set to false to disable using index.html as the default page for directories
        // This allows our FallbackMiddleware to handle all page routes
        index: false,
      },
    }),

    // serve client static files
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "view"),
      serveRoot: "/",
      serveStaticOptions: {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        index: false,
      },
    }),

    HttpModule.register({
      timeout: 5000,
    }),
    LoggerModule,
    ConfigsModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    MailModule,
    DocumentModule,
    FileStoreModule,
    CollaborationModule,
    AIModule,
    I18nNextModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    AppService,
    SystemDocumentService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(I18nNextMiddleware).forRoutes("*");
    consumer.apply(FallbackMiddleware).forRoutes({
      path: "**",
      method: RequestMethod.GET,
    });
    consumer.apply(RequestLoggerMiddleware).forRoutes("*");
  }
}
