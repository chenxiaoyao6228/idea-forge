import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler } from "@nestjs/common";
import type { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { RESPONSE_SUCCESS_CODE, RESPONSE_SUCCESS_MSG } from "shared";

interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class ApiInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        return {
          statusCode: RESPONSE_SUCCESS_CODE,
          message: RESPONSE_SUCCESS_MSG,
          data,
        };
      }),
    );
  }
}
