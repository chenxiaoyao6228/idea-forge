import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import type { NestExpressApplication } from "@nestjs/platform-express";
import * as session from "express-session";
import * as cookieParser from 'cookie-parser';
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    logger: ["error", "warn", "log", "debug", "verbose"], // Configure log levels
  });

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "123456",
      resave: false,
      saveUninitialized: false,
    }),
  );

  app.use(cookieParser());

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  console.log("------------------");
  console.log(process.env.NODE_ENV, process.env.DATABASE_URL);
  console.log("------------------");

  const port = process.env.NEST_API_PORT || 5001;

  await app.listen(port);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap();
