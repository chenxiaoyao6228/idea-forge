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
      useFactory: (configService: ConfigService, cls: ClsService) => {
        const isProduction = configService.get("NODE_ENV") === "production";

        return {
          level: isProduction ? "info" : "debug",
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format((info) => {
              // Safely get traceId from CLS with fallback
              try {
                const id = cls.getId();
                info.traceId = id || "no-trace-id";
              } catch (error) {
                info.traceId = "cls-error";
              }
              return info;
            })(),
            winston.format.json(),
          ),
          transports: [
            // Error logs rotation - ALWAYS enabled (even in development)
            new winston.transports.DailyRotateFile({
              filename: `logs/app-error-%DATE%.log`,
              datePattern: "YYYY-MM-DD",
              zippedArchive: !isProduction, // Only zip in development to save space
              maxSize: "20m",
              maxFiles: isProduction ? "30d" : "7d", // Keep longer in production
              level: "error",
            }),
            // Combined logs rotation - ALWAYS enabled (even in development)
            new winston.transports.DailyRotateFile({
              filename: `logs/app-%DATE%.log`,
              datePattern: "YYYY-MM-DD",
              zippedArchive: !isProduction,
              maxSize: "20m",
              maxFiles: isProduction ? "14d" : "3d", // Shorter retention in dev
            }),
            // Debug logs (development only) - for verbose debugging
            ...(!isProduction
              ? [
                  new winston.transports.DailyRotateFile({
                    filename: `logs/app-debug-%DATE%.log`,
                    datePattern: "YYYY-MM-DD",
                    zippedArchive: false,
                    maxSize: "50m",
                    maxFiles: "1d", // Only keep today's debug logs
                    level: "debug",
                  }),
                ]
              : []),
            // Console transport for development
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.colorize(),
                winston.format.printf(({ level, message, timestamp, traceId, ...meta }) => {
                  const color = levelsColors[level.toLowerCase()] || "white";
                  const trace = traceId || "no-trace";
                  return chalk[color](
                    `[IdeaForge] ${timestamp} ${level.toUpperCase()} [${trace}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`,
                  );
                }),
              ),
            }),
          ],
        };
      },
    }),
    MailModule,
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
