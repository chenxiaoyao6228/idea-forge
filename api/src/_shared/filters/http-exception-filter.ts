import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { Response } from "express";

import { ApiException } from "../model/api.exception";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const statusCode = exception.getStatus();

    const res = exception.getResponse() as { message: string[] };

    response.status(statusCode).json({
      statusCode: exception instanceof ApiException ? exception.gerErrorCode() : statusCode,
      message: res?.message?.join ? res?.message?.join(",") : exception.message,
      path: request.url,
    });
  }
}
