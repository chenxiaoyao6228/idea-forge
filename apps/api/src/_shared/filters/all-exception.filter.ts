import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import { SentryExceptionCaptured } from "@sentry/nestjs";
import { Response } from "express";
import { I18nNextService } from "../i18next/i18n.service";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly i18nService: I18nNextService) {}
  @SentryExceptionCaptured()
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    response.status(HttpStatus.SERVICE_UNAVAILABLE).send({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: exception.message,
      path: request.url,
    });
  }
}
