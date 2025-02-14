const chalk = require("chalk");
import { Global, Module } from "@nestjs/common";
import { WinstonModule } from "nest-winston";
import * as winston from "winston";
import "winston-daily-rotate-file";
import { MailModule } from "../email/mail.module";
import { ConfigModule, ConfigService } from "@nestjs/config";

const levelsColors = {
  error: "red",
  warn: "yellow",
  info: "green",
  debug: "blue",
  verbose: "cyan",
};

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        level: configService.get("NODE_ENV") === "production" ? "info" : "debug",
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        transports: [
          // Error logs rotation
          new winston.transports.DailyRotateFile({
            filename: `${process.cwd()}/logs/app-error-%DATE%.log`,
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: "14d",
            level: "error",
          }),
          // Combined logs rotation
          new winston.transports.DailyRotateFile({
            filename: `${process.cwd()}/logs/app-%DATE%.log`,
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: "14d",
          }),
          // Console transport for development
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.colorize(),
              winston.format.printf(({ level, message, timestamp, ...meta }) => {
                const color = levelsColors[level.toLowerCase()] || "white";
                return chalk[color](`[IdeaForge] ${timestamp} ${level.toUpperCase()}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`);
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
