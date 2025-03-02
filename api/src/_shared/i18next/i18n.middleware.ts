import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { I18nNextService } from "./i18n.service";

@Injectable()
export class I18nNextMiddleware implements NestMiddleware {
  constructor(private readonly i18nService: I18nNextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // 从请求头或查询参数中获取语言设置
    const lang = req.headers["accept-language"] || req.query.lang || "en";
    this.i18nService.changeLanguage(lang as string);
    next();
  }
}
