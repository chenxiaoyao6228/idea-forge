import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import * as express from "express";

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  private rawBodyParser = express.raw({
    type: "*/*",
    limit: "10mb",
  });

  use(req: Request, res: Response, next: NextFunction) {
    this.rawBodyParser(req, res, next);
  }
}
