import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler } from "@nestjs/common";
import type { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { RESPONSE_SUCCESS_CODE, RESPONSE_SUCCESS_MSG } from "contracts";
import { I18nNextService } from "../i18next/i18n.service";
import { I18nContextManager } from "../i18next/i18n.context";

interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class ApiInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const t = I18nContextManager.getT();
    const tSuccess = t(RESPONSE_SUCCESS_MSG);
    return next.handle().pipe(
      map((data) => {
        return {
          statusCode: RESPONSE_SUCCESS_CODE,
          message: tSuccess,
          data,
        };
      }),
    );
  }
}
