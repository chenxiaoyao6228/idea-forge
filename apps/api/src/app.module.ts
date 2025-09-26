import { join } from "node:path";
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
import { FallbackMiddleware } from "./_shared/middlewares/fallback.middleware";
import { ConfigsModule } from "./_shared/config/config.module";
import { FileStoreModule } from "./file-store/file-store.module";
import { CollaborationModule } from "./collaboration/collaboration.module";
import { AIModule } from "./ai/ai.module";
import { HttpModule } from "@nestjs/axios";
import { AppService } from "./app.service";
import { I18nNextModule } from "./_shared/i18next/i18n.module";
import { HttpExceptionFilter } from "./_shared/filters/http-exception.filter";
import { AllExceptionsFilter } from "./_shared/filters/all-exception.filter";
import { WorkspaceModule } from "./workspace/workspace.module";
import { SubspaceModule } from "./subspace/subspace.module";
import { CaslModule } from "./_shared/casl/casl.module";
import { SocketModule } from "./_shared/socket/socket.module";
import { QueueModule } from "./_shared/queues/queue.module";
import { EventsModule } from "./_shared/events/events.module";
import { StarModule } from "./star/star.module";
import { DocShareModule } from "./doc-share/doc-share.module";
import { GroupModule } from "./group/group.module";
import { PermissionModule } from "./permission/permission.module";
import { GuestCollaboratorsModule } from "./guest-collaborators/guest-collaborators.module";
import { UserIpInterceptor } from "./_shared/interceptors/user-ip.interceptor";
import { ClsModule } from "@/_shared/utils/cls.module";
import { HealthModule } from "./health/health.module";

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
    ClsModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    MailModule,
    DocumentModule,
    FileStoreModule,
    CollaborationModule,
    AIModule,
    WorkspaceModule,
    I18nNextModule,
    SubspaceModule,
    CaslModule,
    SocketModule,
    QueueModule,
    EventsModule,
    StarModule,
    DocShareModule,
    GroupModule,
    PermissionModule,
    GuestCollaboratorsModule,
    HealthModule,
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
      provide: APP_INTERCEPTOR,
      useClass: UserIpInterceptor,
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
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(FallbackMiddleware).forRoutes({
      path: "**",
      method: RequestMethod.GET,
    });
    consumer.apply(RequestLoggerMiddleware).forRoutes("*");
  }
}
