// Sentry
import "./_shared/utils/sentry";

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import type { NestExpressApplication } from "@nestjs/platform-express";
import session from "express-session";
import { mw as requestIpMw } from "request-ip";
import cookieParser from "cookie-parser";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { ConfigService } from "@nestjs/config";
import { AllExceptionsFilter } from "./_shared/filters/all-exception.filter";
import { HttpExceptionFilter } from "./_shared/filters/http-exception.filter";
import rateLimit from "express-rate-limit";
import { I18nNextService } from "./_shared/i18next/i18n.service";
import helmet from "helmet";
import { json, urlencoded } from "express";
import { Reflector } from "@nestjs/core";
import compression from "compression";

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(",") || [`http://localhost:${process.env.NEST_API_PORT}`],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      exposedHeaders: ["Content-Range", "X-Content-Range"],
      maxAge: 3600,
    },
    // logger: ["error", "warn", "log", "debug", "verbose"],
  });

  const configService = app.get(ConfigService);
  // Security headers with CSP configuration for development
  const isDev = configService.get("NODE_ENV") === "development";

  if (isDev) {
    // Development: Allow inline scripts and Vite dev server
    const wsPort = configService.get("NEST_API_WS_PORT");
    const apiPort = configService.get("NEST_API_PORT");

    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "http://localhost:5173", "http://localhost:3000"],
            styleSrc: ["'self'", "'unsafe-inline'", "http://localhost:5173"],
            imgSrc: ["'self'", "data:", "blob:", "http:", "https:"],
            connectSrc: [
              "'self'",
              "http://localhost:5173",
              "ws://localhost:5173",
              `http://localhost:${apiPort}`,
              `https://localhost:${apiPort}`,
              `ws://localhost:${wsPort}`,
              `http://localhost:${wsPort}`,
            ],
            fontSrc: ["'self'", "data:", "http:", "https:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
      }),
    );
  } else {
    // Production: Use strict CSP
    app.use(helmet());
  }

  app.use(compression());

  // Get Real IP address
  app.use(requestIpMw({ attributeName: "ip" }));

  // Rate limit
  // app.use(
  //   rateLimit({
  //     windowMs: 15 * 60 * 1000, // 15 minutes
  //     max: 1000, // limit each IP to 1000 requests per windowMs
  //   }),
  // );

  // Body parsing middleware with 50MB limits
  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ limit: "50mb", extended: true }));

  // Get reflector for interceptors
  const reflector = app.get(Reflector);

  // Filters
  const i18nService = app.get(I18nNextService);
  app.useGlobalFilters(new AllExceptionsFilter(i18nService), new HttpExceptionFilter(i18nService));

  app.use(
    session({
      secret: configService.get("SESSION_SECRET", "123456"),
      resave: false,
      saveUninitialized: false,
    }),
  );

  app.use(cookieParser());

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const port = configService.get("NEST_API_PORT", 5000);

  // Enable shutdown hooks only in production
  if (!isDev) {
    app.enableShutdownHooks();
  }

  // For pm2 cluster mode
  if (process.env.NODE_APP_INSTANCE) {
    if (process.env.NODE_APP_INSTANCE === "0") {
      await app.listen(port);
      console.log(`Application is running on: ${await app.getUrl()}`);
    }
  } else {
    await app.listen(port);
    console.log(`Application is running on: ${await app.getUrl()}`);
  }

  // Keep your existing signal handlers for development
  if (isDev) {
    process.on("SIGINT", async () => {
      console.log("Received SIGINT signal, shutting down application...");
      await app.close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("Received SIGTERM signal, shutting down application...");
      console.log("======= will take a few seconds for nestjs to restart ========");
      await app.close();
      process.exit(0);
    });
  }

  /*
   * FIXME: fix this if have time
   * NOTE: standalone vite config might working on stand nestjs project, but not working on monorepo project
   */
  // if (module.hot) {
  //   module.hot.accept(() => {
  //     console.log("Module updated, reloading...");
  //     app.close();
  //   });
  //   module.hot.dispose(() => app.close());
  // }
}

bootstrap();
