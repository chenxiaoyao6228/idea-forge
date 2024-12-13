import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Inject, type Logger } from "@nestjs/common";

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    // TODO: better log format

    res.on("finish", () => {
      console.log(res.statusCode, req.url, req.method, req.body, req.headers.authorization, req.cookies?.accessToken, req.cookies?.refreshToken);
    });

    // const start = Date.now();

    // res.on("finish", () => {
    //   const duration = Date.now() - start;
    //   const logData = {
    //     method: req.method,
    //     url: req.url,
    //     status: res.statusCode,
    //     duration: `${duration}ms`,
    //     body: req.body,
    //     authorization: req.headers.authorization,
    //   };

    //   this.logger.log(`loginfo: ${req.method} ${req.url} ${res.statusCode} \n ${JSON.stringify(logData, null, 2)}`);
    // });

    next();
  }
}
