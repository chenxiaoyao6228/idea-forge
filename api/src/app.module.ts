import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from "@nestjs/common";
import { AppController } from "./app.controller";
import { ConfigModule } from "@nestjs/config";
import { TRPCModule } from "nestjs-trpc";
import { DogsRouter } from "@/_shared/utils/trpc/dogs.router";
import { TrpcPanelController } from "@/_shared/utils/trpc/trpc-panel.controller";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";
import { RedisModule } from "@/_shared/database/redis/redis.module";
import { AuthModule } from "./auth/auth.module";
import { LoggerModule } from "@/_shared/utils/logger.module";
import { UserModule } from "./user/user.module";
import { RequestLoggerMiddleware } from "@/_shared/middlewares/request-logger.middleware";
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { MailModule } from "@/_shared/email/mail.module";
import { ApiInterceptor } from "./_shared/interceptors/api.interceptor";
import { HttpExceptionFilter } from "./_shared/filters/http-exception-filter";
import { ZodValidationPipe } from "./_shared/pipes/zod-validation.pipe";
import { DocumentModule } from "./document/document.module";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { FallbackMiddleware } from "./_shared/middlewares/fallback.middleware";
import { JwtService } from "@nestjs/jwt";
import { jwtConfig } from './auth/config/jwt.config';
import { AuthService } from "./auth/auth.service";
import { refreshJwtConfig } from "./auth/config/refresh.config";
import { MailService } from "./_shared/email/mail.service";
import { VerificationService } from "./auth/verification.service";

@Module({
  controllers: [AppController, TrpcPanelController],
  imports: [
     // serve public static files
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "public"),
      serveRoot: "/",
      serveStaticOptions: {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1年，单位为毫秒
        // 设置为 false 表示禁用默认的 index.html 文件作为目录的默认页面
        // 这样可以让我们的 FallbackMiddleware 来处理所有的页面路由
        index: false,
      },
    }),

    // serve client static files
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "view"),
      serveRoot: "/",
      serveStaticOptions: {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1年，单位为毫秒
        // 设置为 false 表示禁用默认的 index.html 文件作为目录的默认页面
        // 这样可以让我们的 FallbackMiddleware 来处理所有的页面路由
        index: false,
      },
    }),
    LoggerModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `${process.cwd()}/.env.${process.env.NODE_ENV || "development"}.local`,
        `${process.cwd()}/.env.${process.env.NODE_ENV || "development"}`,
        `${process.cwd()}/.env.local`,
        `${process.cwd()}/.env`,
      ],
      // Load env files from most specific to least specific
      expandVariables: true,
      // FIXME: 是下面的JWT配置依赖, 想办法移除
      load: [jwtConfig, refreshJwtConfig],
    }),
    TRPCModule.forRoot({
      autoSchemaFile: "./src/_shared/utils/trpc/@generated",
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    MailModule,
    DocumentModule,
  ],
  providers: [
    DogsRouter,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    { provide: APP_INTERCEPTOR, useClass: ApiInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // FIXME: 移除之后会有依赖报错
    JwtService,
     AuthService,
     MailService,
     VerificationService
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
      consumer
      .apply(FallbackMiddleware)
      .forRoutes({
        path: "**",
        method: RequestMethod.GET,
      });
    consumer.apply(RequestLoggerMiddleware).forRoutes("*");
  }
}
