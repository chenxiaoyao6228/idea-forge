import { Module } from "@nestjs/common";
import { WinstonModule } from "nest-winston";
import * as winston from "winston";
import { utilities } from "nest-winston";
import { MailModule } from "../email/mail.module";

@Module({
  imports: [
    WinstonModule.forRootAsync({
      useFactory: () => ({
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        transports: [
          new winston.transports.File({
            filename: `${process.cwd()}/logs/error.log`,
            level: "error",
            maxFiles: 30,
            maxsize: 5242880, // 5MB
          }),
          new winston.transports.File({
            filename: `${process.cwd()}/logs/combined.log`,
            maxFiles: 30,
            maxsize: 5242880,
          }),
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.colorize(),
              utilities.format.nestLike("IdeaForge", {
                prettyPrint: true,
              }),
            ),
          }),
        ],
      }),
    }),
    MailModule,
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
