// !! IMPORTANT !! Must be at the top of the file, otherwise the environment variables will not be loaded
import * as dotenv from "dotenv";
dotenv.config();

// Sentry
import "./_shared/utils/sentry";

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import type { NestExpressApplication } from "@nestjs/platform-express";
import * as session from "express-session";
import { mw as requestIpMw } from "request-ip";
import * as cookieParser from "cookie-parser";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { ConfigService } from "@nestjs/config";
import { AllExceptionsFilter } from "./_shared/filters/all-exception.filter";
import { HttpExceptionFilter } from "./_shared/filters/http-exception.filter";
import rateLimit from "express-rate-limit";
import { I18nNextService } from "./_shared/i18next/i18n.service";
declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      exposedHeaders: ["Content-Range", "X-Content-Range"],
      maxAge: 3600,
    },
    // logger: ["error", "warn", "log", "debug", "verbose"],
  });

  const configService = app.get(ConfigService);
  // Get Real IP address
  app.use(requestIpMw({ attributeName: "ip" }));
  // Rate limit
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
    }),
  );

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

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap();
