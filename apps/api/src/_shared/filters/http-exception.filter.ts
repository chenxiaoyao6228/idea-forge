import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { ApiException } from "../exceptions/api.exception";
import { I18nNextService } from "../i18next/i18n.service";
import { I18nContextManager } from "../i18next/i18n.context";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly i18nService: I18nNextService) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const statusCode = exception.getStatus();

    if (exception instanceof ApiException) {
      response.status(statusCode).json({
        code: exception.gerErrorCode(),
        message: exception.message,
        data: exception.getData(),
        path: request.url,
      });
    } else {
      const res = exception.getResponse() as { message: string[] };
      response.status(statusCode).json({
        code: statusCode,
        message: res?.message?.join ? res?.message?.join(",") : exception.message,
        path: request.url,
      });
    }
  }
}
