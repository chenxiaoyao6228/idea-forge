import { Inject, Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { I18nNextService } from "./i18n.service";
import * as i18nextMiddleware from "i18next-http-middleware";
import { I18nContextManager } from "./i18n.context";
import { Logger } from "winston";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";

@Injectable()
export class I18nNextMiddleware implements NestMiddleware {
  constructor(
    private readonly i18nService: I18nNextService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    this.logger.debug(`[Start] Processing request ${req.path}`);

    return i18nextMiddleware.handle(this.i18nService.getI18n())(req, res, () => {
      // check if req.t is set
      if (!req.t) {
        this.logger.error("req.t not set by i18next middleware");
        throw new Error("Translation function not available");
      }

      this.logger.debug(`[i18next] Locale detected: ${req.language}`);

      const context = {
        t: req.t,
        locale: req.language || "en",
      };

      return I18nContextManager.run(context, () => {
        // check if context is set
        try {
          const t = I18nContextManager.getT();
          this.logger.debug("[Context] Successfully set up i18n context");
        } catch (error) {
          this.logger.error("Failed to set up i18n context", error);
          throw error;
        }

        next();
      });
    });
  }
}
