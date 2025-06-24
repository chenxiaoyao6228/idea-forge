import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Inject } from "@nestjs/common";
import { Logger } from "winston";
import * as requestIp from "request-ip";
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    const clientIp = requestIp.getClientIp(req);

    res.on("finish", () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        body: req.body,
        userAgent: req.headers["user-agent"],
        ip: clientIp,
        // Safely log auth-related info,
        accessToken: req.cookies?.accessToken,
        refreshToken: req.cookies?.refreshToken,
      };

      const message = `${req.method} ${req.url} ${res.statusCode} ${duration}  ms`;

      if (res.statusCode >= 400) {
        this.logger.error(message, { logData });
      } else {
        this.logger.info(message, { logData });
      }
    });

    next();
  }
}
