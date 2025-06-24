const chalk = require("chalk");
import { Global, Module } from "@nestjs/common";
import { WinstonModule } from "nest-winston";
import * as winston from "winston";
import "winston-daily-rotate-file";
import { MailModule } from "../email/mail.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ClsService } from "nestjs-cls";

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
      inject: [ConfigService, ClsService],
      useFactory: (configService: ConfigService, cls: ClsService) => ({
        level: configService.get("NODE_ENV") === "production" ? "info" : "debug",
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format((info) => {
            info.traceId = cls.getId(); // Add trace ID from CLS
            return info;
          })(),
        ),
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
              winston.format.printf(({ level, message, timestamp, traceId, ...meta }) => {
                const color = levelsColors[level.toLowerCase()] || "white";
                return chalk[color](
                  `[IdeaForge] ${timestamp} ${level.toUpperCase()} [${traceId}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`,
                );
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
